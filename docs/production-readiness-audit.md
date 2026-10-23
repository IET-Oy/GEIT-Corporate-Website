# GEIT SaaS production-readiness audit

> Current assessment: see [Energy DT stabilization](energy-dt-stabilization.md),
> dated 2026-10-23. The results below are historical and must not be treated as
> current Supabase connectivity, staging-isolation or release verification.

Date: 2026-10-18. **Decision: NO-GO for unrestricted production launch.**
This audits the existing implementation, not a published deployment. Deployment metadata reports no active published application.

## Changes made

- Malformed JSON and oversized requests now return safe JSON 400/413 responses. Unexpected HTTP failures return a generic JSON 500 without exposing the exception, request body or stack. Unknown API routes return JSON 404; Express identification is disabled.
- Energy Management now signs the complete persisted analysis payload and verifies it before viewing/exporting. Signatures bind organisation, meter, tariff, name, calculated outputs and frozen inputs/source data. Direct Supabase RPC access cannot manufacture an accepted output by copying a genuine signature.
- Unsigned historical analyses remain stored but fail closed with HTTP 409 and instructions to create a new analysis. They are not silently recalculated, deleted or retrospectively certified. Keep the signing secret stable.
- Production refuses startup without an explicit HTTPS `PLATFORM_ORIGIN`, required account configuration and a signing secret of at least 32 characters. A preview hostname is never a production-origin fallback.
- Scoped dependency overrides update ExcelJS's `uuid` to 11.1.1 and typography's selector parser to 7.1.6. CSV/Excel imports, exports and the complete build were exercised after these updates.
- Removed the unpatched `braces` dependency chain from the development design sandbox by replacing `fast-glob` with Node 24 native discovery. A positive-control test covers nested components and exclusion of private/hidden files; the sandbox typecheck and build pass.
- A browser-discovered mobile overflow in the digital-twin input area prompted shrinkable field wrappers and bounded select widths. Browser recheck status is recorded below.
- Added reproducible readiness unit tests, a read-only database audit, a compiled-production smoke test and a live forged-analysis regression.
- The PKCE test now runs through the existing TypeScript runner, resolving the new imported configuration helper correctly.
- A focused failure test reproduced identity-provider outages being mistaken for invalid sessions. Transient provider errors now return safe HTTP 503 without clearing customer cookies; failed credentials remain HTTP 401. Initial lookup, refreshed-user verification, sign-in/sign-up and code exchange classify upstream errors before account validity checks.

## Executed checks

| Check | Actual result |
|---|---|
| Energy calculation/import unit tests | 17 passed |
| Consulting, auditing, solar and battery calculation tests | 20 passed |
| Carbon, twin, forecast/anomaly and optional-AI adapter tests | 15 passed |
| New integrity, production configuration and safe-error tests | 4 passed |
| PKCE cross-request cookie test | 1 passed |
| Frontend module/route manifest tests | 3 passed |
| Native design-preview discovery | 1 passed |
| Identity-provider outage / credential error regressions | 3 passed, including real local Express requests with a controlled failing provider |
| Combined live authentication/security/module integration suite | 73 checks passed |
| Database metadata audit | 6 migration checksums match; 15 tenant tables have RLS; 0 anonymous public-table grants; 16 definer functions have restricted search paths |
| Storage metadata and live byte operations | Private 10 MiB bucket; actual tenant uploads/downloads; foreign list/download/signing denial; reader mutation denial; public/anonymous denial |
| Corporate localisation | English, French, Kinyarwanda and Swahili: 22 routes each; 636 catalogue entries checked |
| Root typecheck and recursive production build | Passed, including API and website |
| Compiled production-mode local smoke | 9 checks passed, including actual authentication 429 boundary and missing-origin startup denial; not a published-domain test |
| Post-outage-fix live auth/storage/RLS rerun | 22 checks passed; fresh synthetic fixtures removed afterward |
| Browser workflows | Sign-in/reload/wrong password, CSV import/validation, analyses, six engineering/sustainability reports, one saved revision, actual CSV/PDF downloads, reader controls, foreign-org denial and sign-out/Back passed |
| Dependency scanner after fixes | 0 critical, 0 high, 0 moderate, 0 low |
| Common private-key literal pattern check | 159 application source/build files checked; 0 findings; not a full secret-history scan |
| Static security scanner | Completed; two medium cookie/session-fixation heuristics reviewed |
| Privacy/data-flow scanner | Failed with `HOUNDDOG_SCHEMA_MISMATCH`; NOT a pass |

