/**
 * CRUD-route för Audience-records.
 *
 *   GET    /api/audience?action=list           — list
 *   GET    /api/audience?action=get&id=recXXX  — load state
 *   POST   /api/audience                       — create
 *   PATCH  /api/audience?id=recXXX             — update
 *   DELETE /api/audience?id=recXXX             — delete
 *
 * Drivs av createPageRoute() i lib/route-factory.ts. Inga relationer —
 * audience är ren Lager 1 (primary record only).
 *
 * Audience-tabellen ligger fortfarande kvar i legacy-basen tills SSOT-
 * migrationen är klar — `baseId: AUDIENCE_BASE_ID` pekar dit.
 */

import { AirtableRecord } from '@/lib/airtable';
import { AUDIENCE_TABLE_IDS, AUDIENCE_BASE_ID, audienceStateToFields } from '@/lib/audience-mapper';
import { loadAudienceState } from '@/lib/audience-loader';
import { AudienceState } from '@/lib/audience-types';
import { AUDIENCE_ENTITIES } from '@/lib/wexoe-cache';
import { createPageRoute } from '@/lib/route-factory';

interface AudienceListItem {
  id: string;
  name: string;
  slug: string;
  h1: string;
}

export const { GET, POST, PATCH, DELETE } = createPageRoute<AudienceState, AudienceListItem>({
  apiKey: process.env.AIRTABLE_API_KEY,
  tableId: AUDIENCE_TABLE_IDS.audienceHeroes,
  baseId: AUDIENCE_BASE_ID,
  cacheEntities: AUDIENCE_ENTITIES,
  cacheContext: 'audience',

  loadState: loadAudienceState,
  stateToFields: audienceStateToFields,

  listFields: ['Slug', 'Title', 'Eyebrow'],
  listSort: [{ field: 'Slug', direction: 'asc' }],
  listMapper: (r: AirtableRecord): AudienceListItem => ({
    id: r.id,
    // Audience-records saknar separat Name-fält — använd Eyebrow + Slug
    // för visning, Title som "h1"-ekvivalent.
    name: (r.fields.Eyebrow as string) || (r.fields.Slug as string) || '',
    slug: (r.fields.Slug as string) || '',
    h1: (r.fields.Title as string) || '',
  }),

  slugAccessor: (s) => s.slug,
  slugField: 'Slug',
  checkDuplicateSlug: true,

  validate: (s) => {
    if (!s.title?.trim()) return 'Title är obligatoriskt.';
    return null;
  },
});
