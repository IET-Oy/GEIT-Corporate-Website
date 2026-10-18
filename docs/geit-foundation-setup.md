# GEIT SaaS Phase 1 — identity, organisations and private storage

## Scope and current implementation

This is the foundation requested as **Phase 1** in the current brief. The older
multi-phase architecture plan called the same identity milestone Phase 2.
The corporate React/Vite website, its seven navigation links, public pages and
disconnected consultation form are preserved. There is no Next.js rewrite.

The foundation uses actual Supabase Auth, PostgreSQL and Storage. There is no
development login bypass, fake account endpoint or service-role runtime client.
The application shell starts at `/app`; its account pages include registration,
sign-in, recovery and a PKCE callback. Organisation creation, switching, settings
and membership management are implemented. Business-analysis modules are not
part of this foundation and remain marked Planned.

## Required configuration

Configure through the workspace's secure configuration tools, not source files.
Never paste passwords, database connection strings, tokens or keys into chat.

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `SUPABASE_URL` | Full HTTPS project API URL | Non-secret project endpoint; server configuration |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable key | Server-side SDK initialization; not a service-role key |
| `SUPABASE_DB_URL` | PostgreSQL owner connection URI, preferably session pooler | Secret; explicit migration/inspection/development tests only |
| `PLATFORM_ORIGIN` | Exact HTTPS origin serving the application, without a path | Required explicitly for production; controls CSRF and auth redirects |
| `PORT` | Managed service listening port | Provided by the artifact workflow |
| `BASE_PATH` | Website deployment base path | Existing managed website workflow value |
| `DATABASE_URL` | Existing legacy enquiry database | Preserve; not used for SaaS data and not migrated by these scripts |

Development uses the managed `REPLIT_DEV_DOMAIN` origin when `PLATFORM_ORIGIN` is
unset. Production must explicitly set `PLATFORM_ORIGIN`; do not point it at a
development preview. No Supabase service-role key is needed. `SESSION_SECRET`
is not used to sign Supabase sessions. Do not expose the database URI through any
`VITE_` setting. `VITE_PUBLIC_SITE_URL`, when the public website domain is
confirmed, separately controls corporate canonical/sitemap generation.

The database connection script checks that the database project matches the API
project and verifies TLS using Supabase's official CA, fetched over verified
HTTPS. It does not disable certificate verification or print connection details.
The session-pooler username must be `postgres.<project-reference>`; a direct
connection uses `db.<project-reference>.supabase.co`. Network access to Supabase
and its official certificate download host is required for migration scripts.

## Setup steps

1. Use a **development Supabase project**. Keep production credentials separate.
   Enter the variables above; replace password placeholders and URL-encode
   special password characters in the database URI.
2. In Supabase Auth, enable email/password registration and email confirmation.
   Configure the Site URL to the intended application origin. Add these exact
   redirect destinations using that origin:
   - `/app/auth/callback`
   - `/app/auth/callback?flow=recovery`
   Avoid wildcard production redirect allowlists.
3. Review the additive SQL files in `artifacts/api-server/migrations/`.
   Inspect the target before applying them:
   ```sh
   pnpm --filter @workspace/api-server run db:inspect:platform
   pnpm --filter @workspace/api-server run db:migrate:platform
   ```
   The migration runner uses a transaction, advisory lock, ordered SQL files,
   an applied-version ledger and SHA-256 checksums. Re-running it skips applied
   migrations; editing an applied migration causes a failure. It does not reset
   databases, touch the legacy database, or run DDL automatically on app startup.
4. Restart the existing API and website managed workflows. Do not create
   replacement/duplicate services.
5. Open `/app/register`, register an account and open its confirmation email in
   the **same browser**, within the ten-minute PKCE cookie lifetime. Sign in,
   create an organisation and open Organisation Settings.
6. A second person registers and verifies their own account first. An owner can
   then add that person's email and select a role in Organisation Settings.
   There is no invitation-email feature. Membership updates take effect from
   database-backed permissions, not client-submitted role claims.
7. Verify the recovery email round trip in the same browser, then sign out and
   sign in with the new password. These real-inbox steps are **not covered by
   seeded development accounts** and remain unverified until actually performed.

Supabase handles account emails. Delivery configuration, provider restrictions
and rate limits must be checked for the intended environment. Do not assume
that an HTTP success proves email delivery or that a successful seeded login
proves the redirect allowlist is correct.

## Tenant and permission model

- `geit_profiles`: account ID and display name; visible only to self or members
  of a shared organisation.
- `geit_organisations`: names, IANA time zones and IDs; visible only to members.
- `geit_memberships`: composite organisation/user identity and one of six roles.
- `geit_audit_events`: administrative events; readable by tenant owners/admins.
- `geit_schema_migrations`: private migration ledger, with no API-role grants.

All four tenant tables have RLS enabled. Normal database writes are restricted
to permission-checking RPCs; direct membership insertion/promotion is denied.
The first owner and organisation are created atomically from `auth.uid()`.
Role-changing RPCs serialize changes per organisation and prevent removing or
demoting the final owner. Client-provided owner IDs are never trusted.

