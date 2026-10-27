# GEIT engineering modules

The corporate website and Energy Management remain separate from these four authenticated workspaces:

| Workspace | Route | Implemented baseline |
|---|---|---|
| Energy Consulting | `/app/energy-consulting` | Annual energy/cost comparison and discounted cash flow |
| Energy Efficiency & Auditing | `/app/energy-auditing` | Equipment-by-equipment efficiency measures and portfolio appraisal |
| Renewable Energy Advisory | `/app/renewable-energy` | Monthly solar PV yield, energy balance and screening appraisal |
| Battery Storage & Flexibility | `/app/battery-flexibility` | Chronological self-consumption / peak-shaving dispatch |

These are real, persistent engineering worksheets, not a substitute for site investigation, detailed design, a certified audit or investment advice. No weather, tariff, equipment or market-data provider is configured. The interface and exports disclose manual-input status. No simulated integration is presented as connected.

## Setup

Use the existing React/Vite, Express and Supabase project; do not replace the corporate application.

Required **server-only** environment variables:

- `SUPABASE_URL`: the existing Supabase project's HTTPS URL.
- `SUPABASE_PUBLISHABLE_KEY`: that project's publishable key. Requests use the signed-in user's JWT, not a service-role key.
- `SUPABASE_DB_URL`: matching project PostgreSQL connection, for the migration tool and isolated development fixtures only. Runtime engineering APIs do not use the owner connection.
- `SESSION_SECRET`: existing high-entropy, stable secret, at least 16 characters. Domain-separated HMAC-SHA256 authenticates saved scenario payloads. Never expose it to the browser, source control, reports or logs. Keep it stable and securely backed up. Rotating it without a deliberate historical-signature migration makes historical reports fail integrity verification.
- `PLATFORM_ORIGIN`: exact deployed HTTPS origin for the existing cookie/CSRF and email-link configuration. Development uses the existing preview-origin fallback.
- `PORT`: supplied by the managed workflow.

`VITE_PUBLIC_SITE_URL` is the existing optional corporate sitemap/canonical setting; obtain the real published URL rather than guessing it. It is not an engineering-data provider. See the platform foundation and Energy Management documentation for the existing Supabase email redirect allowlist and verification/recovery setup.

```sh
pnpm install
pnpm --filter @workspace/api-server run db:migrate:platform
pnpm --filter @workspace/api-server run test:engineering
pnpm --filter @workspace/api-server run test:engineering:integration
pnpm run typecheck
PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run build
```

The migration runner applies the new engineering migration after the existing identity, private storage and Energy Management migrations. It validates migration checksums and uses verified Supabase TLS. Never edit an already-applied migration. Restart the existing API and website workflows after installation; no second server or database is needed.

## Customer workflow

1. Sign in with a confirmed Supabase account and select the correct organisation.
2. Open the desired module. Readers can inspect projects/reports; owners, admins, editors and analysts can write.
3. Create a project: name, facility/boundary, client problem, assessment scope, currency and status.
4. Gather measured inputs and explicitly document sources, dates, boundaries and limitations in **Source notes**. Blank measured values are not replaced with fabricated data. The UI labels editable discount/horizon/performance defaults as assumptions.
5. Enter inputs in the displayed units. Correct inline errors, then choose **Save scenario and calculate**. The server revalidates inputs, calculates results and atomically saves the scenario plus an audit event.
6. Review metrics, result tables, formulas, assumptions and warnings. An undefined ratio or payback is **Unavailable**, never a fake zero.
7. Reload or reopen the saved scenario. Its inputs, project snapshot, engine version, SHA-256 input hash and results remain unchanged.
8. Choose **Load inputs as new scenario**, revise assumptions and save under a new name. Compare two scenarios for the same project. A revision never overwrites the original.
9. Download CSV, Excel, JSON or a PDF screening summary. Exports are generated from the same immutable scenario and require the authenticated tenant session.
10. Archive completed projects when appropriate. Saved scenarios and exports stay accessible; restore the project before adding another scenario.

Once a project has a scenario, its currency cannot change. Create a separate project to use another currency; no exchange-rate conversion is inferred.

### Consulting inputs

Enter annual baseline and proposed energy in **kWh, MWh or GJ**, a flat tariff per kWh, capital cost, incremental annual operating cost, discount rate and evaluation horizon (1–50 years). Negative incremental Opex means an operating-cost reduction.

