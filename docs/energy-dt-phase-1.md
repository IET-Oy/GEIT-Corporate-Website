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

Post-edit checks completed:

- Website TypeScript check: passed.
- `platform-manifest.test.mjs`: 3/3 passed after updating expectations for the explicitly planned Recommendations route.
- `site-navigation.test.mjs`: 5/5 passed after updating the expected Energy DT overview route.
- Founder profile, public-support, service-image, industry-image, and footer-social tests passed in isolated runs.
- Vite started on port 18414; `/`, `/energy-dt`, `/app`, and `/app/sign-in` returned HTTP 200, and the React entry plus changed Energy DT modules transformed successfully.

Verification remains incomplete. A grouped platform test invocation and an isolated `public-support.interactions.test.mjs` invocation through CodeExecution disconnected before returning results. In the current diagnostic pass, the shell command `RAYON_NUM_THREADS=1 node --test tests/public-support.interactions.test.mjs` timed out after 90 seconds with exit code `-1` and no output. This is inconclusive, not a test assertion failure. `hero-light-field.test.mjs`, the Energy DT refinement suite, auth/report tests, and localization check have not been confirmed after the edits. A direct Vite production-build attempt also disconnected before returning an exit status or output, so its outcome is unknown. The screenshot browser failed to open, so visual rendering was not independently checked.

Execution-limit observations on 2026-10-27: the cgroup reported `pids.current=1105` against `pids.max=1152`; after the timed-out test it reported 1106/1152. `pids.events` increased from `max 29` to `max 30`, confirming a task-limit event occurred during that interval. Memory usage was 7,254,999,040 of 8,589,934,592 bytes, `/proc/meminfo` reported `MemAvailable: 0 kB`, and `memory.events` showed `oom=0`, `oom_kill=11`, and `oom_group_kill=2`; those OOM counters did not change across the test attempt. A minimal `ShellExec` probe succeeded, so a current shell/PTY startup failure was not observed. These measurements establish task-limit pressure and low available memory, but do not prove the precise cause of each earlier CodeExecution disconnection or that the timed-out test was OOM-killed. Do not interpret disconnected or timed-out commands as test or build passes.

Phase 2 staging setup has not started: no new staging project identity has been provided or independently verified. No staging credentials, database migrations, Auth settings, or Storage policies were changed.

The signed-in interface, live Supabase connectivity, organisation isolation, RLS, private storage permissions, and external providers were not revalidated against staging. Do not use this phase as evidence that those systems are production-ready.

## Next phase recommendation

After the separate staging project and environment have been independently verified, run authenticated tests against staging only: sign-in and recovery, tenant and role isolation, database RLS, private storage access, core module workflows, and failure handling. Keep production configuration and data out of those tests. Do not migrate, deploy, or enable fixture writes until the staging target is confirmed.
