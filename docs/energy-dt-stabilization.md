# GEIT Energy DT — stabilization and release assessment

Assessment date: 2026-10-23.

The subsequent [integrated application verification](integrated-application-verification.md)
adds auth-cache isolation fixes and current per-function evidence. Its final
local test count is 158 core tests plus one sandbox test; live-service release
gates remain unresolved.

**Release decision: NO-GO for production sign-off.** Local checks pass, but the
configured Supabase API hostname does not resolve (`ENOTFOUND`), database
metadata verification could not complete, and staging isolation is not approved.
Previous audit results are historical evidence, not current verification.

## Implemented in this pass

- Replaced the Projects and Reports placeholder with a tenant-selected index of
  saved Energy Management analyses and the six engineering/sustainability
  modules' projects and scenarios.
- Reused existing authenticated APIs, React Query keys, workspace membership
  checks, and calculation detail/export routes. No schema changes or new
  permissions were introduced. The index displays summaries, not calculated
  outputs; opening/exporting a result still requires server signature checks.
- Added search, module filtering, demo-analysis exclusion by default, archived
  project indicators, partial-failure notices, and module-specific retry.
  Organisation changes remount the index and use organisation-scoped queries.
- Updated workspace/registration descriptions to remove outdated claims that
  all analysis modules or the Reports section are planned.
- Fixed the video artifact's missing browser-library declarations, which had
  blocked the whole workspace's TypeScript check. No video visual/audio changes.
- Updated Vite to 7.3.7 and scoped TypeDoc's Markdown dependency to markdown-it
  14.3.3. The dependency audit subsequently returned zero known vulnerabilities.
- Optimized UTC energy grouping to partition at hour boundaries rather than
  minutes. Other time zones retain the existing minute-based DST/fractional
  offset handling. Regression tests compare the UTC path with the unchanged
  zero-offset Africa/Abidjan path and check partial-hour/month-boundary costs.
  Calculation assumptions and the model identifier were not changed.
- Added `pnpm run test:local` and focused report-index/calculation regressions.
- Finalization hardening: production API startup now rejects fixture-write
  opt-in flags; Supabase configuration must be a credential-free HTTPS origin
  without a path/query/fragment. Invalid configuration errors do not echo input.
  Compiled smoke checks assert the actual startup-rejection message, not merely
  a nonzero exit that could have resulted from a port conflict.

Corporate page layouts, branding, navigation, live domain, production settings,
stored records, migrations, RLS and remote Git configuration were not changed.
No publish, GitHub push, migration application or remote fixture operation ran.

## Executed evidence

| Check | Result and boundary |
| --- | --- |
| Backend safe tests (final) | 88 passed, 0 failed; local adapters/synthetic data |
| New UTC partition regressions | 2 passed, included in the 88 backend tests |
| Website platform tests | 56 passed, 0 failed after feature/dependency updates |
| New Reports unit tests | 3 passed, 0 failed |
| Localisation | Four languages, 22 routes each; 639 source entries passed |
| Sandbox discovery | 1 passed, 0 failed |
| Root TypeScript check | Passed after the browser-library fix |
| Recursive production build | Passed, including API, website, video and sandbox |
| Compiled production smoke | 10 checks passed; local HTTP only |
| Source secret-pattern check | 172 application source/frontend-build files checked; 0 common private-key literal findings; not a full secret/history scan |
| Dependency audit | 0 critical/high/moderate/low known findings |
| Reports browser journey | Passed with intercepted synthetic API responses only |
| Mobile sign-in preview | Loads at 390 × 844 without a browser runtime error |
| Supabase Auth/REST reachability | Failed; configured API hostname DNS `ENOTFOUND` |
| Read-only database audit | Could not complete; no migration/RLS verification claim |
| Staging local preflight | Blocked: independently reviewed approval file unavailable |

The final `pnpm run test:local` run passed 147 tests (88 backend, 56 website,
3 report-index), followed by all localisation checks. The final root build
includes the root typecheck and passed after the startup hardening; its compiled
production smoke rerun passed all ten checks. None of these local test counts
represent real Supabase tenant fixtures.

