# GEIT Energy DT: isolated staging preparation

## Status and authorisation boundaries

This change prepares source code, templates and an isolation protocol only.
No staging workspace was created, credentials entered, service restarted,
database contacted, migration applied, test executed, or application published.
Staging is **not ready or verified**. The example approval is deliberately false.

Obtain separate approval for:
1. Provisioning/configuring a new staging application and its databases.
2. Local checks/build/tests and starting its services for identity verification.
3. Applying migrations after identity verification.
4. Synthetic fixture writes and authenticated QA after schema/security review.

Do not run the commands below in the existing/live workspace. They are future
steps, not actions performed by this preparation.

## Architecture: a separate application, not a temporary environment switch

The source-only import package is prepared by `scripts/prepare-staging-source.py`.
See [staging-setup-guide.md](staging-setup-guide.md) for the step-by-step import
procedure. Its output is a prepared copy, **not** a remotely provisioned or
independently verified environment. Do not run it in the current workspace.

Create a **new Replit application/workspace** from reviewed source code only.
It must have its own application origin, Supabase project, Replit legacy
database, secrets, running services and signing key. Do not copy `.env` files,
Secrets, production configuration exports, customer records, Auth identities,
Storage bytes, database dumps, or `/tmp` fixture files.

Use the existing corporate frontend and Energy DT code unchanged. Both use the
same staging API routing as before; copying only the frontend and retaining a
live backend does not provide isolation. Keep this existing application,
`.replit`, managed workflows, Secrets and published deployment untouched.

Before importing or starting the separate staging copy, replace **that copy's**
`.replit` with `config/staging.replit.example`. Do this in a source-only export
or separate checkout before import; do not alter this application's `.replit`.
Do not use a copy operation that also transfers secrets or a live database.
Do not let import/post-merge automation run before reviewing its configuration.

### Existing shared settings and inheritance risks

| Existing setting | Risk / staging handling |
| --- | --- |
| `.replit` `[userenv.shared].SUPABASE_URL` | Pins the existing protected project. The staging template omits it; configure the new endpoint independently. |
| `.replit` `[postMerge]` → `scripts/post-merge.sh` | Script installs dependencies then runs `pnpm --filter db push`, a **legacy DATABASE_URL schema write**. The staging template omits this hook entirely. Do not invoke it during preparation. The original hook is unchanged. |
| `.replit` `[workflows].runButton = "Project"` | Can start inherited services before configuration review. The staging template omits automatic run selection; configure the separate copy's managed services only after review. |
| `.replit` deployment router/target, post-build store prune, runtimes, Nix channel | Not database credentials. Staging template retains compatible settings; publishing remains a separate approval. |
| Workspace/deployment Secrets | API URL/key/DB URI and signing key may be inherited by an unsafe copy. Re-enter independently in staging only; review development, shared and published settings separately. |
| Managed `DATABASE_URL` | A separate dependency from Supabase. Provision a **new empty staging Replit development database** in the separate application. Never assign or copy the existing managed URL. |
| Origin settings / frontend routing | Set an explicit staging `PLATFORM_ORIGIN`. Check that `/api` routes to the staging API, not the live service. Do not depend on development-origin fallback. |
| Approval and fixture files | Do not copy an approved manifest or retained test-account file. Create a new approval after independent review. |

Replit's managed database separation does not classify an external Supabase
connection. Neither NODE_ENV nor an application copy proves a remote target is
non-production. Current official references:
https://docs.replit.com/core-concepts/project-editor/app-setup/secrets
https://docs.replit.com/features/data-and-storage/development-and-production
https://docs.replit.com/teams/identity-and-access-management/manually-copy-projects

## Staging-only configuration

`config/staging.env.example` is documentation, **not a file to source**. Enter
values in the separate application's secure configuration tools. Do not put
credentials into source, shell arguments, screenshots or reports.

