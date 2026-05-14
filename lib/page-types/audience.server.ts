/**
 * Audience — server-side sidtypsdefinition.
 *
 * Server-half:n innehåller mappers, validering och list-projektion. Ingen
 * React-kod här — får importeras från app/api/audience/route.ts och från
 * server-pages utan att dra in client-bundlen.
 */

import { AirtableRecord } from '../airtable';
import {
  AUDIENCE_TABLE_IDS,
  AUDIENCE_BASE_ID,
  audienceStateFromRecord,
  audienceStateToFields,
} from '../audience-mapper';
import { loadAudienceState } from '../audience-loader';
import { AudienceState, emptyAudienceState } from '../audience-types';
import { AUDIENCE_ENTITIES } from '../wexoe-cache';
import type { PageTypeServerDef } from './types';

export interface AudienceListItem {
  id: string;
  name: string;
  slug: string;
  h1: string;
}

export const audienceServer: PageTypeServerDef<AudienceState, AudienceListItem> = {
  id: 'audience',
  label: 'Kundtyp',
  tableId: AUDIENCE_TABLE_IDS.audienceHeroes,
  baseId: AUDIENCE_BASE_ID,
  emptyState: emptyAudienceState,
  fromRecord: audienceStateFromRecord,
  stateToFields: audienceStateToFields,
  validate: (s) => {
    if (!s.title?.trim()) return { field: 'title', message: 'Title är obligatoriskt.' };
    return null;
  },
  listItemMapper: (r: AirtableRecord): AudienceListItem => ({
    id: r.id,
    name: (r.fields.Eyebrow as string) || (r.fields.Slug as string) || '',
    slug: (r.fields.Slug as string) || '',
    h1: (r.fields.Title as string) || '',
  }),
  listFields: ['Slug', 'Title', 'Eyebrow'],
  listSort: [{ field: 'Slug', direction: 'asc' }],
  cacheEntities: AUDIENCE_ENTITIES,
  slug: {
    accessor: (s) => s.slug,
    field: 'Slug',
    checkDuplicate: true,
  },
};

/**
 * Re-export av loader för create-page som vill hydrera state utan att gå
 * via en HTTP-route.
 */
export { loadAudienceState };
