/**
 * CRUD-route för Product Page-records.
 *
 * Drivs av createPageRoute() (Lager 3 — `create`/`update`-overrides bor i
 * `lib/page-types/product-page-actions.ts`). Routen får standardiserad
 * slug-validering, felformat och cache-invalidering; skrivvägen är
 * deterministisk (rena funktioner, inga Claude-anrop) via productPageCreate/Update.
 *
 * `?action=list-divisions` är borttagen — server-pages använder
 * loadDivisions() direkt istället för att gå via routen.
 *
 * Product Page-familjen ligger fortfarande kvar i legacy-basen — `baseId`
 * är wired på productPageServer.
 */

import { productPageServer, loadProductPageState } from '@/lib/page-types/product-page.server';
import { createPageRoute, pageTypeToRouteConfig } from '@/lib/route-factory';

export const { GET, POST, PATCH, DELETE } = createPageRoute(
  pageTypeToRouteConfig(productPageServer, process.env.AIRTABLE_API_KEY, loadProductPageState),
);
