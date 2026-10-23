# GEIT production deployment and recovery runbook

**Do not publish until the audit release gates are closed.** This is a procedure, not evidence that deployment or recovery has been tested.

## 1. Configuration

Use workspace Secrets for credentials and production configuration for non-secret values. Never paste keys into source, chat, browser bundles or command-line arguments.

| Name | Purpose | Observed status |
|---|---|---|
| `SUPABASE_URL` | Existing project's HTTPS API endpoint, server-side | Present |
| `SUPABASE_PUBLISHABLE_KEY` | Existing project's public/publishable API key; JWT/RLS still enforce access | Present |
| `SUPABASE_DB_URL` | Privileged migration/metadata-audit connection; never expose to clients | Present |
| `SESSION_SECRET` | Stable server-side engineering and energy result authentication key; securely generated, at least 32 characters in production | Present; compiled production startup passed its length check |
| `PLATFORM_ORIGIN` | Exact published HTTPS origin, e.g. `https://your-confirmed-domain`; no path, query, userinfo or fragment | Not set in the inspected development shell; independently verify production settings, do not infer them from development |
| `VITE_PUBLIC_SITE_URL` | Confirmed public/canonical site URL, needed at frontend build time | Not set in the inspected build shell; sitemap generation skipped |
| `DATABASE_URL` | Existing Replit-managed legacy corporate-enquiries database dependency, eagerly imported by the API | Runtime-managed; verify production provisioning |
| `PORT` | Service listen/build port | Managed by artifact services; do not hardcode a public host |
| `BASE_PATH` | Frontend artifact mount | Existing website is `/` |
| `NODE_ENV` | Runtime mode | API production service explicitly sets `production` |
| `LOG_LEVEL` | Optional log level | Default `info`; avoid sensitive debug payloads |
| `GEIT_ALLOW_TEST_FIXTURE_WRITES` | Test-process opt-in only | Unset or `no` in API deployments; production API startup rejects any other non-empty value |

Do not replace the existing Supabase database or repoint `DATABASE_URL` at it. The legacy corporate database and SaaS database are separate dependencies. Do not run a blind schema push against either production database.

Optional AI only: configure `OPENAI_API_KEY`, `GEIT_AI_MODEL` and `GEIT_AI_ENABLED=true` after a provider/privacy review and a real consent-gated integration test. These are not required for accounting, twins or exports.

No billing credentials are required while billing is disabled. Select/configure a real provider and verify its webhook integration before adding or enforcing paid entitlements.

Keep `SESSION_SECRET` backed up in an approved secret vault and stable across instances/restarts. Changing it invalidates historical authenticity checks. Plan a versioned key migration before rotating it; never re-sign unverified records blindly.

## 2. Supabase and recovery preparation

1. Identify the intended production Supabase project and ensure production API/key/DB settings refer to that same project. Prefer a separate staging project for tests.
2. In Supabase Auth, set Site URL to the real HTTPS website origin. Allow the exact `/app/auth/callback` route and the recovery callback with `?flow=recovery`; follow Supabase's redirect allowlist matching rules. Do not allow unrestricted wildcard redirects.
3. Configure and verify email delivery. In the same browser, register a real account, follow its actual inbox verification link, sign in, request recovery, follow its inbox link, update the password and verify old/new password behaviour. Do not replace this with seeded confirmed accounts.
4. Inspect **Supabase Database > Backups**. Confirm the actual plan's retention/PITR availability, restore points and agreed RPO/RTO; no plan or retention was inferred in this audit.
5. Back up Storage object bytes separately, with object keys/metadata and tested permissions. Database backups contain Storage metadata, not object bytes. Use encryption, restricted access and defined retention for both.
6. Take a verified pre-migration backup. Restore into a separate approved recovery environment; do not restore over the live project as a test. Verify auth identities, memberships, RLS, real file bytes and signed historical reports. Record recovery time and data-loss window.
7. Store the application signing key separately in the approved secret vault so restored report signatures can be checked.

Official backup limitations: https://supabase.com/docs/guides/platform/backups . Replit-managed database recovery does not automatically establish a backup for this external Supabase database.

## 3. Apply reviewed migrations

In a controlled environment with the intended production connection securely configured:

```sh
pnpm --filter @workspace/api-server run db:inspect:platform
# Review the target and backup first.
pnpm --filter @workspace/api-server run db:migrate:platform
pnpm --filter @workspace/api-server run audit:database
```

The runner uses verified TLS, an advisory lock, a transaction and SHA-256 migration checksums. Existing applied files must not be edited. The current repository has six migrations; this audit added no schema migration. Inspect every future additive migration before applying it.

The runner obtains the official Supabase database CA over verified HTTPS. Do not bypass TLS with `rejectUnauthorized=false`.

**Approval boundary:** the migration command above writes schema and migration
ledger entries. It was not run during finalization and must not be put in build
or startup commands. First review and apply to independently verified staging;
production application requires separate approval, a verified backup and a
compatible release plan. The inspect/audit commands are read-only metadata checks,
not proof that real cross-tenant access attempts have been denied.

## 4. Build and publishing configuration