| Variable | Required value / handling |
| --- | --- |
| `GEIT_ENVIRONMENT` | `staging`; activates fail-closed startup validation and the staging identity endpoint. No value is set in the current workspace. |
| `SUPABASE_URL` | Exact `https://<staging-project-ref>.supabase.co`. The project display name is not its reference. |
| `SUPABASE_PUBLISHABLE_KEY` | That new project's publishable key, entered securely. No service-role key is required. |
| `SUPABASE_DB_URL` | That new project's direct or session-pooler PostgreSQL URI. Direct host: `db.<ref>.supabase.co`; supported pooler: `*.pooler.supabase.com`, user `postgres.<ref>`. URL-encode credentials. |
| `SESSION_SECRET` | Newly and securely generated independent random 32+ character secret. Keep stable and consistent between staging API and QA process. Never reuse the production key. |
| `PLATFORM_ORIGIN` | Exact dedicated staging HTTPS origin, no application path/query/credentials. |
| `DATABASE_URL` | Automatically supplied by provisioning the new staging Replit database. It must not identify either existing production data or the Energy DT Supabase database. Do not manually overwrite this managed variable. |
| `GEIT_TEST_SUPABASE_PROJECT_REF` | Independently confirmed staging reference: exactly 20 lowercase alphanumeric characters. Required in both API and QA processes. |
| `GEIT_STAGING_APPROVAL_FILE` | Path to a reviewed local approval JSON file available to both processes. Paths resolve from each process working directory; use the correct absolute path in each environment. |
| `GEIT_ALLOW_TEST_FIXTURE_WRITES` | Keep `no` or absent throughout preparation. No tool here enables it automatically. |
| `GEIT_AI_ENABLED` | Keep `false`; do not transfer optional provider credentials. |
| `PORT`, `BASE_PATH` | Preserve managed service values in the separate application. No hardcoded replacement. |
| `VITE_PUBLIC_SITE_URL` | Optional public-page SEO configuration, separate from API identity. Never use `VITE_*` for database/signing secrets. |

## Identity protocol and what it proves

1. `--candidate` validates local formats, rejects the known protected Supabase
   reference and computes non-secret target fingerprints **without connecting**.
   A database target fingerprint hashes host, port, user and database, never
   its password. URI parameters that could override the target are rejected.
2. An operator independently verifies in the Supabase dashboard that the new,
   dedicated non-production project's reference, endpoint and key belong
   together. Do not use the deleted `geit-energy-saas-staging` project or any of
   its credentials. Separately verify that the legacy database was newly
   provisioned in the staging application and contains no customer data. Verify
   the application origin. Do not read or transfer production credentials to
   perform this review.
3. Copy `config/staging-approval.example.json` to a local
   `config/staging-approval.json`. Fill the reviewed identity fields from the
   candidate, assign a new non-secret random 32-hex `isolationId`, and only
   after independent review set `independentlyVerified: true`.
   The actual approval is git-ignored; the template cannot authorise anything.
4. `--local` checks effective environment against that reviewed approval.
5. In explicit staging mode only, `GET /api/staging-isolation?challenge=<nonce>`
   returns a fresh HMAC response binding project, application origin, both
   database target fingerprints, publishable-key fingerprint and isolation ID.
   It uses the independent staging SESSION_SECRET, never returns that key,
   sets no-store, and contacts no database, Auth or Storage service.
6. `--api` checks a fresh random challenge against the **actual API at the
   approved origin**, without redirects or user cookies. A wrong API, signing
   key, project, DB target, publishable key or approval fails the comparison.
   The fixture harness repeats this check before connections, including cleanup.

Normal/non-staging runtime behaviour is unchanged: the new endpoint returns 404,
and existing `/api/healthz` remains a process-health check.

**Limits:** an approved file is an operator decision, not evidence by itself.
The known-project denylist is supplementary, not a list of every production
project. A fingerprint or HMAC proves configuration consistency, not actual
database contents, valid credentials, provider-side key association, SQL schema,
RLS behaviour, TLS configuration of the legacy pool, or backup readiness.
Those require separately approved verification. Password rotation does not
change a database target fingerprint; signing-key mismatch does fail the API
challenge. Use distinct secure randomly generated signing keys.

