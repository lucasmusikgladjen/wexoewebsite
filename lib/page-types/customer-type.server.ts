/**
 * Customer-type-page — server-side sidtypsdefinition (Lager 3).
 *
 * Lager 3 + Claude-transform: state → Airtable-fält går alltid via Claude
 * (`transformCustomerType`), inte en handskriven mapper. Det matchar
 * konventionen för alla nya sidtyper.
 *
 * Schemat är flatt (en tabell, inga child-records) men Claude-mellanlaget
 * gör det enkelt att lägga till nya format-regler eller fält utan att
 * röra TypeScript-mappers.
 */

import { AirtableRecord } from '../airtable';
import { createRecord, updateRecord } from '../airtable';
import {
  CUSTOMER_TYPE_TABLE_IDS,
  CUSTOMER_TYPE_BASE_ID,
  customerTypePageStateFromRecord,
} from '../customer-type-mapper';
import { loadCustomerTypePageState } from '../customer-type-loader';
import { CustomerTypePageState, emptyCustomerTypePageState } from '../customer-type-types';
import { CUSTOMER_TYPE_PAGE_ENTITIES } from '../wexoe-cache';
import { transformCustomerType } from '../claude-transform';
import type { PageTypeServerDef } from './types';

export interface CustomerTypePageListItem {
  id: string;
  name: string;
  slug: string;
  h1: string;
}

function requireAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY ej konfigurerad.');
  return key;
}

async function customerTypeCreate(
  state: CustomerTypePageState,
  ctx: { apiKey: string },
): Promise<{ recordId: string }> {
  const anthropicKey = requireAnthropicKey();
  const { customerTypePage } = await transformCustomerType(anthropicKey, state, 'create');
  const created = await createRecord(
    ctx.apiKey,
    CUSTOMER_TYPE_TABLE_IDS.customerTypePages,
    customerTypePage,
    CUSTOMER_TYPE_BASE_ID,
  );
  return { recordId: created.id };
}

async function customerTypeUpdate(
  recordId: string,
  state: CustomerTypePageState,
  ctx: { apiKey: string },
): Promise<{ relations: Record<string, never> }> {
  const anthropicKey = requireAnthropicKey();
  const { customerTypePage } = await transformCustomerType(anthropicKey, state, 'update');
  await updateRecord(
    ctx.apiKey,
    CUSTOMER_TYPE_TABLE_IDS.customerTypePages,
    recordId,
    customerTypePage,
    CUSTOMER_TYPE_BASE_ID,
  );
  return { relations: {} };
}

export const customerTypeServer: PageTypeServerDef<
  CustomerTypePageState,
  CustomerTypePageListItem
> = {
  id: 'customer-type',
  label: 'Kundtyp',
  tableId: CUSTOMER_TYPE_TABLE_IDS.customerTypePages,
  baseId: CUSTOMER_TYPE_BASE_ID,
  emptyState: emptyCustomerTypePageState,
  fromRecord: customerTypePageStateFromRecord,

  // Lager 3 — skriv-vägen går via Claude-transform.
  create: customerTypeCreate,
  update: customerTypeUpdate,

  validate: (s) => {
    if (!s.title?.trim()) return { field: 'title', message: 'Title är obligatoriskt.' };
    return null;
  },
  listItemMapper: (r: AirtableRecord): CustomerTypePageListItem => ({
    id: r.id,
    name: (r.fields.name as string) || (r.fields.slug as string) || '',
    slug: (r.fields.slug as string) || '',
    h1: (r.fields.title as string) || '',
  }),
  listFields: ['slug', 'title', 'name', 'eyebrow'],
  listSort: [{ field: 'slug', direction: 'asc' }],
  cacheEntities: CUSTOMER_TYPE_PAGE_ENTITIES,
  slug: {
    accessor: (s) => s.slug,
    field: 'slug',
    checkDuplicate: true,
  },
};

export { loadCustomerTypePageState };