Conversions: `1 MWh = 1,000 kWh`; `1 GJ = 1 / 0.0036 kWh`.

```
energy reduction = baseline kWh − proposed kWh
gross annual benefit = energy reduction × tariff per kWh
annual net benefit = gross annual benefit − incremental annual Opex
NPV = −capex + Σ(net annual benefit / (1 + discount fraction)^year)
simple payback = capex / positive annual net benefit
```

The cash-flow table includes year-zero investment and end-of-year cash flows. Discounted payback interpolates within the first recovery year; it is unavailable if recovery does not occur in the model horizon. Negative savings are permitted and clearly reported. Zero baseline produces an unavailable reduction percentage.

### Efficiency & Auditing inputs

Add 1–30 distinctly named measures. Each has quantity (integer), baseline/proposed **input power** in W or kW, annual operating hours (0–8,784), whole-measure capital cost and whole-measure incremental annual Opex. Costs are totals for the measure, **not per-equipment prices**.

```
annual equipment energy = quantity × input power in kW × annual hours
portfolio savings = Σ(baseline equipment energy − proposed equipment energy)
annual net benefit = portfolio savings × flat tariff − Σ incremental annual Opex
```

The optional measured facility baseline bounds the combined measure baseline. A portfolio that exceeds it is rejected. The proposed facility total is `facility baseline − portfolio savings` when a facility baseline exists. Measures must describe independent, non-overlapping end uses. Distinct names cannot prove that independence. No rebound, weather adjustment, interactions, automatic measurement-and-verification or savings certification is claimed.

### Renewable Energy Advisory: baseline solar model

Supply **all 12 unique months**, each with monthly **plane-of-array irradiation in kWh/m²/month** and site demand in kWh. Do not enter daily irradiation or global horizontal irradiation without an independently justified conversion.

Enter DC nameplate capacity in kWp, performance ratio (0–1, excluding zero), a self-consumption coincidence factor (0–1), import/export energy rates, capex, annual Opex and financial assumptions.

```
STC reference irradiance = 1 kW/m²
monthly AC generation = DC capacity kWp × POA irradiation / reference irradiance × performance ratio
monthly self-consumed energy = min(generation, demand) × coincidence factor
export = generation − self-consumption
grid import = demand − self-consumption
gross benefit = self-consumption × import rate + export × export rate
annual net benefit = sum(monthly gross benefit) − annual Opex
```

Performance ratio includes the user-assumed temperature, inverter, wiring, soiling and availability losses; do not double-count them. Monthly matching is a **screening proxy**, not hourly coincidence or dispatch. The same typical year repeats for appraisal. Capacity factor uses 8,760 hours. There is no shading/tilt design, clipping/temperature simulation, degradation, P50/P90 probability, wind/hydro model or claim of equivalence to a validated bankable solar simulation tool.

### Battery Storage & Flexibility: baseline dispatch

Enter usable nameplate energy capacity (kWh), SOC minimum/maximum/initial percentages, maximum AC charge/discharge power (kW), **separate one-way efficiencies as fractions**, and a dispatch policy. Peak shaving additionally requires a grid import target in kW. Minimum SOC must be below maximum; initial SOC must be within those bounds.

Paste/upload CSV (up to 1,000 intervals), or download the blank header template:

```csv
start,end,loadKwh,solarKwh,importRatePerKwh,exportRatePerKwh
```

Timestamps require ISO dates with `Z` or an explicit UTC offset (2000–2100). Intervals must be ordered, contiguous, non-overlapping and between zero (exclusive) and 24 hours long. Load/solar are **interval AC energy**, not average power or cumulative meter registers. Grid rates are money/kWh in the project currency. Missing periods are rejected, not filled with fabricated data. Offsets and elapsed hours determine durations, including daylight-saving transitions.

For each interval:

1. Direct solar serves load first.
2. Solar surplus charges within maximum power, remaining SOC capacity and charge-efficiency constraints.
3. Self-consumption mode discharges to residual demand; peak-shaving mode requests only residual demand above `target kW × interval hours`.
4. Discharge is bounded by maximum power and stored energy above reserve.
5. Remaining deficit is imported; unused solar surplus is exported.

