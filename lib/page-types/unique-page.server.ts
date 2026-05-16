/**
 * Unique-page — server-side sidtypsdefinition (Lager 3).
 *
 * Lager 3 + Claude-transform: state → Airtable-fält går alltid via Claude
 * (`transformUniquePage`), inte en handskriven mapper. Country/Division är
 * linked-record-fält direkt på record:en (multipleRecordLinks som arrayer
 * av IDs); arrayerna echas igenom Claude och skrivs som vanliga fält.
 */

import { AirtableRecord, SSOT_BASE_ID } from '../airtable';
import { createRecord, updateRecord } from '../airtable';
import {
  UNIQUE_PAGES_TABLE_ID,
  uniquePageStateFromRecord,
} from '../unique-page-mapper';
import { UniquePageState, emptyUniquePageState } from '../unique-page-types';
import { UNIQUE_PAGES_ENTITIES } from '../wexoe-cache';
import { transformUniquePage } from '../claude-transform';
import type { PageTypeServerDef } from './types';

export interface UniquePageListItem {
  id: string;
  slug: string;
  h1: string;
  published: boolean;
  divisionIds: string[];
  countryIds: string[];
}

function requireAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY ej konfigurerad.');
  return key;
}

async function uniquePageCreate(
  state: UniquePageState,
  ctx: { apiKey: string },
): Promise<{ recordId: string }> {
  const anthropicKey = requireAnthropicKey();
  const { uniquePage } = await transformUniquePage(anthropicKey, state, 'create');
  const created = await createRecord(
    ctx.apiKey,
    UNIQUE_PAGES_TABLE_ID,
    uniquePage,
    SSOT_BASE_ID,
  );
  return { recordId: created.id };
}

async function uniquePageUpdate(
  recordId: string,
  state: UniquePageState,
  ctx: { apiKey: string },
): Promise<{ relations: Record<string, never> }> {
  const anthropicKey = requireAnthropicKey();
  const { uniquePage } = await transformUniquePage(anthropicKey, state, 'update');
  await updateRecord(
    ctx.apiKey,
    UNIQUE_PAGES_TABLE_ID,
    recordId,
    uniquePage,
    SSOT_BASE_ID,
  );
  return { relations: {} };
}

export const uniquePageServer: PageTypeServerDef<UniquePageState, UniquePageListItem> = {
  id: 'unique-page',
  label: 'Egen sida',
  tableId: UNIQUE_PAGES_TABLE_ID,
  baseId: SSOT_BASE_ID,
  emptyState: emptyUniquePageState,
  fromRecord: uniquePageStateFromRecord,

  // Lager 3 — skriv-vägen går via Claude-transform.
  create: uniquePageCreate,
  update: uniquePageUpdate,

  validate: (s) => {
    if (!s.h1?.trim()) return { field: 'h1', message: 'H1 är obligatorisk.' };
    return null;
  },
  listItemMapper: (r: AirtableRecord): UniquePageListItem => ({
    id: r.id,
    slug: (r.fields['slug'] as string) ?? '',
    h1: (r.fields['h1'] as string) ?? '',
    published: r.fields['is_published'] === true,
    divisionIds: (r.fields['division_ids'] as string[] | undefined) ?? [],
    countryIds: (r.fields['country_ids'] as string[] | undefined) ?? [],
  }),
  cacheEntities: UNIQUE_PAGES_ENTITIES,
  slug: {
    accessor: (s) => s.slug,
    field: 'slug',
    validateFormat: true,
    checkReserved: true,
    checkDuplicate: true,
  },
};
