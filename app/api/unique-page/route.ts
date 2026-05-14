/**
 * CRUD-route för cms_unique_pages.
 *
 *   GET    /api/unique-page?action=list     — list
 *   POST   /api/unique-page                 — create
 *   PATCH  /api/unique-page?id=recXXX       — update
 *   DELETE /api/unique-page?id=recXXX       — delete
 *
 * Drivs av createPageRoute() i lib/route-factory.ts — slug-validering,
 * duplikat-koll, reservedSlug-koll och cache-invalidering är konfigurerade
 * deklarativt nedan. Fältnamn är snake_case enligt cms_unique_pages-schema.
 *
 * Single-record läses server-side via getRecord() i
 * app/editor/unique/[recordId]/page.tsx, inte via denna route — därför saknas
 * action=get.
 */

import { SSOT_BASE_ID, AirtableRecord } from '@/lib/airtable';
import { uniquePageStateToFields, UNIQUE_PAGES_TABLE_ID } from '@/lib/unique-page-mapper';
import { UniquePageState } from '@/lib/unique-page-types';
import { UNIQUE_PAGES_ENTITIES } from '@/lib/wexoe-cache';
import { createPageRoute } from '@/lib/route-factory';

interface UniquePageListItem {
  id: string;
  slug: string;
  h1: string;
  published: boolean;
  divisionIds: string[];
  countryIds: string[];
}

export const { GET, POST, PATCH, DELETE } = createPageRoute<UniquePageState, UniquePageListItem>({
  apiKey: process.env.AIRTABLE_API_KEY,
  tableId: UNIQUE_PAGES_TABLE_ID,
  baseId: SSOT_BASE_ID,
  cacheEntities: UNIQUE_PAGES_ENTITIES,
  cacheContext: 'unique-page',

  stateToFields: uniquePageStateToFields,

  listMapper: (r: AirtableRecord): UniquePageListItem => ({
    id: r.id,
    slug: (r.fields['slug'] as string) ?? '',
    h1: (r.fields['h1'] as string) ?? '',
    published: r.fields['is_published'] === true,
    divisionIds: (r.fields['division_ids'] as string[] | undefined) ?? [],
    countryIds: (r.fields['country_ids'] as string[] | undefined) ?? [],
  }),

  slugAccessor: (s) => s.slug,
  slugField: 'slug',
  validateSlugFormat: true,
  checkReservedSlug: true,
  checkDuplicateSlug: true,
});
