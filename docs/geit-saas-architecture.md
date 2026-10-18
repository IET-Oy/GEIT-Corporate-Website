# GEIT Energy Intelligence — phased implementation

## Current status

For the current request's Phase 1 foundation scope (including private storage),
see `docs/geit-foundation-setup.md`. The phase labels below reflect the earlier
eight-phase plan, not a requirement to rebuild the existing foundation.

Phase 1 is complete. Phase 2's account/organisation foundation is implemented
against the configured development Supabase project: server-held sessions,
registration and recovery endpoints, protected workspace, organisation creation/
selection/editing, owner-managed memberships, roles, RLS and audit events.
Corporate navigation is preserved with a separate workspace entry bar.
Energy Management is now implemented with persisted sites/meters, validated
CSV/Excel imports, interval storage, tariffs, KPIs/charts, rules/alerts, saved
snapshots and CSV/Excel/PDF exports. See `docs/geit-energy-management.md` for its
workflow, assumptions, tests and limits. Seven other service modules remain
honestly marked Planned. The corporate site is unchanged.

Foundation verification: 22 live API/security/storage checks, one offline PKCE cookie regression, three
manifest tests, full workspace typecheck, production builds and 22 corporate
routes in all four locales pass. A browser pass confirmed sign-in, persistence,
organisation creation/switching, member visibility, sign-out, tenant tampering,
form validation and desktop/tablet/mobile layouts. It found a bodyless DELETE
content-type mismatch and an unclear read-only field appearance; both were
corrected, with the DELETE path confirmed by the API suite.

**Open Phase 2 gate:** actual inbox verification/recovery and Supabase redirect
allowlist validation have not been completed. Synthetic accounts bypass email
delivery only in isolated development tests; they are removed after testing.
Do not call the platform production-ready until this gate
is addressed. Account/privacy terms also require review before production.

## Inspection findings and preservation boundaries

- Retain the pnpm workspace, React/Vite, TypeScript, Tailwind, Wouter, Express 5,
  OpenAPI/Orval and existing validation conventions. No Next.js migration.
- The corporate website has 11 public service pages and shared header, footer,
  language support, disconnected consultation UI and decorative hero background.
  Preserve the seven-link desktop menu, global homepage positioning, founders,
  accessibility and the text-free visualization.
- The API already has health and enquiry endpoints. Unlike the disconnected UI,
  the legacy enquiry POST endpoint has PostgreSQL persistence code. Do not connect
  the UI to it implicitly or describe it as tenant-aware SaaS intake.
- `lib/db` contains the existing Drizzle enquiry schema. Its records must not be
  migrated, deleted or repurposed as SaaS tenant data without separate approval.
- The existing backend has no SaaS identity or organisation permissions. Broad
  CORS, request-size limits, upload handling and tenant-aware error/logging
  behaviour need review before exposing new authenticated endpoints.
- Non-English translations remain drafts awaiting human review. Never silently
  replace missing translations with purportedly translated English.
- Publishing requires a confirmed public origin. Sitemap generation currently
  skips without `VITE_PUBLIC_SITE_URL`; do not invent a production domain.

## Architecture

- Extend this same product/artifact. Corporate URLs remain public and unchanged.
  Put authenticated workspaces under `/app`, with lazy-loaded feature routes.
- `src/config/platform-modules.ts` defines ten future navigation entries and maps
  all eleven corporate services to appropriate workspaces. Keep marketing links
  functional; introduce tool links only when the corresponding flow is implemented.
- Phase 2 introduces the separate second/application navigation without splitting
  the approved seven corporate links into multiple rows. Use clear active states,
  keyboard focus and an accessible compact/scrollable mobile arrangement.
- Use the existing Express API under `/api/platform`. Define each endpoint in
  `lib/api-spec/openapi.yaml`, regenerate clients/schemas, then implement server
  behaviour and its UI together. Do not duplicate a second API server.
- Use Supabase Auth, PostgreSQL and private document buckets for the new SaaS,
  as requested. Do not replace the legacy database or change `DATABASE_URL`.
- Prefer a backend-for-frontend session flow: Supabase tokens remain in protected,
  HttpOnly cookies, never localStorage. Secure cookies in HTTPS environments,
  explicit SameSite rules, Origin/CSRF validation for writes, session refresh,
  revocation/sign-out and exact redirect allowlists are Phase 2 acceptance items.