The existing Supabase SQL helper verifies database TLS using the official CA
when later authorised to connect. This preparation makes no SQL connection.
Review provider-required TLS options for the separate legacy database as part
of provisioning; the identity endpoint does not inspect encryption in transit.

## Later verification commands — NOT executed

After approval to configure the separate staging workspace (Node 24 as declared
in `.replit`), with fixture writes still disabled:

```sh
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --candidate
# Independent dashboard/provisioning review, then prepare the local approval.
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --local
```

After **separate approval** for local checks/builds and service startup, build
and start only the staging copy using its managed API and website services.
Do not register or start duplicate services in the existing application.
Then:

```sh
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --api
```

`--candidate` and `--local` perform no network calls. `--api` makes only the
unauthenticated HTTPS identity request and no SQL/Auth/Storage requests.
All three refuse preparation while fixture writes are enabled.

The approval JSON must exist at its configured path in the running API
environment as well as the QA environment. It is non-secret but intentionally
not committed or automatically copied. A later staging publish must explicitly
include/provision it and verify its path; missing files prevent staging startup.
Do not publish now. Do not open an authenticated `/api/platform/session` as a
read-only identity probe: profile synchronisation can write.

## Supabase settings still required

After the isolation review, configure the staging project's email/password
provider and email confirmation, Site URL and exact redirects:
`<staging-origin>/app/auth/callback` and
`<staging-origin>/app/auth/callback?flow=recovery`.
Review password policy, allowed test inboxes, delivery/rate limits, session
settings, API availability, backup retention/PITR and Storage-byte recovery.
No real users, production factors, uploaded files or customer rows are copied.

After **separate migration approval**, follow `geit-foundation-setup.md` and
`production-deployment.md` to apply migrations 001–008 with the repository runner,
then inspect checksums, RLS, RPC grants and bucket privacy with `audit:database`.
Do not run `db push`, reset commands or the post-merge hook for Supabase.
These migrations do not prepare the legacy enquiry table. That table requires
its own separately approved legacy-database schema step if its API is tested.

Migration 002 creates `geit-private-documents` with tenant Storage policies,
10 MiB limit and PDF/PNG/JPEG/CSV MIME restrictions. Do not manually pre-create
the bucket. All 15 application tenant tables, identity/membership RPCs and
calculation permissions come from the reviewed migrations.

**Important:** the migration runner is not guarded by the fixture approval
flag or the new API challenge. Do not invoke it until target review and a
separate migration approval are complete. No migration command was run here.

## Verification checklist / next approval gates

- [ ] Separate staging application created from reviewed source only.
- [ ] Staging `.replit` has no protected endpoint or automatic db-push hook.
- [ ] No copied production Secrets, customer data, Auth users or Storage files.
- [ ] New Supabase reference/endpoint/key independently checked.
- [ ] New managed legacy database independently confirmed non-production.
- [ ] New random signing secret; explicit staging origin; correct `/api` routing.
- [ ] Fixture-write flag remains disabled.
- [ ] Candidate fingerprints reviewed, not automatically approved.
- [ ] Local approval JSON prepared and available at both runtime paths.
- [ ] Local approval checks pass (pending approval to execute).
- [ ] Build/type checks and added offline regression tests pass (not run).
- [ ] Staging API challenge verification passes (not run).
- [ ] Separate migration approval, schema apply and metadata/RLS audit.
- [ ] Separate fixture-write approval and actual authenticated QA.
- [ ] Real inbox confirmation/recovery and all-role tenant isolation checked.
- [ ] Synthetic cleanup completed and fixture-write flag disabled again.

Integration suites share one fixture file: run sequentially, not concurrently.
Do not start another suite while browser tests use retained fixtures. Cleanup
also requires the API identity check; if the staging API is unavailable, retain
the fixtures and restore verified staging connectivity rather than bypassing
the safety gate.

See `qa-staging-workflow.md` for the authenticated QA commands and remaining
acceptance evidence. This preparation makes **no production-readiness claim**.