The 73 live checks include populated positive controls, tenant A/B data separation, role enforcement, direct REST/RPC bypass attempts, refresh/sign-out, immutable result provenance, invalid/duplicate/overlapping import rejection, real Excel imports, committed historical series, solar/battery calculations, carbon factor versions, forecast withholding, four engineering export formats and foreign report denial. Tests use isolated synthetic organisations, not customer records.

The initial expanded live run passed the new authenticity test but stopped at an old assertion that assumed a particular report was newest. The deliberately forged report changed the ordering. The assertion now checks membership in the list; the entire live suite was rerun and passed. This was a test assumption, not a suppressed product failure.

### Browser detail

- Real UI import: 10/20/30 kWh across three one-hour intervals produced 60 kWh, 30 kW peak and 20 kW average. Negative input was rejected before commit. The 2,220-byte CSV download contained the expected result.
- Carbon screening retained 718 kgCO2e baseline, 618 proposed and 100 reduction after reload, with factor/input provenance and synthetic-data labels.
- A measured 35-day twin retained 2,380 kWh, 68 kWh forecast demand and zero holdout MAE on its deliberately regular synthetic series. Short history withheld forecast/anomaly claims rather than fabricating results.
- All four consulting/auditing/renewable/battery saved reports and restored input forms were opened. A new consulting revision preserved its original; a downloaded 4,761-byte PDF began `%PDF-`.
- Owner B could not open owner A's organisation; readers saw read-only Energy/Carbon/Consulting reports. Sign-out and browser Back did not reveal the former report or identity. One wrong-password attempt returned 401 with a useful message; keyboard focus and sign-in labels were checked.
- The initial 390px twin overflow was fixed. Rechecking the same twin with loaded inputs gave document/body/client widths of 375/375/375, 753/753/753 and 1425/1425/1425 at viewport widths 390, 768 and 1440. No body overflow was hidden with a CSS workaround.
- The browser helper could not attach a screenshot of the exact corrected mobile Twin state: its notebook reset, then two preview attempts returned HTTP 502. Width measurements had already passed. Managed services were restarted afterward, and the final website and API health probes both returned 200; this does not establish production-host availability. Desktop result screenshots and a mobile sign-in screenshot were captured. The public homepage was also inspected in the main preview.
- Energy Management PDF was not clicked in the browser; its server PDF export was covered by the live integration suite. Corporate page-by-page regression, full WCAG conformance and an independent browser-console/network audit of every route were not performed in this SaaS-focused pass.

The 73-check combined run preceded the final transient-auth error-handling fix. Its calculation/import/export modules were unchanged by that fix; afterward the three new outage regressions, 22-check auth/storage/RLS rerun, PKCE test and rebuilt production-mode smoke test passed.

## Security findings and limitations

### Release gates

1. **Real account activation and recovery are unverified.** Seeded confirmed users prove password/session flows, not inbox delivery, SMTP configuration, redirect allowlists or same-browser PKCE email round trips. Test both flows with a real inbox on the intended HTTPS domain.
2. **Backup configuration and restore are unverified.** Access to the provider's backup settings and a separate recovery target is unavailable. Confirm retention, RPO/RTO and an isolated recovery drill. Supabase database backups do not include Storage object bytes.
3. **Rate limits are process-local.** Authentication is limited to 20 writes/minute/IP; other platform writes to 60/minute/IP; optional AI has an additional five requests/account/minute. The compiled-server test exercises the authentication 429/Retry-After boundary. Counters reset on restart and are not shared between autoscaled instances. Configure a tested shared limiter or equivalent edge enforcement before multi-instance/public-scale operation.
4. **Published configuration and gateway are unverified.** Set the explicit origin and canonical domain before publishing, then test real HTTPS routing, cookies, headers and SPA deep links. Production now intentionally fails startup if its origin is absent.
5. **Privacy scanner did not complete.** Manual review and other scanners are not substitutes for that missing result.

