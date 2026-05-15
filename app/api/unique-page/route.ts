/**
 * CRUD-route för cms_unique_pages.
 *
 * Drivs deklarativt av `uniquePageServer` (lib/page-types/unique-page.server.ts).
 * Endpoints: GET ?action=list, POST, PATCH ?id, DELETE ?id.
 *
 * Single-record läses server-side via getRecord() i
 * app/editor/unique/[recordId]/page.tsx — därför saknas action=get.
 */

import { uniquePageServer } from '@/lib/page-types/unique-page.server';
import { createPageRoute, pageTypeToRouteConfig } from '@/lib/route-factory';

export const { GET, POST, PATCH, DELETE } = createPageRoute(
  pageTypeToRouteConfig(uniquePageServer, process.env.AIRTABLE_API_KEY),
);
