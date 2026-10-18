# Carbon Footprint and AI & Digital Energy

These modules extend the existing corporate website and authenticated GEIT workspace. They reuse real Supabase organisations, roles, immutable engineering scenarios, integrity signatures, exports and Energy Management imports. No replacement database, placeholder authentication, fabricated factor catalogue or simulated data connection is introduced.

Routes:

- `/app/carbon-footprint`
- `/app/digital-energy`

## Setup and migration

Keep the existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`, `SESSION_SECRET`, `PLATFORM_ORIGIN` and managed `PORT` configuration. Runtime queries use each authenticated user's JWT, never the owner database connection. See `engineering-modules.md` for the foundation and immutable-result signing requirements.

```sh
pnpm install
pnpm --filter @workspace/api-server run db:migrate:platform
pnpm --filter @workspace/api-server run test:sustainability
pnpm --filter @workspace/api-server run test:sustainability:integration
pnpm run typecheck
PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run build
```

The new migrations extend the allowed project modules, create the private factor registry and enforce its required shape in PostgreSQL as well as Express. Applied migrations are checksum-protected; never edit them after application. Restart the existing API/website workflows after installation.

### Optional AI configuration

AI is **off by default**. All accounting, forecasting, anomaly assessment, charts, saved scenarios and exports work without it. No live energy-data connector is configured either.

To deliberately enable the implemented direct OpenAI Responses API adapter, configure these **server-only** settings:

| Setting | Meaning |
|---|---|
| `GEIT_AI_ENABLED` | Exactly `true`; otherwise no provider calls occur |
| `OPENAI_API_KEY` | Provider credential in workspace Secrets, never browser code |
| `GEIT_AI_MODEL` | An account-available Responses model supporting strict JSON-schema output; no model is silently selected |

Use the workspace's integration/Secrets flow when configuring credentials. No AI provider was configured or enabled during implementation, and no paid live-provider call was made.

The endpoint is fixed to `https://api.openai.com/v1/responses`; users cannot supply a provider URL, key or model in a request. Each invocation requires an explicit consent checkbox and a question about a selected saved scenario. Requests are limited by the existing CSRF/write protections and additionally to five AI calls per account per minute. Review provider billing, data-processing terms and retention before enabling. `store: false` is requested; it is not a promise about all provider-side retention.

## Carbon customer workflow

1. Select an organisation and open Carbon Footprint.
2. Add a factor from an approved reference. There is intentionally no seeded “official” dataset.
3. Enter code/name, numeric value, activity denominator, emissions numerator (`kgCO2e` or `tCO2e`), scope/category, geography, source description, HTTPS reference URL, GWP basis and validity dates.
4. Save. The server assigns a new local immutable version. “New version” copies metadata into a new form; it does not edit the previous version. Include the publisher's actual edition/version in the source description—the local version number is not a claim about a publisher release.
5. Create a project with a facility/boundary, client problem, scope and reporting context.
6. Enter the inventory interval, boundary and data provenance. Start dates are inclusive; end dates are **exclusive**.
7. Add activity quantities and explicitly select a factor version for each. Check activity/fuel correspondence, geography, denominator, scope and category.
8. Select either location-based or market-based Scope 2 accounting. A mixed inventory is rejected. To compare methods, create distinct appropriately sourced scenarios; this is not an automatic dual-method disclosure.
9. Optionally enter one labelled activity reduction percentage per activity. Save to calculate the baseline and proposed inventory.
10. Review missing scopes, excluded categories, factor provenance and warnings. Reopen/reload the saved scenario, revise as a new scenario, compare or export.

### Supported accounting boundary

| Scope | Supported activity-based categories |
|---|---|
| Scope 1 | Stationary combustion, mobile combustion, fugitive and process emissions |
| Scope 2 | Purchased electricity and heat, with an explicit location-/market-based factor |
| Scope 3 | Purchased goods, upstream fuel/energy, waste, business travel, employee commuting, upstream transport and downstream transport |

This is **not all fifteen Scope 3 categories**, complete corporate GHG reporting, lifecycle assessment, verification or certification. Employee commuting/business travel/transport require an appropriate physical factor; the system does not infer passenger occupancy, vehicle type or freight load. Spend-based accounting, gas-by-gas GWP calculation, offsets, removals and exported-energy credits are not implemented. Factor references and suitability are user-supplied and labelled unverified.

### Units, validity and calculations

