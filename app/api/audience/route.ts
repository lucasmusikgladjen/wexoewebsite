/**
 * CRUD-route för Audience-records.
 *
 * Drivs deklarativt av `audienceServer` (lib/page-types/audience.server.ts).
 * Endpoints: GET ?action=list | get&id, POST, PATCH ?id, DELETE ?id.
 *
 * Audience-tabellen ligger fortfarande kvar i legacy-basen tills SSOT-
 * migrationen är klar — `baseId` är wired på audienceServer.
 */

import { audienceServer, loadAudienceState } from '@/lib/page-types/audience.server';
import { createPageRoute, pageTypeToRouteConfig } from '@/lib/route-factory';

export const { GET, POST, PATCH, DELETE } = createPageRoute(
  pageTypeToRouteConfig(audienceServer, process.env.AIRTABLE_API_KEY, loadAudienceState),
);