- Create a Supabase client per request with the authenticated user's JWT. Never
  reuse a global mutable user session or use a service-role key for normal requests.
  Verify the user server-side; decoding a JWT alone is not authentication.
- Use the database owner connection only for reviewed migrations. Neither it nor
  any privileged credential belongs in a VITE-prefixed value or frontend bundle.
- Public page forms retain their current honest disconnected behaviour until an
  explicitly implemented intake workflow and privacy disclosures are ready.

## Database and tenant security

Maintain additive, versioned SQL migrations and a migration ledger. Inspect the
target project before applying them; never reset an existing database.

| Phase | Entity groups |
| --- | --- |
| 2 | profiles, organisations, memberships/roles, audit events |
| 3 | sites, buildings, meters, interval readings, imports/errors, tariffs, baselines, targets |
| 4 | projects, tasks/milestones, templates, assessments, recommendations, document metadata, approvals, revisions |
| 5 | renewable systems, scenarios, batteries, versioned calculations, dispatch intervals |
| 6 | reporting periods, activity records, emission factor versions, emissions results, targets |
| 7 | assets, twins, model configurations, forecasts, alerts, provenance |
| 8 | report versions, notifications, support, feature entitlements, usage records |

Use UUID identities, explicit units, timestamps and organisation foreign keys.
Tenant-owned child relationships must enforce the same organisation in the
database, not just in UI selectors. Index tenant/date/meter/project lookups and
make deduplication constraints explicit. Save immutable calculation inputs,
algorithm versions, output records, factor versions and assumptions.

Enable RLS on every tenant table and private storage bucket. Enforce permissions
both server-side and in RLS. Scope owners, administrators, energy managers,
consultants, analysts and readers explicitly; permission labels alone are not
authorization. Create an organisation and its initial owner atomically with the
verified identity; never trust a submitted owner ID. Prevent self-promotion,
cross-tenant parent IDs and removal of the last owner.

Storage object names must be tenant-scoped, not public URLs. Authenticate each
download and authorize signed URL issuance. Validate file type/signature, size,
row count and spreadsheet formula handling. Never log raw documents, sessions,
credentials, form content or operational datasets.

## Engineering, data and AI boundaries

- Put pure, versioned engineering/financial functions outside UI components.
  Validate finite numbers, ranges, compatible units, missing inputs and zero
  denominators before saving results.
- Store interval boundaries as UTC instants plus organisation/site IANA time
  zones. Use actual interval duration; account for DST gaps/duplicates. Distinguish
  cumulative meter readings, interval energy and instantaneous/interval power.
- Save import previews and row-level errors before committing. Define duplicate
  behaviour explicitly; do not silently overwrite readings or discard bad rows.
- Tariffs need currencies, validity windows, local time-of-use periods and demand
  charges where applicable. Financial comparisons require consistent periods,
  discount assumptions and documented treatment of missing IRR/payback solutions.
- Renewable modelling starts with declared manual generation/irradiance inputs.
  Add weather providers only when configured, with sources and timestamps.
- Battery baseline dispatch must conserve energy, apply charge/discharge losses,
  respect power, SoC, interval duration and grid limits, and avoid simultaneous
  charge/discharge. Validate it before adding optimizers.
- No default real-world emissions factors without sources. Synthetic factors may
  exist only in isolated, clearly marked tests/demo fixtures. Keep location-based
  and market-based Scope 2 methodologies distinct and versioned.
- AI is optional and server-side behind a provider-independent interface. Start
  with rule-based analytics; do not label heuristics as trained forecasting.
  Restrict all retrieved context to the verified tenant and permitted records.
  No customer documents go to a provider until data-handling controls are set.
  Missing AI configuration must not break calculations or saved work.
- Export reports with data provenance, calculation/factor versions, assumptions,
  limitations and modelled-versus-measured labels. Prevent CSV formula injection
  and unsafe HTML/report content. Reports must be reproducible, not generated
  solely from unconstrained model text.

## Delivery gates (in requested order)

1. **Preservation and architecture:** route manifest, service mapping, corporate
   regression checks, documented security/data design. Do not claim tools exist.
2. **Identity and organisation foundation:** reviewed migrations/RLS, registration,
   verification, sign-in/out, password reset, organisation creation/switching,
   membership permissions, protected shell and second navigation. Test two users
   in separate tenants, direct ID/parent-ID tampering, expired sessions, refresh,
   unauthenticated writes and last-owner safeguards before proceeding.
