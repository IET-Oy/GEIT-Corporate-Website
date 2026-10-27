# Energy DT Phase 1 — Integrated Product Area

## Scope and application boundary

Energy DT remains in the existing `@workspace/geit-website` application and pnpm monorepo. No separate artifact, repository, package, API service, or database was created.

- `/energy-dt` is the public product overview.
- The existing Energy DT navigation link at `/energy-saas` now leads to that overview.
- Existing protected workspace routes remain under `/app/*`; `/energy-dt/sign-in`, `/energy-dt/register`, `/energy-dt/forgot-password`, `/energy-dt/reset-password`, `/energy-dt/auth/callback`, and `/energy-dt/workspace` are aliases to the established routes.
- Existing corporate pages and marketing layout remain in their current routes.
- `/app/recommendations` is an authenticated, explicitly planned placeholder. It does not create sample recommendations or results.

## Existing components retained

The product area continues to use the existing application router, `AppRoutes`, `Workspace` session and organisation gate, account pages, organisation settings, Energy Management, engineering pages, sustainability pages, and saved reports. The overview links to existing destinations rather than duplicating their workflows.

The visible workspace destinations cover the dashboard; organisations and sites; assets and meters; Digital Twin, forecasting and anomaly detection; engineering and simulations; tariffs, costs and savings; carbon; reports and documents; projects and recommendations; and organisation settings. Some destinations share an existing page. The overview identifies Recommendations as planned. The presence of a route is not evidence that a live integration or calculation was validated.

## Security and backend boundaries

The existing Express API is shared with the corporate website and was not modified.

- Platform account and organisation routes use the request identity/session layer in `artifacts/api-server/src/lib/platform-session.ts` and `routes/platform.ts`.
- Energy and engineering route handlers call the session identity layer and check organisation membership/role using the `geit_role` RPC; requests use organisation-scoped filters.
- Private documents use the `geit-private-documents` bucket through the current user’s Supabase client; code comments prohibit public URLs and service-role access for tenant documents.
- These are source-code observations, not a live authentication, tenant-isolation, database RLS, or storage-permission test. No such integration tests were run in this phase.

The API’s production configuration expects `PORT`, `PLATFORM_ORIGIN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SESSION_SECRET`. Production validation requires the Supabase URL, publishable key, session secret, and a valid platform origin; the API entry point requires `PORT`. The source also references staging-isolation settings including `GEIT_ENVIRONMENT`, `GEIT_TEST_SUPABASE_PROJECT_REF`, `SUPABASE_DB_URL`, `DATABASE_URL`, `GEIT_STAGING_APPROVAL_FILE`, and `GEIT_ALLOW_TEST_FIXTURE_WRITES`. No values were read, changed, or configured. Optional AI settings are `GEIT_AI_ENABLED` and `GEIT_AI_MODEL`.

## Intake form status

No Energy DT-specific intake form was found in the existing `src/platform` implementation. The corporate consultation `ContactForm` remains separate: it validates entries in the browser but intentionally does not send, store, or log them. No replacement form or submission workflow was invented.

## Verification boundaries

Before the Phase 1 edits, the website typecheck passed and the Energy DT refinement test passed 11/11 cases. Post-edit verification did not complete: the workspace execution worker disconnected, and the website workflow then aborted while spawning a thread with `Resource temporarily unavailable`. Therefore the changed application has not passed a post-edit typecheck, test suite, production build, or visual preview.

The signed-in interface, live Supabase connectivity, organisation isolation, RLS, private storage permissions, and external providers were not revalidated against staging. Do not use this phase as evidence that those systems are production-ready.

## Next phase recommendation

After the separate staging project and environment have been independently verified, run authenticated tests against staging only: sign-in and recovery, tenant and role isolation, database RLS, private storage access, core module workflows, and failure handling. Keep production configuration and data out of those tests. Do not migrate, deploy, or enable fixture writes until the staging target is confirmed.
