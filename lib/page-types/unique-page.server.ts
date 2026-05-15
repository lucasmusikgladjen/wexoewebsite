/**
 * Unique-page — server-side sidtypsdefinition.
 *
 * Ren Lager 1 — inga relations. Country/Division är linked-record-FÄLT
 * direkt på record:en (multipleRecordLinks som arrayer av IDs), inte
 * separata child-records. Field.LinkedRecords hanterar dem via /api/core.
 */

import { AirtableRecord, SSOT_BASE_ID } from '../airtable';
import {
  UNIQUE_PAGES_TABLE_ID,
  uniquePageStateFromRecord,
  uniquePageStateToFields,
} from '../unique-page-mapper';
import { UniquePageState, emptyUniquePageState } from '../unique-page-types';
import { UNIQUE_PAGES_ENTITIES } from '../wexoe-cache';
import type { PageTypeServerDef } from './types';

export interface UniquePageListItem {
  id: string;
  slug: string;
  h1: string;
  published: boolean;
  divisionIds: string[];
  countryIds: string[];
}

export const uniquePageServer: PageTypeServerDef<UniquePageState, UniquePageListItem> = {
  id: 'unique-page',
  label: 'Egen sida',
  tableId: UNIQUE_PAGES_TABLE_ID,
  baseId: SSOT_BASE_ID,
  emptyState: emptyUniquePageState,
  fromRecord: uniquePageStateFromRecord,
  stateToFields: uniquePageStateToFields,
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