No standalone lint command is configured. Remote `test:platform`,
`test:energy:integration`, `test:engineering:integration` and
`test:sustainability:integration` were not executed: staging preflight exits 1
because its independently reviewed approval file is unavailable. This is an
intentional safety block, not a passing authenticated integration test. Supabase
DNS was rechecked during finalization and still returned `ENOTFOUND`; database
connections, migrations, fixture creation/cleanup and live email flows were not
attempted after that failure.
An independent Google public DNS-over-HTTPS diagnostic returned HTTP 200 with
DNS status 3 (`NXDOMAIN`) and no answer for the configured API hostname. This
corroborates the local resolver failure; it does not establish why the record is
absent. Confirm the active project and canonical endpoint with its operator,
rather than guessing a URL or replacing production credentials.

Production paths were reviewed for fixture/mock imports. Test adapters remain
in test files/scripts, not the production API/frontend entry points. There is
no substitute authentication or fabricated calculation fallback enabled.
The explicit, role-restricted Energy Management demo action remains a labelled,
separate synthetic dataset feature; it was not silently removed or executed.
No new browser pass was necessary for the backend-configuration-only follow-up;
the earlier intercepted frontend results remain frontend-only evidence.

### Browser evidence

At 1440 × 900 and 390 × 844, the new Reports page rendered readable report/project
links without document-level horizontal overflow. Search, module filter, demo
checkbox, organisation A-to-B switching, and a controlled module-503/retry
recovery passed. Tenant B cleared tenant A's visible rows. Unknown platform
requests were blocked by the browser interceptor. This is a frontend state and
navigation check, **not proof of actual tenant authorization, persistence or RLS**.

### Performance evidence

In the existing local synthetic benchmark, a 365-day UTC calculation initially
took 2,954 ms; after the UTC optimization it took 65 ms. Thirty days took 23 ms;
eight concurrent 5,000-row parser calls processed 40,000 valid rows in 408 ms.
The measured process peak RSS was 140 MiB. These are single-run measurements,
not stable service-level guarantees, database load tests, or multi-user capacity
certification. Non-UTC paths and large sustained workloads need separate profiling.

### Build warnings

- Existing source-map-location warning in `src/components/ui/tooltip.tsx`.
- Website chunks exceed Vite's 500 kB advisory threshold.
- `VITE_PUBLIC_SITE_URL` was absent in the shell build, so sitemap generation was
  explicitly skipped. Set it to the already-approved HTTPS domain at build time;
  this assessment did not alter the live domain or deployment settings.

## Safe local reproduction

Use Node 24 and pnpm from the complete workspace:

```sh
pnpm install --frozen-lockfile
pnpm run test:local
pnpm run typecheck
NODE_ENV=production PORT=3000 BASE_PATH=/ pnpm run build
pnpm --filter @workspace/api-server run test:production
pnpm --filter @workspace/api-server exec tsx scripts/benchmark-safe.ts
```

The root build above is a compilation check with a common local base path.
Actual artifact deployment must use each existing artifact's own managed
`BASE_PATH` and `PORT`. Do not replace the platform's service routing with the
common local build values. The compiled smoke test launches a temporary local
process and uses invalid requests without real sign-in or database writes.

## Required configuration and release gates

### 1. Restore service reachability without guessing or replacing credentials

An operator must confirm the intended project is active and obtain the canonical
API endpoint from that project's Supabase settings. The current effective
configuration targets the protected existing project, not approved staging.
Resolve the DNS/endpoint issue first; do not infer a replacement project or copy
production credentials to staging. No authentication or data operation can be
certified while its backing service is unreachable.

### 2. Independently configure and verify staging

Follow `staging-isolation.md`, `staging-setup-guide.md` and
`qa-staging-workflow.md`. Required values include:

- `GEIT_ENVIRONMENT=staging`
- Dedicated `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`
- Separate non-production legacy `DATABASE_URL`
- Independently generated staging `SESSION_SECRET` of at least 32 characters
- Exact staging HTTPS `PLATFORM_ORIGIN`
- `GEIT_TEST_SUPABASE_PROJECT_REF`
- Operator-reviewed `GEIT_STAGING_APPROVAL_FILE`
- `GEIT_ALLOW_TEST_FIXTURE_WRITES=no` during preparation

Do not change production variables. The staging API and test process must have
the same independently approved project, database fingerprints, origin and
signing key. Candidate fingerprints alone are not approval.

```sh
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --candidate
# Operator independently checks dashboard/project, legacy DB and HTTPS origin.
# Operator provisions the reviewed, git-ignored approval file.
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --local
# Start only the independently configured staging application.
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --api
```

### 3. Verify schema and authorization on staging

Review migrations 001–006. No migrations were changed or applied in this pass.
Apply missing migrations only to the verified staging target after migration
approval, using the existing migration runner; never reset the existing project.
Then run the read-only metadata audit to verify checksums, tenant-table RLS,
anonymous grants, security-definer search paths and private Storage bucket.

Only after explicit fixture-write approval run `test:platform` and its energy,
engineering and sustainability integration variants sequentially on staging.
The fixture harness must verify the staging API identity before connections and
again before cleanup. Never bypass that guard if a test or cleanup is blocked.

### 4. Real end-to-end acceptance

Use synthetic staging accounts in separate organisations and each supported role:
signup/activation, sign-in, refresh, logout, password recovery, protected routes,
site/meter/tariff changes, CSV/XLSX import and commit, calculated analyses,
engineering/carbon/twin scenarios, saved reports, downloads, private-file access,
foreign-tenant direct REST/RPC/API attempts and reader mutation denial.
The new report index should be repeated using actual saved staging records.
Email flows require a real approved inbox; seeded users do not prove delivery.

### 5. Operational and external dependencies

- Confirm backup retention, restore drill and separate Storage object-byte recovery.
- Process-local rate limiting is not a multi-instance/distributed limiter.
- No production-scale load/soak test or independent penetration test was run.
- Optional AI, billing/payment webhooks and live weather/grid/meter connectors are
  not newly configured or verified. Do not advertise active integrations.
- Forecasts remain conditional on sufficient, valid imported history; solar and
  battery calculations remain documented baseline models, not advanced optimization.
- Module lists still enforce existing bounded record limits, not pagination.
- Review the two prior medium session-fixation scanner heuristics against real
  cookie/proxy behavior; no independent session-security clearance is implied.
- Configure `VITE_PUBLIC_SITE_URL` during an eventual build for the existing
  approved domain, and verify sitemap/canonical/HTTPS deep links there.

**Do not publish or push to GitHub as part of these checks.** Production sign-off
requires evidence for the blocked gates above, not merely a successful build.

## Files changed

- `artifacts/api-server/src/lib/energy-calculations.ts`
- `artifacts/api-server/tests/energy-partition.test.ts`
- `artifacts/api-server/src/lib/production-config.ts`
- `artifacts/api-server/tests/readiness.test.ts`
- `artifacts/api-server/scripts/test-production-smoke.mjs`
- `artifacts/geit-energy-dt-film/src/App.tsx`
- `artifacts/geit-website/package.json`
- `artifacts/geit-website/src/config/platform-modules.ts`
- `artifacts/geit-website/src/platform/app-routes.tsx`
- `artifacts/geit-website/src/platform/auth-pages.tsx`
- `artifacts/geit-website/src/platform/workspace.tsx`
- `artifacts/geit-website/src/platform/reports/report-index.ts`
- `artifacts/geit-website/src/platform/reports/reports-page.tsx`
- `artifacts/geit-website/tests/platform-manifest.test.mjs`
- `artifacts/geit-website/tests/reports-index.test.mjs`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `docs/production-readiness-audit.md`
- `docs/production-deployment.md`
- `docs/energy-dt-stabilization.md`
