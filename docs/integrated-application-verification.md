# GEIT corporate website + Energy DT — integrated verification

Date: 2026-10-23. **Production sign-off: NO-GO.**

This assessment follows `energy-dt-stabilization.md` and
`production-deployment.md`. It does not supersede their unresolved release gates.
No production variables, domain, database records, migrations or remote Git
configuration were changed. Nothing was published or pushed.

## Change made

Successful password sign-in previously invalidated only the session query.
Cached energy/workspace records from a previous principal remained in memory.
The new UI regression test detected this retention. Sign-in and email callback
completion now clear the query cache before navigation, cancelling old queries
and forcing the workspace to obtain a fresh session and tenant data.

This is defense against stale cross-account state, not a claim that the old UI
allowed unauthorized database access. Failed sign-in and temporary session
outages do not falsely log out the current account or claim success.

Added an isolated JSDOM/Vite test harness using the actual React components,
generated API client and React Query cache. Its response adapter denies external
requests; no auth accounts, fixtures, database connections or emails are created.
Ten interaction scenarios plus their parent test are reported as 11 test nodes.
The harness is only imported from tests and is not part of the production app.

## Function-by-function evidence

| Function | Local evidence | Real service verification |
| --- | --- | --- |
| Corporate navigation, services, images, footer and language support | Existing 56 website checks and four-language catalogue/route checks pass; these combine source contracts and component interactions, not a browser visit to every page | Published-domain behavior not tested |
| Registration | UI password validation and API-503 display pass; no false registration-success state | Real account creation, verification email and activation blocked |
| Login | Required-field validation, focus/ARIA errors, generated endpoint, CSRF header, error display, success navigation and old-cache clearance pass with synthetic responses | Real credentials and Supabase session creation blocked |
| Logout | UI submits generated signout request, clears private cache and navigates to sign-in with synthetic session responses | Real refresh-token invalidation blocked |
| Session persistence | Existing server outage tests preserve legitimate cookies; UI outage/retry passes without showing private content | Persistence across actual browser reload/refresh/expiry blocked |
| Password recovery/update | Recovery endpoint/validation, missing callback code, callback URL scrubbing, cache clearance, mismatch and expired-session errors pass locally | Inbox delivery, real PKCE round trip, actual password change blocked |
| Protected routes | Signed-out and foreign-organisation UI gates do not mount private children; local HTTP tests reject unauthenticated access | End-to-end real-session redirects/expiry blocked |
| Organisation creation, membership and account settings | Implemented routes/forms reviewed; HTTP tenant/role and forged ownership checks pass with a synthetic provider | Persistent create/update/delete, membership changes and concurrent updates blocked |
| Tenant separation and roles | Local HTTP adapter tests reject foreign organisations, reader mutations, foreign report IDs and injected identifiers; own-tenant reads retain org filters | Actual two-user/two-tenant DB RLS, direct REST/RPC and Storage attempts blocked |
| Energy ingestion | CSV/XLSX parsing, units, malformed data and upload-security tests pass | Import preview/commit, persistent readings, duplicates and partial-failure recovery on Supabase blocked |
| Energy calculations | Unit, timezone/DST, tariff, coverage, provenance and UTC optimization regressions pass | Saved analysis against actual imported staging records blocked |
| Engineering, carbon and digital twin | Existing baseline engines, emission factors, validated scenarios, forecasting withholding, anomaly/provenance and export tests pass | Persistent project/scenario workflows, charts and downloads backed by staging records blocked |
| Projects and Reports | Index/filter/link tests pass; prior synthetic browser pass covered org switching, demos and module-error retry on desktop/mobile | Reopening actual stored signed reports blocked |
| API and production startup | 10 compiled local-server checks pass, including authorization/error handling and fixture-write startup refusal | Published reverse proxy, cookie and intended-domain behavior not tested |
| Private storage | Migration/policy and guard implementation retained; no bypass introduced | Private upload/download/delete and cross-tenant object access blocked |
| Optional AI and other integrations | Existing adapter tests only; no real provider integration enabled in this work | Live AI, weather/grid/meter connectors and payment webhooks not verified |

Synthetic responses exercise frontend state, not RLS or provider authenticity.
Pure calculation tests compute results from synthetic inputs; they are not
hardcoded customer outputs. Production calculation paths still use records and
validate saved-result signatures.

## Actual final checks

- `pnpm run test:local`: **158 passed, 0 failed**
  - Backend safe suite: 88
  - Existing website suite: 56
  - Reports unit suite: 3
  - New auth interaction suite: 11 test nodes
- Sandbox discovery test: **1 passed, 0 failed**.
- Localisation: en/fr/rw/sw, 22 route checks each, 639 source entries passed.
- Root production build, including TypeScript and all workspace artifacts: passed.
- Compiled production API smoke: **10 passed**.
- Actual development proxy checks without cookies: `/api/healthz` returned 200,
  `/api/platform/session` returned 200, and the protected energy endpoint
  returned 401 as expected. The Energy Management preview showed only the
  signed-out gate with no private content or browser runtime errors. These do
  not authenticate a user or establish production-domain behavior.
- Source/build secret-pattern check: 172 files, zero common private-key literal
  findings. No credential values were printed.