3. **Energy Management:** site/meter CRUD, validated CSV/Excel import preview and
   persistence, consumption/cost/intensity calculations, tariffs, periods,
   baseline/target comparison and monthly report. Prove upload -> analysis -> save
   -> revisit -> export with actual test data isolated from customer data.
4. **Consulting and Auditing:** projects, questionnaires, private uploads, templates,
   schedules, findings, measures, savings/payback, client-visible approvals versus
   internal notes, revisions and an audit report. Test role/document boundaries.
5. **Renewables and Batteries:** manual-source feasibility inputs, self-consumption,
   import/export accounting, financial scenarios, baseline dispatch and comparisons.
   Test known balances, efficiency losses, capacity constraints, zero/invalid
   inputs, no-solution financial cases and saved reproducible outputs.
6. **Carbon:** source/versioned factors, activity imports/conversions, scope totals,
   explicit method choices, limitations, reduction scenarios and report records.
   Prove known unit conversions and synthetic-factor arithmetic without implying
   real-world factor validity or certification.
7. **Digital Energy:** assets/twins, historical ingestion, measured/modelled views,
   rule-based anomalies and conditional forecasts. Add permission-scoped AI
   interpretation only with configured provider controls. Test non-AI operation.
8. **Operations and release:** complete PDF/CSV/Excel reporting, notifications,
   support, entitlements/usage/admin controls, reproducible isolated demo seed,
   security/tenant/import/report tests and production configuration. A configurable
   entitlement is not a payment integration; obtain provider approval before one.

After each phase, run its unit/API tests, typecheck and production build. Run the
existing 22-route/four-language preservation checks when shared UI changes. Use
real browser tests for identity and critical data-saving flows; screenshot-only
evidence is insufficient for permissions or persistence.

## Configuration and deployment handoff

Use a **development Supabase project**, not a production dataset:

- `SUPABASE_URL`: project API URL.
- `SUPABASE_PUBLISHABLE_KEY`: publishable key (legacy anon key also requires explicit
  compatible SDK handling); this is not a service-role key.
- `SUPABASE_DB_URL`: secure connection URL for schema inspection/migrations only,
  preferably the session pooler appropriate to the environment's network support.

Request all values through the secure configuration form; do not paste them into
chat, commit them, or print them. No Supabase service-role credential is required
for the proposed normal request path.

Confirm deployment origin and email redirect allowlist before testing verification
or recovery links. Separate development and production configuration, inspect
existing target data, apply reviewed migrations deliberately, validate RLS/storage,
then verify readiness/health checks. Do not publish automatically or report
production readiness while any required security or workflow gate remains open.

## Current commands

- `pnpm --filter @workspace/geit-website run test:platform`
- `pnpm --filter @workspace/geit-website run check:localization`
- `pnpm --filter @workspace/geit-website run typecheck`
- `PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run build`

- `pnpm --filter @workspace/api-server run db:inspect:platform` — read-only
  inspection, including project-target matching and verified TLS.
- `pnpm --filter @workspace/api-server run db:migrate:platform` — explicitly apply
  the additive, checksummed identity migration; never run DDL on app startup.
- `pnpm --filter @workspace/api-server run test:pkce` — offline SDK-storage
  regression; does not send email or prove actual delivery.
- `pnpm --filter @workspace/api-server run test:platform` — isolated, synthetic
  development accounts, two tenants, API/RLS/permissions/refresh/sign-out checks,
  followed by fixture cleanup. Never run this against production.

The application uses the verified user's JWT for REST/RPC access. The database
owner URI is used only by explicit migration/inspection/test scripts. Public
account registration requires an email confirmation; the test script inserts
clearly synthetic verified users into the development Auth schema solely for
repeatable tests, without emailing third parties.

For Supabase Auth URL Configuration, allow the exact application origin's
`/app/auth/callback` and `/app/auth/callback?flow=recovery` redirect destinations.
PKCE links must be opened in the same browser that initiated them, before the
ten-minute verifier cookie expires. An additional confirmation page may be shown
by Supabase; an application login is not evidence an inbox flow worked.
`PLATFORM_ORIGIN` must be the explicit HTTPS origin in production; development
defaults only to the runtime development domain. Confirm the public domain
separately before publication. Workspace screens and the additional legal notice
are currently English-only, and app pages are noindex.

Private storage is now configured by a separate additive migration and covered
by real tenant-isolation tests. Engineering correctness, upload UI/processing,
imports, saved analysis and reporting remain later phases. The original legacy database remains untouched;
the public consultation form is still validation-only.
