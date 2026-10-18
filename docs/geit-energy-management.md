# GEIT Energy Management

## Scope and setup

The corporate website is unchanged. The authenticated module is available at
`/app/energy-management?org=<organisation UUID>`, using the existing Supabase
Auth session and organisation picker.

Complete `docs/geit-foundation-setup.md` first. Existing runtime variables are
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the configured application origin
(`PLATFORM_ORIGIN` in production). `SUPABASE_DB_URL` is needed only by migration,
inspection and synthetic-fixture scripts, not by request handlers. No service-role
key, new database, paid integration or browser-persisted credentials are used.

Run from the project root:

```sh
pnpm install
pnpm --filter @workspace/api-server run db:inspect:platform
# Review migrations/003_energy_management.sql before applying to the intended DB.
pnpm --filter @workspace/api-server run db:migrate:platform
pnpm --filter @workspace/api-server run test:energy
pnpm --filter @workspace/api-server run test:energy:integration
pnpm --filter @workspace/api-server run test:pkce
pnpm --filter @workspace/geit-website run test:platform
pnpm run typecheck
pnpm --filter @workspace/api-server run build
# Use the managed website PORT and BASE_PATH for its build:
PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run build
```

The existing managed API and website workflows run the application. Migration
003 adds eight RLS-protected energy tables, composite tenant/demo parent keys,
an interval overlap exclusion constraint and atomic import/analysis RPCs.
Previously applied migrations are checksum-locked; do not edit them.

The integration command uses three **synthetic, verified development accounts**
and two organisations. It signs in normally and exercises both the API and
Supabase REST/RPC under user JWTs, not owner-DB bypass credentials. It removes
only its own fixtures on completion. Never run this fixture test on production.
`node scripts/test-platform.mjs --energy --keep` retains fixtures for a browser
pass; `node scripts/test-platform.mjs --cleanup` removes them afterwards.
Credentials are written only to a mode-0600 temporary file, not source or logs.

## Customer workflow

1. Sign in, select the correct organisation and open **Energy Management**.
2. Keep **Customer data** selected. Under **Records**, create a site with an
   IANA time zone (for example `Europe/Helsinki`), and optional floor area in m².
3. Create a named meter under that site. Its default unit describes the meter;
   each uploaded row explicitly declares its actual unit. Meter site assignment
   is fixed after creation to protect provenance.
4. Optionally create a tariff: three-letter currency, rate per kWh, daily
   standing charge and rate per monthly peak kW. Use zero for unused charges.
   This is a flat-rate model, not a utility billing engine.
5. Under **Readings**, download the blank CSV or Excel template. Fill its four
   columns in the prescribed order:

   | Column | Example / meaning |
   |---|---|
   | `interval_start` | `2026-02-01T00:00:00Z` |
   | `interval_end` | `2026-02-01T01:00:00Z` (exclusive) |
   | `value` | Non-negative decimal; no formulas or thousands separators |
   | `unit` | `Wh`, `kWh`, `MWh`, `MJ`, `GJ`, `W`, `kW` or `MW` |

   Timestamps must be ISO text with `Z` or an explicit offset such as `+02:00`.
   Text avoids Excel's ambiguous serial dates and local date conventions.
   Supported years are 2000–2100. Each interval must be positive and at most
   24 elapsed hours. Power units mean **average power across the full interval**,
   never a point-in-time reading. Cumulative counters are not accepted.
6. Select the meter, upload CSV or `.xlsx`, and choose **Validate file**.
   Review row counts and every error. The preview is saved, but no time-series
   readings exist until **Commit readings** succeeds. You can reload and return
   to an earlier clean preview. Correct errors in the source file and upload a
   new preview; invalid rows are never silently skipped.
7. Commit the clean preview. Duplicate timestamps and *any* overlap with existing
   meter intervals fail the whole transaction. A simultaneous import cannot
   overwrite readings. Retrying an already committed preview is idempotent.
8. Under **Analysis**, select one meter, a start/end period, and an optional
   tariff, period-matched baseline and target. Date/time inputs use your
   **browser's local time** and are sent as UTC instants. Charts group the
   results in the **site's IANA time zone**.
9. Save the analysis. Review consumption, observed average/peak power, load
   factor, data coverage, modelled costs, optional intensity and comparisons.
   Review both charts and their accessible data tables.
