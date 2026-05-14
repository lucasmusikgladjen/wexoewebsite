/**
 * Route-factory för sidtypsspecifika CRUD-routes.
 *
 * Etapp 1 — Lager 1 (standard CRUD för primary record):
 *   - GET    ?action=list           → lista records
 *   - GET    ?action=get&id=recXXX  → ladda en record:s state (om loadState gives)
 *   - POST                          → create
 *   - PATCH  ?id=recXXX             → update
 *   - DELETE ?id=recXXX             → delete
 *
 * Standardiserar:
 *   - Slug-validering (regex, reserved, duplikat) — opt-in via config
 *   - Felformat (`{ success, error, code? }`)
 *   - Cache-invalidering efter mutation
 *
 * Lager 2 (declarative relations) och Lager 3 (full override) tillkommer
 * i Etapp 3 — strukturen är förberedd för att bära dem utan att bryta
 * dagens kontrakt.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  AirtableRecord,
  createRecord,
  updateRecord,
  deleteRecords,
  listRecords,
} from './airtable';
import { invalidateWexoeCoreCache } from './wexoe-cache';
import { isReservedSlug } from './core/reserved-slugs';

export interface PageRouteListResponse<TListItem> {
  success: true;
  pages: TListItem[];
}

export interface PageRouteErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export interface PageRouteConfig<TState, TListItem> {
  /** Vilken Airtable-tabell sidtypen lever i. */
  tableId: string;
  /** Vilken Airtable-bas. Default är SSOT-basen (BASE_ID i airtable.ts). */
  baseId?: string;
  /** API-nyckel — typiskt `process.env.AIRTABLE_API_KEY`. */
  apiKey: string | undefined;

  /** Vilka core-entiteter som ska cache-invalideras efter mutation. */
  cacheEntities?: readonly string[];
  /** Prefix för cache-context-loggning, t.ex. 'unique-page' → 'unique-page/create'. */
  cacheContext: string;

  /** Hämta full state för en record (för ?action=get). Om utelämnad
   *  returnerar GET 400 för action=get. */
  loadState?: (apiKey: string, recordId: string) => Promise<TState>;
  /** State → Airtable-fält (mode-aware för create-drops-empties etc). */
  stateToFields: (state: TState, mode: 'create' | 'update') => Record<string, unknown>;
  /** Fält som ska hämtas vid list (mappas sen via listMapper). */
  listFields?: readonly string[];
  /** Hur en Airtable-record presenteras i list-svaret. */
  listMapper: (record: AirtableRecord) => TListItem;
  /** Sort-instruktion till list. Default: ingen sortering. */
  listSort?: ReadonlyArray<{ field: string; direction: 'asc' | 'desc' }>;

  /** Hur slug:en plockas ur staten. Om utelämnad körs ingen slug-logik. */
  slugAccessor?: (state: TState) => string;
  /** Air­table-fältnamnet för slug — krävs om slugAccessor satt. Default 'Slug'. */
  slugField?: string;
  /** Validera slug-formatet. Default kollar `^[a-z0-9][a-z0-9-]*$`. */
  validateSlugFormat?: boolean;
  /** Kolla reservedSlugs-listan. */
  checkReservedSlug?: boolean;
  /** Kolla att slug:en är unik bland records i tabellen (create + update). */
  checkDuplicateSlug?: boolean;

  /** Valfri extra validering — returnera felmeddelande eller null. */
  validate?: (state: TState) => string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function badRequest(error: string, code?: string): NextResponse<PageRouteErrorResponse> {
  return NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status: 400 });
}
function conflict(error: string, code: string): NextResponse<PageRouteErrorResponse> {
  return NextResponse.json({ success: false, error, code }, { status: 409 });
}
function serverError(error: string): NextResponse<PageRouteErrorResponse> {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;

async function runSlugChecks<TState, TListItem>(
  cfg: PageRouteConfig<TState, TListItem>,
  apiKey: string,
  state: TState,
  excludeRecordId: string | null,
): Promise<NextResponse<PageRouteErrorResponse> | null> {
  if (!cfg.slugAccessor) return null;
  const slug = cfg.slugAccessor(state);
  if (!slug || !slug.trim()) return badRequest('Slug är obligatoriskt.');

  if (cfg.validateSlugFormat && !SLUG_REGEX.test(slug)) {
    return badRequest('Slug får bara innehålla lower-case bokstäver, siffror och bindestreck.');
  }
  if (cfg.checkReservedSlug && isReservedSlug(slug)) {
    return badRequest(`Slug "${slug}" är reserverad och kan inte användas.`);
  }
  if (cfg.checkDuplicateSlug) {
    const slugField = cfg.slugField ?? 'Slug';
    const existing = await listRecords(apiKey, cfg.tableId, {
      baseId: cfg.baseId,
      filterByFormula: `{${slugField}}="${slug.replace(/"/g, '\\"')}"`,
    });
    const collision = existing.find((r) => r.id !== excludeRecordId);
    if (collision) {
      return conflict(
        excludeRecordId
          ? 'En annan sida har redan den slug:en.'
          : 'En sida med den slug:en finns redan.',
        'duplicate_slug',
      );
    }
  }
  return null;
}

async function invalidateCache<TState, TListItem>(
  cfg: PageRouteConfig<TState, TListItem>,
  action: 'create' | 'update' | 'delete',
): Promise<void> {
  if (!cfg.cacheEntities || cfg.cacheEntities.length === 0) return;
  await invalidateWexoeCoreCache(cfg.cacheEntities, `${cfg.cacheContext}/${action}`);
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createPageRoute<TState, TListItem>(
  cfg: PageRouteConfig<TState, TListItem>,
) {
  async function GET(req: NextRequest): Promise<NextResponse> {
    if (!cfg.apiKey) return serverError('AIRTABLE_API_KEY ej konfigurerad.');
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    try {
      if (action === 'list') {
        const records = await listRecords(cfg.apiKey, cfg.tableId, {
          baseId: cfg.baseId,
          fields: cfg.listFields ? [...cfg.listFields] : undefined,
          sort: cfg.listSort ? [...cfg.listSort] : undefined,
        });
        const pages = records.map(cfg.listMapper);
        const response: PageRouteListResponse<TListItem> = { success: true, pages };
        return NextResponse.json(response);
      }

      if (action === 'get') {
        if (!cfg.loadState) return badRequest('action=get stöds inte för denna sidtyp.');
        const recordId = url.searchParams.get('id');
        if (!recordId) return badRequest('Saknar ?id=recXXX.');
        const state = await cfg.loadState(cfg.apiKey, recordId);
        return NextResponse.json({ success: true, state });
      }

      return badRequest('Okänd action. Använd ?action=list eller ?action=get&id=recXXX.');
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'Okänt fel.');
    }
  }

  async function POST(req: NextRequest): Promise<NextResponse> {
    if (!cfg.apiKey) return serverError('AIRTABLE_API_KEY ej konfigurerad.');

    let state: TState;
    try { state = (await req.json()) as TState; } catch { return badRequest('Ogiltig JSON.'); }

    const slugError = await runSlugChecks(cfg, cfg.apiKey, state, null);
    if (slugError) return slugError;

    if (cfg.validate) {
      const msg = cfg.validate(state);
      if (msg) return badRequest(msg);
    }

    try {
      const fields = cfg.stateToFields(state, 'create');
      const created = await createRecord(cfg.apiKey, cfg.tableId, fields, cfg.baseId);
      await invalidateCache(cfg, 'create');
      return NextResponse.json(
        { success: true, mode: 'create' as const, recordId: created.id },
        { status: 201 },
      );
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'Create misslyckades.');
    }
  }

  async function PATCH(req: NextRequest): Promise<NextResponse> {
    if (!cfg.apiKey) return serverError('AIRTABLE_API_KEY ej konfigurerad.');
    const url = new URL(req.url);
    const recordId = url.searchParams.get('id');
    if (!recordId) return badRequest('Saknar ?id=recXXX.');

    let state: TState;
    try { state = (await req.json()) as TState; } catch { return badRequest('Ogiltig JSON.'); }

    const slugError = await runSlugChecks(cfg, cfg.apiKey, state, recordId);
    if (slugError) return slugError;

    if (cfg.validate) {
      const msg = cfg.validate(state);
      if (msg) return badRequest(msg);
    }

    try {
      const fields = cfg.stateToFields(state, 'update');
      await updateRecord(cfg.apiKey, cfg.tableId, recordId, fields, cfg.baseId);
      await invalidateCache(cfg, 'update');
      return NextResponse.json({ success: true, mode: 'update' as const, recordId });
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'Update misslyckades.');
    }
  }

  async function DELETE(req: NextRequest): Promise<NextResponse> {
    if (!cfg.apiKey) return serverError('AIRTABLE_API_KEY ej konfigurerad.');
    const url = new URL(req.url);
    const recordId = url.searchParams.get('id');
    if (!recordId) return badRequest('Saknar ?id=recXXX.');
    try {
      await deleteRecords(cfg.apiKey, cfg.tableId, [recordId], cfg.baseId);
      await invalidateCache(cfg, 'delete');
      return NextResponse.json({ success: true, deleted: true });
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'Delete misslyckades.');
    }
  }

  return { GET, POST, PATCH, DELETE };
}