The initial dependency scan reported two high and one moderate findings. The UUID and selector-parser updates fixed two; removing the unused vulnerable glob chain fixed the remaining high advisory. The final dependency scan reports no known vulnerabilities, which is not proof of absence of all security risks.

### Static scanner triage

The two medium heuristics point to `savePlatformSession` writing cookies. Its normal callers supply Supabase-generated sessions after password authentication, verified code exchange or token refresh; arbitrary request token text is not accepted as a newly authenticated session. Cookies are HttpOnly, Secure on HTTPS and server-emitted SameSite=Lax; exact-origin/custom-header checks protect mutations. These findings were reviewed, not mechanically suppressed and not presented as an independent penetration-test clearance. Review cookie/domain behaviour again on the real deployment. Preview proxies can rewrite SameSite attributes.

### Deliberately not enabled or independently verified

- No payment provider, payment secret or webhook secret is configured. **No paid entitlements, checkout, subscription activation or webhook processing was added or claimed tested.** Before enabling paid access, require a configured provider, signed webhook verification, idempotency/replay protection, tenant/customer mapping and tests for renewals, cancellations and failed payments. A client redirect must never grant access.
- AI remains optional and disabled. Controlled HTTP responses test its evidence-selection adapter; no live provider response, provider retention setting or billable call was verified.
- No live weather/grid/meter connector is configured. Twins use imported records.
- Private storage is tested through SDK/RLS operations; a complete customer document-management UI is still deferred.
- No production load/soak test, independent penetration test, malware scanner or disaster-recovery drill was performed.
- Read-only access to old reports is subject to integrity verification. Invalid/unsigned reports must be recreated, not trusted.
- Forecasts require sufficient complete history; models are transparent screening models, not certified designs or a complete assured Scope 3 inventory.
- Lists and time series remain bounded as documented in the module guides. PDF reports summarise up to 50 rows/table; complete data is in CSV/Excel/JSON.
- Vite reports large existing bundles. `VITE_PUBLIC_SITE_URL` is unset, so the default build skips sitemap generation. The SaaS interface is English; corporate translations retain their human-review notices.

## Reproduce

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run test:energy
pnpm --filter @workspace/api-server run test:engineering
pnpm --filter @workspace/api-server run test:sustainability
pnpm --filter @workspace/api-server run test:readiness
pnpm --filter @workspace/api-server run test:auth-outages
pnpm --filter @workspace/api-server run test:pkce
pnpm --filter @workspace/geit-website run test:platform
pnpm --filter @workspace/mockup-sandbox run test:discovery
pnpm --filter @workspace/geit-website run check:localization
pnpm --filter @workspace/api-server run audit:database
PORT=18414 BASE_PATH=/ pnpm run build
pnpm --filter @workspace/api-server run test:production
pnpm --filter @workspace/api-server run audit:source
```

With the managed development API running and a designated test Supabase project:

```sh
pnpm --filter @workspace/api-server exec node scripts/test-platform.mjs --energy --engineering --sustainability
```

The live harness creates/removes synthetic auth users, organisations, storage bytes and module records. Never run it casually against a customer production database. `--keep` retains fixtures for a browser pass; remove them only after that pass finishes:

```sh
pnpm --filter @workspace/api-server exec node scripts/test-platform.mjs --cleanup
```

No standalone lint command is configured. TypeScript and security scans do not imply a lint pass.

See [the deployment runbook](production-deployment.md) for configuration and release steps.
