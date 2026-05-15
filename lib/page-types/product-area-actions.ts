/**
 * Product Area — Lager 3 create/update-overrides.
 *
 * Product-area är inte ren CRUD: Claude transformerar state → Airtable-fält,
 * och varje "Product" och "Solution" är en separat Airtable-record. Vi
 * kunde inte använda Lager 2 (declarative relations) direkt eftersom
 * fält-transformationen är Claude-driven, inte deterministisk.
 *
 * Här lever den tidigare app/api/product-area/route.ts-create/update-koden,
 * lyft ut bakom `PageTypeServerDef.create` / `.update`-hooks. Returvärdet
 * mappas till factory:ns standardshape med `relations.products.created` och
 * `relations.solutions.created` som array av `{ clientId, recordId }` så
 * klient-koden konsumerar samma shape som andra sidtyper med relationer.
 */

import {
  createRecord,
  updateRecord,
  updateRecords,
  getRecord,
  listRecords,
} from '../airtable';
import { PA_TABLE_IDS, PA_BASE_ID } from '../product-area-mapper';
import { ProductAreaState } from '../product-area-types';
import { transformProductArea } from '../claude-transform';
import { contactFieldsEmpty, resolveDefaultCoworker } from '../default-coworker';
import type { RelationSyncResult } from './types';

type Result = {
  recordId: string;
  relations: Record<string, RelationSyncResult>;
};

function emptyRelationResult(): RelationSyncResult {
  return { created: [], updated: [], deleted: [], unlinked: [], errors: [] };
}

function sortByClientIndex<T extends { _clientIndex: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a._clientIndex - b._clientIndex);
}

async function loadExistingPa(
  apiKey: string,
  recordId: string,
): Promise<{ productIds: string[]; solutionIds: string[] }> {
  const record = await getRecord(apiKey, PA_TABLE_IDS.productAreas, recordId, PA_BASE_ID);
  return {
    productIds: (record.fields['Products'] as string[] | undefined) ?? [],
    solutionIds: (record.fields['Solutions'] as string[] | undefined) ?? [],
  };
}

function requireAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY ej konfigurerad.');
  return key;
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function productAreaCreate(
  state: ProductAreaState,
  ctx: { apiKey: string },
): Promise<Result> {
  const airtableKey = ctx.apiKey;
  const anthropicKey = requireAnthropicKey();

  // Default-coworker injection: om alla contact_*-fält är tomma, slå upp
  // första aktiva coworker från SSOT och förfyll.
  let workingState = state;
  if (contactFieldsEmpty(workingState)) {
    const defaults = await resolveDefaultCoworker({
      apiKey: airtableKey,
      countryCode: 'SE',
    });
    if (defaults) {
      workingState = {
        ...workingState,
        contactName: defaults.contactName,
        contactTitle: defaults.contactTitle,
        contactEmail: defaults.contactEmail,
        contactPhone: defaults.contactPhone,
        contactImage: defaults.contactImage,
      };
    }
  }

  const transformed = await transformProductArea(anthropicKey, workingState, 'create');

  const productsResult = emptyRelationResult();
  const solutionsResult = emptyRelationResult();

  // CREATE products i clientIndex-ordning och tracka {clientId, recordId}.
  const sortedProducts = sortByClientIndex(transformed.products);
  const productIdByClientIndex: Record<number, string> = {};
  for (const product of sortedProducts) {
    const created = await createRecord(airtableKey, PA_TABLE_IDS.products, product.fields, PA_BASE_ID);
    productIdByClientIndex[product._clientIndex] = created.id;
    const clientId = workingState.products[product._clientIndex]?.clientId;
    if (clientId) {
      productsResult.created.push({ clientId, recordId: created.id });
    }
  }

  // CREATE solutions — samma tracking.
  const sortedSolutions = sortByClientIndex(transformed.solutions);
  const solutionIdByClientIndex: Record<number, string> = {};
  for (const solution of sortedSolutions) {
    const created = await createRecord(airtableKey, PA_TABLE_IDS.solutions, solution.fields, PA_BASE_ID);
    solutionIdByClientIndex[solution._clientIndex] = created.id;
    const clientId = workingState.solutions[solution._clientIndex]?.clientId;
    if (clientId) {
      solutionsResult.created.push({ clientId, recordId: created.id });
    }
  }

  // CREATE Product Area:n med rätt link-array-ordning. `Name` mirroras
  // slug (basens konvention).
  const productIdOrder = workingState.products
    .map((_, i) => productIdByClientIndex[i])
    .filter((id): id is string => !!id);
  const solutionIdOrder = workingState.solutions
    .map((_, i) => solutionIdByClientIndex[i])
    .filter((id): id is string => !!id);

  const paFields: Record<string, unknown> = {
    Name: workingState.slug,
    ...transformed.productArea,
    Products: productIdOrder,
    Solutions: solutionIdOrder,
  };
  if (workingState.division.length > 0) {
    paFields.Division = workingState.division;
  }

  const createdPa = await createRecord(airtableKey, PA_TABLE_IDS.productAreas, paFields, PA_BASE_ID);

  return {
    recordId: createdPa.id,
    relations: {
      products: productsResult,
      solutions: solutionsResult,
    },
  };
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function productAreaUpdate(
  recordId: string,
  state: ProductAreaState,
  ctx: { apiKey: string },
): Promise<{ relations: Record<string, RelationSyncResult> }> {
  const airtableKey = ctx.apiKey;
  const anthropicKey = requireAnthropicKey();

  const existingPa = await loadExistingPa(airtableKey, recordId);
  const existingProductIds = new Set(existingPa.productIds);
  const existingSolutionIds = new Set(existingPa.solutionIds);

  const transformed = await transformProductArea(anthropicKey, state, 'update');

  // VIKTIGT: products och solutions är *delade* linkade records. Att ta
  // bort från state UN-LINKAR från denna PA (parent-array uppdateras
  // nedan) men RADERAR inte child-record:en. Aldrig delete här.
  const productsResult = emptyRelationResult();
  const productIdByClientIndex: Record<number, string> = {};

  // CREATE nya products först (saknar _recordId eller pekar på stale ID).
  const newProductEntries = transformed.products
    .filter((p) => !p._recordId || !existingProductIds.has(p._recordId))
    .sort((a, b) => a._clientIndex - b._clientIndex);
  for (const product of newProductEntries) {
    const created = await createRecord(airtableKey, PA_TABLE_IDS.products, product.fields, PA_BASE_ID);
    productIdByClientIndex[product._clientIndex] = created.id;
    const clientId = state.products[product._clientIndex]?.clientId;
    if (clientId) {
      productsResult.created.push({ clientId, recordId: created.id });
    }
  }

  // PATCH existerande products (de som fortfarande refereras).
  const productPatchBatch: Array<{ id: string; fields: Record<string, unknown> }> = [];
  for (const product of transformed.products) {
    if (!product._recordId || !existingProductIds.has(product._recordId)) continue;
    productPatchBatch.push({ id: product._recordId, fields: product.fields });
    productIdByClientIndex[product._clientIndex] = product._recordId;
  }
  if (productPatchBatch.length > 0) {
    await updateRecords(airtableKey, PA_TABLE_IDS.products, productPatchBatch, PA_BASE_ID);
    for (const p of productPatchBatch) productsResult.updated.push(p.id);
  }

  // Products som finns i Airtable men inte i state → unlinked (parent-fältet
  // uppdateras nedan så de "försvinner" från denna PA).
  const stateProductIds = new Set(
    transformed.products
      .filter((p) => p._recordId && existingProductIds.has(p._recordId))
      .map((p) => p._recordId as string),
  );
  for (const existingId of existingProductIds) {
    if (!stateProductIds.has(existingId)) {
      productsResult.unlinked.push(existingId);
    }
  }

  // Solutions — samma struktur som products.
  const solutionsResult = emptyRelationResult();
  const solutionIdByClientIndex: Record<number, string> = {};

  const newSolutionEntries = transformed.solutions
    .filter((s) => !s._recordId || !existingSolutionIds.has(s._recordId))
    .sort((a, b) => a._clientIndex - b._clientIndex);
  for (const solution of newSolutionEntries) {
    const created = await createRecord(airtableKey, PA_TABLE_IDS.solutions, solution.fields, PA_BASE_ID);
    solutionIdByClientIndex[solution._clientIndex] = created.id;
    const clientId = state.solutions[solution._clientIndex]?.clientId;
    if (clientId) {
      solutionsResult.created.push({ clientId, recordId: created.id });
    }
  }

  const solutionPatchBatch: Array<{ id: string; fields: Record<string, unknown> }> = [];
  for (const solution of transformed.solutions) {
    if (!solution._recordId || !existingSolutionIds.has(solution._recordId)) continue;
    solutionPatchBatch.push({ id: solution._recordId, fields: solution.fields });
    solutionIdByClientIndex[solution._clientIndex] = solution._recordId;
  }
  if (solutionPatchBatch.length > 0) {
    await updateRecords(airtableKey, PA_TABLE_IDS.solutions, solutionPatchBatch, PA_BASE_ID);
    for (const s of solutionPatchBatch) solutionsResult.updated.push(s.id);
  }

  const stateSolutionIds = new Set(
    transformed.solutions
      .filter((s) => s._recordId && existingSolutionIds.has(s._recordId))
      .map((s) => s._recordId as string),
  );
  for (const existingId of existingSolutionIds) {
    if (!stateSolutionIds.has(existingId)) {
      solutionsResult.unlinked.push(existingId);
    }
  }

  // PATCH Product Area:n med Claude-fields + nya link-array-ordningar.
  const productIdOrder = state.products
    .map((_, i) => productIdByClientIndex[i])
    .filter((id): id is string => !!id);
  const solutionIdOrder = state.solutions
    .map((_, i) => solutionIdByClientIndex[i])
    .filter((id): id is string => !!id);

  await updateRecord(airtableKey, PA_TABLE_IDS.productAreas, recordId, {
    ...transformed.productArea,
    Products: productIdOrder,
    Solutions: solutionIdOrder,
    Division: state.division,
  }, PA_BASE_ID);

  return {
    relations: {
      products: productsResult,
      solutions: solutionsResult,
    },
  };
}

// ─── List mapper ──────────────────────────────────────────────────────────

export interface ProductAreaListItem {
  id: string;
  name: string;
  slug: string;
  h1: string;
  divisionIds: string[];
}

export async function listProductAreas(apiKey: string): Promise<ProductAreaListItem[]> {
  const records = await listRecords(apiKey, PA_TABLE_IDS.productAreas, {
    baseId: PA_BASE_ID,
    fields: ['Name', 'Slug', 'H1', 'Division'],
    sort: [{ field: 'Name', direction: 'asc' }],
  });
  return records.map((r) => ({
    id: r.id,
    name: (r.fields.Name as string) || '',
    slug: (r.fields.Slug as string) || '',
    h1: (r.fields.H1 as string) || '',
    divisionIds: (r.fields.Division as string[] | undefined) ?? [],
  }));
}