| Role | Read own tenant / files | Edit organisation | Manage memberships | Upload files | Delete files |
| --- | --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Yes | Any in tenant |
| Administrator | Yes | Yes | No | Yes | Any in tenant |
| Energy manager | Yes | No | No | Yes | Own uploads |
| Consultant | Yes | No | No | Yes | Own uploads |
| Analyst | Yes | No | No | Yes | Own uploads |
| Reader | Yes | No | No | No | No |

These are foundation permissions, not claims that future service workflows are
implemented. Role labels do not grant access to another tenant.

## Private Storage configuration

Migration `002_private_storage.sql` creates `geit-private-documents` with
`public=false`, a **10 MiB per-file limit**, and only PDF, PNG, JPEG and CSV MIME
types. It fails rather than silently adopting a pre-existing conflicting bucket.
It does not modify unrelated buckets or policies.

Object keys must be:

```text
<organisation-uuid>/<random-document-uuid>.<pdf|png|jpg|csv>
```

No personal information or original filenames belong in object keys. Use
`privateDocumentKey()` and `privateDocuments()` from the server storage helper
after obtaining the verified request identity. Bytes stay in Supabase Storage,
not PostgreSQL table columns. RLS independently checks current tenant membership
for each operation. Membership removal therefore removes ordinary Storage access.
There is no UPDATE policy: overwrites, upserts and moves are intentionally denied.

Public URL access is denied. A user cannot list, download, mutate or sign a URL
for another tenant's objects. For future document features, prefer authenticated
downloads; a signed URL intentionally grants its bearer access until expiry, even
if that member is later removed. Do not expose long-lived signed links as a
substitute for current membership checks.

This phase configures and tests storage infrastructure; it does **not** add a
document-upload screen or document-processing feature. Before building intake,
validate bytes/signatures, quotas and content in server-side processing. MIME
restrictions alone are not malware scanning or proof of file format. Do not serve
untrusted content inline or process CSV formulas without separate validation.

## Session and request protections

The server verifies accounts with Supabase, then queries REST/RPC/Storage using
that user's JWT. It never uses the owner database URI or a service-role credential
for ordinary requests. Access/refresh and temporary PKCE cookies are HttpOnly,
Secure on HTTPS and emitted with SameSite=Lax. Tokens are not stored in browser
localStorage/sessionStorage. Supabase SDK session storage is request-local.

Write requests require both the exact application Origin and
`X-GEIT-Request: 1`. Platform endpoints have no wildcard CORS allowance. The API
validates request bodies, rate-limits writes and uses no-store responses. Logs
exclude request bodies, cookie/authorization values and query strings containing
codes. The development iframe proxy can rewrite SameSite to None; explicit
Origin/header CSRF checks must remain in place.

## Reproducible verification

With both existing workflows running and development variables configured:

```sh
pnpm --filter @workspace/api-server run test:platform
pnpm --filter @workspace/api-server run test:pkce
pnpm --filter @workspace/geit-website run test:platform
pnpm run typecheck
PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run check:localization
PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run build
```

The port above is the current website workflow's port; use its managed value if
changed. API integration tests exercise the real development preview and real
Supabase Auth, REST, RPC and Storage services.

The integration script creates isolated synthetic verified Auth users in the
development database, two tenant organisations and small file fixtures. It uses
normal password sign-in and user JWTs for the tested operations. It does **not**
use an admin/service-role token to perform the access checks. Fixture provisioning
uses the explicit owner connection; this is not a production login bypass.
Never run the integration script against a production project.

Tests prove unauthenticated and cross-origin write denial, validation, actual
sign-in, tenant-isolated organisations/memberships/profiles/audit events, direct
REST/RLS denial, last-owner safeguards, reader restrictions, private file upload
and read, denied cross-tenant list/download/sign/upload/overwrite/delete,
anonymous/public denial, malformed keys and MIME rejection, session refresh,
invalid-session failure, invalid callback handling and sign-out.

Fixtures are removed after the run: bytes via the Storage API first, followed
by synthetic organisations and Auth users. `--keep` explicitly retains them for
browser checks; then run:

```sh
cd artifacts/api-server
node scripts/test-platform.mjs --cleanup
```

The offline PKCE regression mocks provider responses and does not send email.
It verifies the SDK cookie-storage contract, not real inbox delivery.

## Known release gates

Real confirmation/recovery email round trips and redirect allowlists still need
inbox-based verification. The existing browser pass exercised signed-in settings,
organisation switching, persistent edits, reader access, sign-out and responsive
layouts; no new authentication UI was introduced in the storage completion.
Legal/processing terms and retention/deletion procedures require review before
production. Workspace screens are English-only with an explicit notice; the
corporate translations remain labelled drafts awaiting human review.

The production build currently reports bundle-size and tooltip sourcemap
warnings, and sitemap generation waits for a confirmed public domain. This
foundation is not a claim of production readiness or completion of later modules.