10. Return to the saved analysis after a reload. Its versioned result and full
    input/configuration snapshot remain unchanged when a site or tariff is edited.
    Download CSV, Excel or PDF. CSV/Excel include every input interval; PDF
    includes the summary, assumptions and daily consumption.
11. Under **Records**, create a meter alert rule for daily kWh or peak
    interval-average kW. Rules apply to subsequent saved analyses. **Alerts**
    links to the triggering analysis and allows acknowledgement. There is
    **no background monitoring, push notification or email delivery**.
12. Edit records as needed. Archive/restore sites, meters, tariffs or rules
    instead of deleting history. Archived sites/meters reject new imports and
    analyses until restored. Existing saved reports remain readable.

## Demo workflow

Choose **Synthetic demo** and, as an owner, administrator or energy manager,
choose **Create synthetic demo**. This idempotently creates a separate site,
meter, flat tariff and **168 persisted hourly readings, 1–7 January 2026 UTC**.
The values are artificial illustrations, not clients, verified savings or GEIT
project results. Select 1 January 2026 00:00 UTC through 8 January 2026 00:00 UTC
to analyse the whole set (account for your browser's local input time).

The demo view is labelled throughout. Its records/imports are read-only in the
UI, but analyses can be saved. Downloadable `DEMO` CSV examples are synthetic.
Only upload synthetic files to a demo meter, never customer data. Demo and
customer entities have separate IDs and enforced parent keys; an analysis cannot
combine a real meter and a demo tariff. The toggle filters all seven workspace
lists and all selectable meters/tariffs. It does not create another tenant or
grant additional permissions.

## Calculation contract (`geit-interval-v1`)

- Normalisation: Wh ÷ 1,000; MWh × 1,000; MJ ÷ 3.6; GJ ÷ 0.0036.
  W/kW/MW are converted to kW and multiplied by actual elapsed UTC hours.
- Only complete, non-overlapping intervals wholly within `[start,end)` are
  analysed. A boundary-cut interval is excluded, not silently prorated.
- Consumption is the sum of interval energy. Interval-average kW is kWh divided
  by elapsed hours. Peak is the highest such average, **not instantaneous power**
  or a utility's specified demand window.
- Observed average is kWh ÷ observed hours. Load factor is observed average ÷
  observed peak × 100; zero peak gives unavailable, not division by zero.
- Coverage is observed hours ÷ selected elapsed hours × 100. Gaps are not
  imputed; partial coverage warns in the result and reports.
- Daily consumption allocates interval energy uniformly over actual minute
  portions in the site's local calendar. This also handles midnight, fractional
  offsets and DST. Daily chart power is that day's highest interval-average kW.
- The hour-of-day load profile is energy divided by observed hours for each
  local clock hour, weighted by elapsed time across dates/DST. Missing clock
  hours are omitted, not manufactured as zero.
- Flat energy cost = kWh × energy rate. Standing cost = rate × number of local
  days with readings. Demand cost = rate × sum of the highest observed average
  kW in each local month with readings. A partial month still has one modelled
  demand charge; missing days are not billed in this model.
- No tariff means unavailable cost, not zero. Costs are estimates, not invoices:
  no taxes, time-of-use, tiers, seasonal rates, effective-date schedules,
  contract minimums, reactive charges or bill reconciliation.
- Intensity is selected-period kWh ÷ site m², not annualised. Baseline change is
  `(actual-baseline)/baseline × 100`; target difference is `actual-target`.
  Baselines/targets are user-provided period-matched totals, not AI predictions.
- Daily/hour allocations are calculated to 8 decimal places for output. Saved
  snapshots retain source values and units. Reports identify the algorithm,
  period, configuration and SHA-256 of the input readings for reproducibility.
  The hash is a reproducibility checksum, not a certified audit signature.
- Meters are analysed individually. Parent and submeter totals are not
  automatically added, avoiding double counting.

## Permissions and security

| Action | Owner / admin / energy manager | Consultant / analyst | Reader |
|---|---|---|---|
| Read own-organisation records, charts, reports | Yes | Yes | Yes |
| Manage site/meter/tariff/rule; seed demo | Yes | No | No |
| Validate/commit import; save analysis; acknowledge | Yes | Yes | No |
| Change organisation memberships | Existing owner-only foundation rules | No | No |
| Read or mutate another tenant's energy data | No | No | No |

Runtime requests use the signed-in user's JWT, RLS and exact-origin/custom-header
CSRF checks. Reading writes are RPC-only; immutable time intervals cannot be
directly inserted, patched or deleted by a customer token. The commit RPC locks
the import/meter and uses database exclusion constraints. Saving an analysis and
its evaluated alerts is one transaction. Actor identity is taken from `auth.uid()`,
never the request body.

Uploads are limited to 2 MiB, 5,000 rows, one worksheet and four columns.
XLSX ZIP contents are streamed and bounded to 16 MiB expanded / 200 entries
before workbook parsing; formulas, rich objects and ambiguous Excel dates are
rejected. No macros or legacy `.xls` are supported. Original upload bytes are
not retained: the tenant-private database stores parsed previews, row errors and
committed readings. No energy data is placed in a public storage bucket.
CSV report cells neutralise spreadsheet formula prefixes; Excel exports use
string cells, not executable formulas. No sensitive upload contents are logged
or placed in browser local/session storage.

## Verification performed

- **17 automated calculation/import/export-safety tests passed**, including
  unit conversions, elapsed-hour/DST handling, cost components, baseline/target,
  partial coverage, zero consumption, numeric bounds, real workbook parsing,
  rejected formulas, duplicate rows and CSV formula neutralisation.
- **36 live API/security/storage checks passed**, covering the existing
  foundation plus tenant-bound site/meter/tariff/rule records, actual CSV/XLSX
  persistence, known calculation values, saved analyses/alerts, exports, reader/
  analyst permissions, archive/restore and isolated demo seeding.
- **Three additional direct-database checks passed**: all eight populated energy
  tables had own-tenant positive controls and foreign denial; a forged/stale clean
  preview hit the database overlap constraint and rolled back an earlier new row;
  a foreign import ID was unavailable even in an own-tenant RPC call.
  These checks are also part of future `test:energy:integration` runs.
- **Three focused final API checks passed** after fixes: archive/restore nested
  site/meter/rule records, reject overlap in the final import prefilter, and
  reject oversized normalised energy at preview rather than only on commit.
- **One PKCE regression, three route/manifest tests, the complete workspace
  TypeScript check, and API/website production builds passed.** The corporate
  localisation check passed for 22 routes in each of four languages.
- The **authenticated browser workflow** created/edited records, downloaded a
  template, committed two readings, rejected an invalid import, and saved a known
  analysis with **30 kWh, 20 kW peak and USD 68**. Reload retained the analysis;
  both chart tables, CSV/XLSX/PDF downloads, alert links/acknowledgement, demo
  labels/separation and reader-only controls were verified.
- The first browser attempt was interrupted by a concurrent test helper's
  global sign-out, not account verification. The helper now signs out locally;
  fresh sign-in completed the same workflow. This does not verify email delivery.
- A real mobile/tablet overflow issue was fixed by constraining workspace grid
  tracks and sidebar/chart minimum widths. The targeted browser recheck passed:
  390 px viewport / 375 px document / 293 px charts; 768 / 753 / 671; and
  1440 / 1425 / 448. Module navigation scrolls locally, both chart tables remain
  usable, and Records/Readings also fit at 390 px. No page-level overflow remains
  in those checked states. The corporate homepage screenshot remained intact.

## Current limits and review gates

- Analyses are bounded to 10,000 complete intervals and 366 days. Workspace
  lists support 250 records of each type; exceeding the cap fails explicitly
  rather than silently hiding older data. Large-fleet pagination/background
  import processing are not implemented.
- Imports are immutable after commit. Corrections require an archived meter
  and a replacement meter/import; there is no destructive reading editor or
  purge interface. Retention/deletion workflows need agreement before real
  customer onboarding. File bytes are not archived in object storage.
- This module supports non-negative consumption/average-power intervals only;
  no net-export negatives, cumulative-counter reset logic, live meter connector,
  smart-meter protocol or automatic currency conversion.
- Synthetic verified accounts prove password/session/RLS behaviour, **not real
  verification or recovery email delivery**. The foundation's real inbox and
  same-browser PKCE redirect checks remain outstanding.
- The authenticated workspace is English only. Existing corporate translations
  retain their human-review notices.
- The public production domain is not configured; sitemap generation remains
  deferred until `VITE_PUBLIC_SITE_URL` is confirmed. Existing public bundle-size
  and source-map warnings are non-blocking build warnings, not security proof.
- No certification, legal/tariff compliance, production capacity test or full
  independent security audit is claimed by these automated tests.
