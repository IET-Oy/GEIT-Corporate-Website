# GEIT Energy DT — Buildings & Assets Registry

## Customer workflow

1. In Energy Management, create or select an active site.
2. Add a building to that site. Record its type, time zone, address, optional
   coordinates, floor area and unit, description, and optional flat metadata.
3. Add an asset to the same site. An asset may be site-level or assigned to one
   building. Record its type, optional tag, manufacturer/model/serial number,
   commissioning date, status, capacity and unit, description, and metadata.
4. Use the search box to filter the currently loaded site, building, meter, and
   asset records. Building rows show their associated assets.
5. Edit or archive records from their list. Hard deletion is not offered.
   Active assets must be archived before their building can be archived.
   Restore a site or building before restoring child records.

## Data and authorization

- Sites continue to use the existing `geit_energy_sites` model. The new
  `geit_energy_buildings` table references a site; `geit_energy_assets`
  references the same organisation and site, and optionally a building at that
  same site.
- All operations reuse the existing authenticated Energy DT route, organisation
  membership lookup, request-origin/CSRF checks, and user-JWT Supabase client.
  Organisation IDs are taken from the route and verified against membership;
  all row operations additionally filter by that organisation.
- Database RLS allows organisation members to read, and only roles permitted by
  `geit_energy_manage` (Owner, Administrator, Editor) to insert/update. The
  database has no hard-delete grant or policy. Composite foreign keys prevent
  cross-organisation or cross-site parent references.
- Registry writes to the synthetic demo dataset are rejected. Optional metadata
  is restricted to a small flat object with scalar values.

## API and current limits

The registry follows the current Energy Management session and organisation
authorization model:

- `GET /api/platform/energy/{orgId}/buildings` returns a paginated list. It
  accepts `siteId`, `search`, `limit` (1–100) and `offset` (0–100,000).
- `GET /api/platform/energy/{orgId}/buildings/{id}` returns the building and its
  associated assets.
- `POST`, `PATCH`, and `DELETE` on the building collection/item paths create,
  update, and soft-archive buildings. Delete does not physically remove rows;
  active assets must be archived first.
- `GET /api/platform/energy/{orgId}/assets` returns a paginated list and accepts
  `siteId`, `buildingId`, `status`, `search`, `limit` and `offset`.
- `GET`, `POST`, `PATCH`, and `DELETE` on `/assets/{id}` or `/assets` view,
  create, update, and soft-archive assets.
- The existing `GET /api/platform/energy/{orgId}` workspace response and
  `POST /records` save operation remain available for the current UI. The
  workspace includes sites, buildings, meters, assets, tariffs, rules, imports,
  analyses, and alerts.

Registry API lists support server-side pagination and search by record name.
The existing workspace response remains limited to 250 rows per resource, and
the UI currently uses that workspace response with client-side search.

## Migration and verification status

Migration `008_building_asset_registry.sql` is additive and **has not been
applied** to any database. It adds both tables, validation, indexes, ownership
guards, RLS policies, and same-organisation parent foreign keys.

Focused Zod validation, static migration-structure checks, and static API-scope
guard checks were added to the Energy test file but were **not run** because the
Replit workspace remained resource-constrained. These static checks do not prove
runtime authorization. No authenticated CRUD, cross-tenant, or live RLS test
was run. Those checks require a verified, approved non-production database and
available execution capacity. Do not treat this module as verified or
production-ready until those tests pass.
