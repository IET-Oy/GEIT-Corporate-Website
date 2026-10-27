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

### Recheck after workspace reset

The website and API workflows were reported as running. The pre-test resource check still showed `pids.current=1107` of `pids.max=1152`, `memory.current=7,187,177,472` of `memory.max=8,589,934,592`, and `MemAvailable: 0 kB`. `pids.events` remained at `max 30`; `memory.events` remained `oom=0`, `oom_kill=11`, and `oom_group_kill=2`. Because task headroom was below 4% and available memory was zero, no additional tests or build were launched after this check.

Current check status:

| Check | Status | Result |
|---|---|---|
| `public-support.interactions.test.mjs` | Inconclusive | Prior isolated run timed out after 90 seconds with exit `-1` and no output; not retried after reset. |
| Energy DT refinement | Not run after edits | Stopped at resource preflight. |
| Hero-light-field | Not run after edits | Stopped at resource preflight. |
| Authentication | Not run after edits | Stopped at resource preflight. |
| Reports | Not run after edits | Stopped at resource preflight. |
| Localization | Not run after edits | Stopped at resource preflight. |
| Vite production build | Inconclusive | Prior attempt disconnected without an exit status; not retried after reset. |

### Process inspection and recovery

No process was terminated. The final resource sample during this inspection was `pids.current=1107` of `pids.max=1152`, `memory.current=7,173,853,184` of `memory.max=8,589,934,592`, and `MemAvailable: 0 kB`. `pids.events` remained at `max 30`; `memory.events` remained `oom=0`, `oom_kill=11`, and `oom_group_kill=2`.

The process list contained 96 Node `MainThread` processes accounting for 1,032 threads. A large, long-lived, sleeping parent-child chain ran under a ShellExec cgroup; another visible runtime-owned shell/Node branch included a sleeping Node process with about 687 MB RSS. The inspected processes were still parented to live runtime processes, and their ownership as test jobs or abandoned tasks could not be established from safe process metadata. No explicit `--test` or `*.test.mjs` process was identified by the sanitized command scan. Therefore none of these workers was safe to terminate by PID. RSS values are per-process and may include shared pages, so they should not be summed as physical memory.

The website workflow's visible process chain was `pnpm-native` → shell → Node → esbuild, consistent with its running Vite service; it was preserved. The API workflow was also reported running and was preserved. No second Vite server was confidently identified. The `ss -lptn` check could not run because `ss` is not installed, so this inspection did not independently map listening ports.

No cleanup was performed, so there is no post-cleanup measurement. Because a workspace reset did not restore safe headroom and no worker could be safely attributed to a disposable test, do not reset again or kill processes blindly. Replit's troubleshooting guidance is to contact Support for runtime-level recovery when high resource use remains after restart, providing the project URL and these process/resource findings: [Troubleshooting guides](https://docs.replit.com/help/troubleshooting/overview).

An approved non-production test target is not independently configured or verified. A separate Energy DT application or production Supabase project is not required; keep the platform integrated in this GEIT application. Do not reuse deleted project credentials. No staging credentials, database migrations, Auth settings, or Storage policies were changed.

The signed-in interface, live Supabase connectivity, organisation isolation, RLS, private storage permissions, and external providers were not revalidated against staging. Do not use this phase as evidence that those systems are production-ready.

The role model is being consolidated to `owner`, `admin`, `editor`, `analyst` and
`reader`. Migration `007_editor_role.sql` maps existing `energy_manager` and
`consultant` memberships to `editor` and updates the database permission
functions and private Storage policies. The migration is prepared but has not
been applied; no database access or role/RLS tests were run.

The OpenAPI schema was updated for the new role set. Orval generation was
attempted once and exited with code 134 without output; the cause is unconfirmed.
The affected generated role enums were synchronized manually. Code generation
and type checking still need to be rerun when the workspace has safe execution
headroom.

### Integrated master-plan continuation

The Energy DT overview now describes the workspace as part of the existing GEIT
application and no longer implies that a dedicated staging project is required.
Its destination card is labelled **Sites & Meters** and explicitly states that
building and separate asset records are not available yet.

A scoped search of migrations, API route definitions and the platform module
configuration found no persisted building/asset entities or corresponding API
routes. This identifies a Phase 4 registry gap; it is not evidence about every UI
component. No schema, API or customer data changes were made for that gap.

The latest resource-gated source inspection reported `pids.current=1106` of
`pids.max=1152` and `memory.current=7452688384` of
`memory.max=8589934592` bytes. This single reading does not establish the cause
of the Orval process abort. No tests or application build were run after the
role or overview changes. Previous test/build results above remain historical
and do not verify these changes.

**Next implementation milestone:** add an organisation-scoped Buildings &
Assets registry using a new additive migration, tenant RLS, authenticated API
CRUD and a workspace UI. Keep the migration unapplied until an operator approves
a verified non-production target. Add focused tests and run them individually
after execution capacity recovers.

## Next phase recommendation

After an approved non-production test target and its environment have been independently verified, run authenticated tests there: sign-in and recovery, tenant and role isolation, database RLS, private storage access, core module workflows, and failure handling. Keep production configuration and data out of those tests. Do not migrate, deploy, or enable fixture writes until the test target is confirmed.