```
AC charge = min(surplus, charge kW × h, (maximum stored kWh − SOC kWh) / charge efficiency)
AC discharge = min(requested energy, discharge kW × h, (SOC kWh − minimum stored kWh) × discharge efficiency)
new SOC kWh = old SOC kWh + charge × charge efficiency − discharge / discharge efficiency
load + AC charge + grid export = solar AC + AC discharge + grid import
grid cost = imported kWh × import rate − exported kWh × export rate
```

The comparison baseline is the **same load and solar without a battery**. There is no grid charging, battery export, simultaneous charge/discharge, forecast, arbitrage or advanced optimisation. Peak results are interval-average values, not utility demand-window simulations. An infeasible target is explicitly flagged.

**Grid-cost difference is not net economic savings or ROI.** Capital cost, battery wear and terminal stored-energy value are not included. Different initial/final SOC can make short-horizon apparent savings misleading; the model explicitly warns about this. Use a justified cyclic horizon or independent terminal-inventory valuation. No annualisation or fabricated investment return is supplied. End-of-horizon one-hour discharge headroom is only a physical screening potential, not contracted/qualified grid-service capacity.

## Persistence, permissions and reproducibility

- Projects/scenarios are explicitly organisation- and module-scoped. Composite foreign keys prevent references to a project in another tenant/module.
- Both tables enable RLS; anonymous users have no grants. Tenant members can read. Mutations use role-checked, security-definer RPCs with an empty search path, current-user actor attribution and atomic audit records.
- No direct table insert/update/delete grants exist for authenticated users. Readers cannot mutate records through the API or RPCs.
- Scenarios are immutable. Projects are reversibly archived, not deleted. The engine uses validated inputs and no live external calls or random results.
- A snapshot includes full model inputs, source notes, project context, engine version, formulas, assumptions, warnings and result tables.
- Canonical input JSON is SHA-256 hashed. A domain-separated HMAC binds organisation, module, project, scenario name, inputs, result, snapshot and hash. Display/export verifies integrity and fails closed with HTTP 409 on tampering. This is server integrity protection, **not** an independent engineering certification or public digital signature.
- Increment the engine version for any subsequent numerical/methodological change. Keep older stored snapshots; do not silently recalculate them under a new model.
- The API enforces existing Origin/CSRF checks and write rate limits. Scenario JSON has a dedicated 512 KiB maximum; unrelated routes retain their existing limits.

## Reports and current limits

- CSV/Excel/JSON include all result rows and complete inputs. CSV spreadsheet-formula prefixes are neutralised; Excel values are stored as values, not executed formulas.
- The PDF is an explicitly labelled **screening summary**: metrics, provenance, formulas, assumptions, warnings and up to the first 50 rows **per result table**. It states the count and directs users to complete CSV/Excel/JSON downloads. It does not silently represent a truncated dispatch table as complete.
- Workspace lists currently support 250 projects and 250 scenarios per module. An overflow produces an explicit error rather than silently hiding records; pagination is future work.
- No project attachments, provider feed, automated sizing/optimisation, degradation or bankable engineering study is included. Existing private storage and Energy Management imports remain unchanged.
- The authenticated workspace is English-only. Existing corporate translations remain review drafts; they are not independently certified technical translations.
- Existing release prerequisites still apply: confirm real verification/recovery emails, approved production redirect allowlists and the public domain. Successful synthetic-account checks do not establish real inbox delivery or production readiness.

## Verification commands

```sh
# Pure engineering models: hand calculations, bounds, losses, balances and reproducibility.
pnpm --filter @workspace/api-server run test:engineering

# Existing Energy Management regression.
pnpm --filter @workspace/api-server run test:energy

# Live Supabase/API checks: isolated synthetic tenants, positive controls and foreign denials.
# Development only: creates temporary verified test users; never run on production/customer data.
pnpm --filter @workspace/api-server exec node scripts/test-platform.mjs --energy --engineering

# Add --keep only for a deliberate signed-in browser pass, then always remove its fixtures:
pnpm --filter @workspace/api-server exec node scripts/test-platform.mjs --cleanup

pnpm --filter @workspace/geit-website run test:platform
pnpm --filter @workspace/geit-website run check:localization
pnpm run typecheck
```

The synthetic cases live exclusively in the automated test fixture module, not in the customer UI, and are labelled non-customer data. Expected reference values include 9,600 kWh/year solar output for 10 kWp, 1,200 kWh/m²/year POA and PR 0.8; and the three-interval battery case with 5 kWh AC charge, 9 kWh AC discharge, 3 kWh grid import and 5 kWh grid export at unity efficiency.