Run all commands in the audit reproduction section. Resolve any failures before release.

The existing artifact settings already define:

- **Website:** production build `pnpm --filter @workspace/geit-website run build`; static directory `artifacts/geit-website/dist/public`; SPA rewrite `/* -> /index.html`; root mount `/`. Supply `PORT=18414` and `BASE_PATH=/` when running that build manually.
- **API:** production build `pnpm --filter @workspace/api-server run build`; run `node --enable-source-maps artifacts/api-server/dist/index.mjs`; `NODE_ENV=production`, managed service `PORT=8080`; startup health `/api/healthz`; API route prefix `/api`.
- **Design sandbox:** development-only configuration, not a customer application production server.

For an all-workspace manual build:

```sh
pnpm install --frozen-lockfile
pnpm run test:local
NODE_ENV=production PORT=18414 BASE_PATH=/ pnpm run build
pnpm --filter @workspace/api-server run test:production
```

The last command starts a temporary compiled API in production mode on a local unused port. It verifies startup, JSON errors, unauthenticated denial, no wildcard platform CORS, authentication throttling and fail-closed missing-origin/fixture-write startup. It does **not** prove a published-domain flow.

Outside the managed artifact process, the equivalent API startup is:

```sh
# Configure secrets securely first; never paste their values into this command.
NODE_ENV=production pnpm --filter @workspace/api-server run start
```

Set `PORT` in the service environment and route `/api/*` to this process; serve
the website's `dist/public` as static files with the existing SPA fallback.
`/api/healthz` is process liveness, **not Supabase connectivity or release
readiness**. Do not use `pnpm run dev` as the production startup.

Staging may also compile with `NODE_ENV=production`, but must additionally set
`GEIT_ENVIRONMENT=staging` and the independently approved staging configuration.
Keep fixture-write opt-in unset/`no` in the staging API; set it only in a separately
approved test process after API identity verification. The current workspace is
not certified isolated staging and must not be used for remote fixture tests.

In Replit Publishing:

1. Confirm the intended production secrets, public origin and build-time canonical URL.
   On first publish, the Publishing UI suggests a `.replit.app` subdomain that you can modify. Confirm that intended domain before setting the origin/build URL. Check deployment secrets as well as development/project secrets; presence in the editor alone is not proof of production configuration.
2. Review publishing visibility, capacity, routing and intended geography before the first publish. Do not use a development Vite server as the production API.
3. Configure shared rate-limit/edge enforcement before multiple API instances. Current in-memory counters are not a global quota.
4. Publish through the Publishing UI only after the release gates are approved. This audit did not publish the project.
5. Obtain the actual published URL from Publishing; do not substitute the `.replit.dev` preview URL. Verify it matches `PLATFORM_ORIGIN` and the Auth allowlist.

Publishing reference: https://docs.replit.com/features/projects-and-artifacts/projects . Production service settings live in artifact configuration, not a replacement root run command.

## 5. Post-publication acceptance

- `/api/healthz` returns JSON 200; `/api/route-that-does-not-exist` returns JSON 404, not the website HTML.
- Reload `/app/energy-management` directly: the SPA loads, and signed-out users do not see private data.
- Complete real email verification and recovery, then inspect Secure/HttpOnly/SameSite cookie behaviour on the actual HTTPS domain.
- With two separate staging/customer-approved test organisations, verify real record/file/report isolation through both API and direct Supabase access.
- Import a small known CSV and Excel workbook; verify quantities, units, costs, immutable results and downloads.
- Verify forecast withholding on insufficient data, configured history forecasts and report provenance.
- Verify rate limits across two instances and a restart; confirm monitoring/alerting sees safe error categories without tokens, bodies, raw provider failures or email-link codes.
- Check public canonical URLs, sitemap and HTTPS/security headers after building with the confirmed domain.
- If billing is later enabled, validate real signed webhooks, replay/idempotency, tenant mapping, failed payments and access revocation. Never activate a subscription from a browser success URL.
- Keep AI disabled until its separately consented live-provider and privacy tests pass.

## 6. Incident and rollback

For a code-only incident, return to the last known working published build while retaining compatible additive schema. A code checkpoint is not a Supabase backup. Do not reverse migrations or drop customer tables casually. For data loss, use the approved isolated recovery procedure and explicit restore approval; coordinate downtime. After recovery, verify RLS, files, auth and report signatures before reopening access.

Rollback checklist, requiring operator approval before deployment changes:

1. Record the failing application release, configuration version and migration
   ledger; preserve safe diagnostic logs without secrets or request bodies.
2. Confirm the previous build supports the current additive schema and saved
   result/signature format. Do not downgrade the schema to make old code fit.
3. Restore only that approved application build and its compatible configuration.
   Keep the stable `SESSION_SECRET` and tenant permissions intact.
4. Check liveness, real staging acceptance and representative signed reports
   before reopening traffic. If code rollback is incompatible, keep access
   restricted and prepare an approved forward fix instead.
5. Treat database/Storage restore as a separate recovery operation requiring
   explicit approval and a verified isolated restore drill. No automated down
   migration, production reset, signing-key rotation or live restore ran here.