- No standalone lint script is configured.
- No dependency change in this pass; the preceding unchanged-lockfile audit
  reported zero known vulnerabilities. Source secret-pattern checks are limited
  pattern checks, not proof that every possible secret or data leak is absent.

## Blocked checks — not passes

### Supabase staging endpoint investigation (2026-10-23; updated)

The replacement staging project is reported as `geit-energy-dt-staging`, with
reference `hnowcjxvhgdecblkdnch`. That reference has the expected 20-character
lowercase-alphanumeric format. The prepared staging source and this workspace
do **not** contain a configured staging `SUPABASE_URL` or
`GEIT_TEST_SUPABASE_PROJECT_REF`; both values remain blank in the staging
environment template. This workspace also has no separate staging runtime
environment. Therefore, I could not compare a configured staging URL against
the supplied reference or verify the project display name in its dashboard.

For a non-destructive connectivity probe only, I used the canonical Supabase
hostname derived from the supplied reference:
`https://hnowcjxvhgdecblkdnch.supabase.co`. Google DNS and Cloudflare DNS both
returned DNS status 0 with A records; the local resolver also resolved the host.
No AAAA records were returned, which does not prevent IPv4 access. Unauthenticated
GETs to `/auth/v1/health` and `/rest/v1/` each returned HTTP 401. These results
show that the derived hostname resolves and an endpoint responds; the 401s are
not authenticated tests and do not establish that the endpoint belongs to the
named staging project. No credentials or database were used.

The earlier NXDOMAIN/ENOTFOUND finding applied to the different endpoint in the
original workspace's shared `.replit` setting. That endpoint is still protected
and denylisted by the isolation guard; it was not changed and must not be used
as staging. The staging `.replit` template intentionally has no Supabase
endpoint, and the original workspace's environment is not evidence of staging
configuration.

The deleted display name `geit-energy-saas-staging` remains in staging
documentation, not in the staging URL/ref fields. References were found in
`docs/staging-setup-guide.md`, `docs/staging-isolation.md`, their copies in
`generated-artifacts/geit-energy-dt-staging-source/docs/`, and the packaged
`generated-artifacts/geit-energy-dt-staging-source.zip`. The old name also
appeared in the earlier version of this report and is retained here only as
historical context. The protected project reference in the original `.replit`
and in the isolation denylist/tests is separate; there is no evidence in the
available staging files that it was the deleted project's reference.

**Next required action:** an operator with access to the Supabase dashboard must
confirm that project `geit-energy-dt-staging` is active and that its displayed
Project URL and reference match the supplied values. Then enter the verified
`SUPABASE_URL` and `GEIT_TEST_SUPABASE_PROJECT_REF` in the separate staging
workspace's secure configuration only. The expected URL from the supplied
reference is `https://hnowcjxvhgdecblkdnch.supabase.co`; do not enter it unless
the dashboard confirms it. Keep the original workspace `.replit`, secrets and
production configuration unchanged. After staging configuration is populated,
repeat the staging-specific checks and create a reviewed approval manifest.

The endpoint is reachable, but project ownership/name and staging workspace
configuration remain unverified. The independent approval file and staging
environment are still absent here, so the application is **not independently
verified isolated staging**. Fixture writes remain disabled. No migrations,
authentication, CRUD, or RLS tests were run.

The four remote integration harness variants were intentionally not run. No SQL,
fixture operations, schema migration, customer upload or real account operation
was attempted. Local success must not be reported as real Supabase success.

## Manual prerequisites before sign-off

1. Have the staging project owner confirm that the replacement project is active
   and that its dashboard URL/reference match. Configure those values only in the
   separate staging workspace. Do not reuse or change the original workspace's
   protected `.replit` endpoint.
2. Independently provision/approve staging Supabase, its separate legacy database,
   signing secret, exact origin and approval file using `staging-setup-guide.md`.
3. Keep fixture-write flags off in API deployments. After API/test identity checks
   pass, obtain explicit staging migration/fixture approval and run the documented
   authenticated platform, energy, engineering and sustainability harnesses.
4. Repeat the full real-browser journey using synthetic staging users in two
   organisations and all roles, including inbox verification/recovery, CRUD,
   imports, charts, signed exports, session lifecycle and direct cross-tenant
   REST/RPC/Storage denials.
5. Verify backup/file recovery, distributed rate limits, actual HTTPS cookie/proxy
   behavior and load capacity before production sign-off.
6. Confirm production `PLATFORM_ORIGIN` independently of development. Supply the
   already-approved domain as build-time `VITE_PUBLIC_SITE_URL`; the shell build
   currently skips sitemap generation. Existing bundle-size/source-map warnings
   remain, without a compilation failure.

## Files changed in this verification pass

- `artifacts/geit-website/src/platform/auth-pages.tsx`
- `artifacts/geit-website/tests/helpers/platform-runtime.mjs`
- `artifacts/geit-website/tests/platform-auth.interactions.test.mjs`
- `artifacts/geit-website/package.json`
- `package.json`
- `docs/integrated-application-verification.md`
- `docs/energy-dt-stabilization.md`

Work stops here pending the configuration/approval gates. Deployment, destructive
operations and GitHub pushes still require separate approval.