Accepted activity units: `kWh`, `MWh`, `GJ`, `L`, `m3`, `kg`, `km`, `passenger_km`, `tonne_km`.

- Energy denominators convert through kWh: `1 MWh = 1,000 kWh`; `1 GJ = 277.777777… kWh`.
- Other units must match exactly. No density, standard gas conditions, fuel substitution, passenger occupancy or currency conversion is invented.
- The selected factor must cover the **whole** inventory interval. Split inventories across factor-validity periods instead of silently extrapolating.
- Geography matches case-insensitively after trimming. An explicitly `GLOBAL` factor may apply globally; region/country equivalence is not guessed.
- Factor scope/category must match its activity. Electricity factors require energy denominators.
- GWP bases are preserved. Mixed bases trigger a warning; harmonisation and professional review remain necessary.

```
baseline kgCO2e =
  activity converted to factor denominator
  × factor value
  × 1,000 if the emissions numerator is tCO2e

proposed kgCO2e = baseline × (1 − activity reduction % / 100)
scope/category totals = sum of the explicitly included activities
```

Unentered scopes are **Unavailable**, not assumed zero. Explicitly entered zero activity can legitimately produce zero emissions. Reductions are prospective changes to activity with the original factor held constant—not claims of achieved or verified savings. No offset is subtracted from gross emissions. Avoid overlapping boundaries or counting combustion plus a full lifecycle factor twice.

## Digital twin customer workflow

1. In Energy Management, create a real site and separate gross-building-load and solar-generation meters.
2. Import measured interval data through its existing validated CSV/Excel preview and commit flow. The existing import template is available there. Demo meters are deliberately excluded from twin sources.
3. In Digital Energy, create a project and select the authorised building meter. Confirm it measures **gross AC demand**, not solar-netted grid imports.
4. Select a measured PV meter if available. Building/PV meters must be at the same site, with exactly aligned interval boundaries. Missing PV is never filled with zero.
5. Set the analysis window using ISO timestamps with `Z` or an explicit offset. Use whole imported intervals. The maximum window is 366 days, with 5,000 readings per stream (10,000 combined).
6. Optionally configure a solar-plus-battery counterfactual. Battery replay requires a real PV series, contiguous intervals, SOC limits, power limits, separate one-way efficiencies and a dispatch mode.
7. Set the forecast horizon (1–168 hours) and robust-anomaly threshold multiplier (2–10), and document data sources/boundaries.
8. Save. Review measured history separately from simulated dispatch and forecast. Missing-data/insufficient-history warnings remain visible.
9. Reload the saved snapshot, compare a new configuration as a separate scenario, or export full inputs/results/provenance.

The twin is an **energy-balance and data twin**, not a calibrated thermal/BIM model, equipment controller, live IoT connection or a representation of measured battery performance. No weather, occupancy, tariff, asset topology or equipment state is fabricated.

### Historical analytics and battery replay

Stored import-normalised kWh and actual elapsed UTC hours determine consumption, observed average load, interval-average peak, load factor and coverage. Missing energy is not extrapolated.

Hourly aggregation apportions energy uniformly inside each native interval. Incomplete hours are null, not zero. Native history and source rows remain in the snapshot. Charts preserve explicit gaps, and tables/exports retain all rows.

Solar surplus/direct load matching and battery replay reuse the tested baseline dispatch engine:

```
AC charge = min(solar surplus, charge power × h,
                remaining stored capacity / charge efficiency)
AC discharge = min(policy request, discharge power × h,
                   stored energy above reserve × discharge efficiency)
new stored kWh = previous stored kWh
                 + AC charge × charge efficiency
                 − AC discharge / discharge efficiency
load + AC charge + grid export = solar + AC discharge + grid import
```

No grid charging, battery exports, advanced optimisation, battery degradation or economics are implied. Twin reports do **not** display zero-price costs or invent ROI: no tariff is supplied. Initial/final energy differences and infeasible peak targets are explicitly warned about.

### Forecasting gate and backtest

Forecasts require at least **35 complete consecutive days** at hourly or finer native resolution, ending on a UTC-hour boundary.

- Forecast: mean of the four previous same-UTC-hour-of-week values.
- Horizon: at most the next 168 hours; no recursively generated observations are used.
- Backtest: the last seven days are held out and predicted from the earlier four weeks.
- Outputs: MAE, RMSE and WAPE. WAPE is unavailable when holdout demand is zero.
- Bands: forecast ± the holdout 95th-percentile absolute error, floored at zero. These are empirical error bands, not guaranteed/calibrated confidence intervals.
- WAPE above 30% warns that accuracy is weak.

