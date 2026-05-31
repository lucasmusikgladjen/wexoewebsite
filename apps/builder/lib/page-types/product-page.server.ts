/**
 * Product Page — server-side sidtypsdefinition (Lager 3).
 *
 * Product-area passar inte i Lager 2 (declarative relations) eftersom dess
 * Airtable-fält byggs av en deterministisk transform (inga Claude-anrop) och
 * products/solutions skrivs som egna records i specifik ordning. Vi använder
 * Lager 3:s `create`/`update`-overrides via factory:n och håller den koden i
 * `product-page-actions.ts`.
 *
 * Routen får trots det samma standarder som övriga sidtyper:
 *   - Slug-validering + duplikat-koll
 *   - `{ success, error, code? }`-felformat
 *   - DELETE-endpoint
 *   - Wexoe Core cache-invalidering
 *
 * `emptyState` / `fromRecord` lämnas oexponerade här eftersom (a) factory:n
 * behöver dem inte när create/update är override:de, (b) `loadProductPageState()`
 * är den enda korrekta load-vägen (den hämtar PA + products + articles +
 * solutions i en sweep), och (c) `emptyProductPageState` importeras direkt
 * av create-page:n.
 */

import { AirtableRecord } from '../airtable';
import {
  productPageCreate,
  productPageUpdate,
  type ProductPageListItem,
} from './product-page-actions';
import { loadProductPageState } from '../product-page-loader';
import { PA_TABLE_IDS, PA_BASE_ID } from '../product-page-mapper';
import { ProductPageState } from '../product-page-types';
import { PA_ENTITIES } from '../wexoe-cache';
import type { PageTypeServerDef } from './types';

// fromRecord och emptyState är obligatoriska i typen men anropas inte i
// product-page:s flöde — `loadProductPageState()` är den enda korrekta
// load-vägen (den hämtar PA + products + articles + solutions i en sweep)
// och `emptyProductPageState` importeras direkt av create-page:n.
function unreachableFromRecord(): never {
  throw new Error('product-page: använd loadProductPageState() istället för fromRecord.');
}

export const productPageServer: PageTypeServerDef<ProductPageState, ProductPageListItem> = {
  id: 'product-page',
  label: 'Produktområde',
  tableId: PA_TABLE_IDS.productPages,
  baseId: PA_BASE_ID,

  // Lager 3 — hela skriv-vägen är override:d.
  create: productPageCreate,
  update: productPageUpdate,

  // Required-by-type-stubs (se kommentarer ovan).
  emptyState: unreachableFromRecord,
  fromRecord: unreachableFromRecord,

  validate: (s) => {
    if (!s.h1?.trim()) return { field: 'h1', message: 'H1 är obligatoriskt.' };
    return null;
  },
  listItemMapper: (r: AirtableRecord): ProductPageListItem => ({
    id: r.id,
    name: (r.fields.name as string) || '',
    slug: (r.fields.slug as string) || '',
    h1: (r.fields.h1 as string) || '',
    divisionIds: (r.fields.division_ids as string[] | undefined) ?? [],
  }),
  listFields: ['name', 'slug', 'h1', 'division_ids'],
  listSort: [{ field: 'slug', direction: 'asc' }],

  cacheEntities: PA_ENTITIES,

  slug: {
    accessor: (s) => s.slug,
    field: 'slug',
    checkDuplicate: true,
  },
};

export { loadProductPageState };