Insufficient, gapped, coarse or misaligned history withholds forecasts with an explanation. No placeholder curve is shown. This is a transparent seasonal baseline, not a trained neural model or a weather-aware forecast.

### Anomaly assessment

Each complete hour needs four earlier complete weekly observations:

```
expected = median(previous four same-UTC-hour-of-week kWh)
MAD = median(abs(previous values − expected))
threshold = max(multiplier × 1.4826 × MAD, 20% of abs(expected), 0.1 kWh)
flag high/low only when abs(actual − expected) exceeds threshold
```

Without sufficient history the assessment is unavailable, not “no anomalies.” Flags are screening observations, not diagnoses or independently confirmed faults. No automated operational action or email alert is triggered.

## Provenance, tenant security and optional AI

- Project/scenario access uses existing tenant-scoped RLS, role checks, module-specific composite parent keys and authenticated cookie/CSRF protections.
- The factor registry is private to the tenant; authenticated users have SELECT only. Role-checked RPC creation assigns immutable versions, serialises version allocation and writes an audit event.
- PostgreSQL also checks required metadata shape so direct RPC callers cannot bypass Express required-field checks.
- Readers can inspect factors/reports and request optional read-only AI evidence with consent, but cannot create factors, projects or scenarios.
- Carbon provenance freezes every factor's complete definition/local version and a factor-dataset hash.
- Twin provenance freezes actual source meters, import IDs, reading IDs, original quantities/units, normalised kWh, history window and a source-dataset hash.
- Scenario input hash, engine version and domain-separated result HMAC bind these snapshots. Display/export verifies authenticity. Original scenarios are never silently recalculated after a factor update or import change.
- Optional AI resolves and verifies the selected authorised scenario **before** making a provider call. It sends only bounded scenario evidence, not JWTs, credentials, bulk reading series or unrestricted database access.
- The provider can return **only whitelisted evidence IDs**. Displayed facts/numbers are rendered from the verified saved result. Unknown/duplicate IDs, extra generated claims, malformed output and provider failures fail closed.
- AI has no tools, arbitrary URL access, SQL access, calculation authority or write authority. The question is untrusted input. Answers cite evidence IDs and the saved input hash, remain optional and are not stored as new calculation results.
- API request bodies, source readings, factor data, AI questions and provider error bodies are not logged.

## Reports and practical limits

CSV/Excel/JSON contain full source provenance and result tables; PDF is a clearly labelled screening summary with the first 50 rows per result table. Raw inputs and full historical/factor snapshots remain available in the complete exports. CSV formula prefixes are neutralised, and Excel cells are values rather than executable formulas.

Report buttons show preparation progress and errors rather than navigating away from the workspace. If the browser blocks an automatic download, use the explicit **Download again** link once the file is prepared. Prepared files are held only in memory and released when leaving the report; no customer report is put in browser storage.

Current list bounds: 250 projects/scenarios per module, 500 factor versions and 500 sites/meters in the selector. Oversized lists produce explicit errors instead of silently hiding records. Pagination and large-dataset/background export processing are future work. Full-provenance Excel reports may be large.

The workspace remains English-only. The existing real email-verification/recovery and public-domain setup gates still apply. A successful synthetic-account test is not proof of real inbox delivery or production readiness.

## Tests

```sh
pnpm --filter @workspace/api-server run test:sustainability
pnpm --filter @workspace/api-server run test:engineering
pnpm --filter @workspace/api-server run test:energy
pnpm --filter @workspace/api-server run test:pkce
pnpm --filter @workspace/geit-website run test:platform
pnpm --filter @workspace/geit-website run check:localization
pnpm run typecheck

# Development only: isolated synthetic verified users, tenant records and real CSV imports.
pnpm --filter @workspace/api-server exec node scripts/test-platform.mjs --energy --engineering --sustainability

# --keep retains fixtures exclusively for a signed-in browser pass. Clean up afterwards:
pnpm --filter @workspace/api-server exec node scripts/test-platform.mjs --cleanup
```

Synthetic factors and historical profiles live only in test fixtures and are explicitly labelled non-official/non-customer data. They are not a customer-facing demo catalogue. Automated AI tests use mocked HTTP responses; a live provider response, billing and provider-side retention have **not** been verified.
