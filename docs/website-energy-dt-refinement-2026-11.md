# GEIT website and Energy DT refinement — November 2026

Branch: `claude/ecstatic-planck-9rr0km`. Not merged, published or deployed.
No database migrations were written or applied. No production records,
tables, storage buckets or environment settings were changed.

## Corporate website

- **One navigation level.** Home | About | Services | Industries & Solutions |
  Energy DT | Insights | Contact now share one header row on desktop
  (≥1024 px) and the same order in the tablet/mobile menu. The separate dark
  secondary bar (`platform/app-nav.tsx`) and its `ResizeObserver` alignment
  code were removed. Energy DT links straight to `/energy-dt` (the legacy
  `/energy-saas` redirect is kept) and stays highlighted across `/app/*`.
- Digital Energy Solutions is no longer a top-level item. The page and route
  are unchanged and remain linked from Industries & Solutions, the homepage
  and the footer.
- Skip-to-content links for keyboard users on corporate and app shells.
- Sitemap now includes `/energy-dt`; `robots.txt` disallows `/app/`.
- Verified in English, French, Kinyarwanda and Swahili at 1024 px: all seven
  links fit beside the language selector without overflow.

## Energy DT

- **Public page** (`/energy-dt`) rebuilt as the AI-Powered Energy Digital Twin
  product page: purpose, target users, the seven service areas (each described
  from what its module actually computes and linked to it), how it works,
  business value, platform foundations, an availability table and the
  existing sign-in/registration/workspace destinations.
- **EV Charging Infrastructure** existed (route, API, calculations, reports)
  but was missing from the workspace sidebar. It is now listed under
  Engineering.
- **Workspace overview** now shows the organisation's own record counts
  (sites, buildings, assets, meters, analyses, open alerts — demo and archived
  rows excluded), an open-alert notice, a getting-started checklist derived
  from those records, and links grouped by service area. It reuses the
  existing authenticated `GET /api/platform/energy/{orgId}` call and has
  loading, error/retry and permission states. No sample figures are shown.

## Replit notification

The repository's only notification-style integration was
`@replit/vite-plugin-dev-banner`, which injects a fixed banner into pages
served on `*.replit.dev` preview domains. It was removed from the website and
video artifacts, the workspace catalog and the lockfile. The runtime-error
overlay and cartographer plugins are dev-server-only (`apply: serve` /
non-production) and are not present in the production bundle. The built
`dist/public` contains no Replit scripts.

The repository contains no other feedback widget. If a feedback prompt or
"Made with Replit" badge still appears on the published `*.replit.app`
domain, it is injected by Replit hosting, not by this code; disable it in the
Replit deployment settings. The published domain could not be reached from
this environment, so it was not inspected.

## Remaining incomplete or externally dependent

| Item | Dependency |
| --- | --- |
| Recommendations workflow | Still a planned placeholder; needs a product decision on scope. |
| AI-assisted explanations | `GEIT_AI_ENABLED=true`, `OPENAI_API_KEY`, `GEIT_AI_MODEL`. |
| Live meter/BMS/SCADA/IoT data | Not implemented; data enters via CSV/Excel import. |
| Supabase connectivity | Configured hostname previously failed DNS (see `energy-dt-stabilization.md`); not rechecked. |
| Email confirmation/recovery, backups, shared rate limiting | Release gates in `production-readiness-audit.md` remain open. |
| Sitemap generation | Requires `VITE_PUBLIC_SITE_URL` once the public domain is confirmed. |

## Verification (local, synthetic)

- Root typecheck and recursive production build: passed (Replit-managed
  `PORT`/`BASE_PATH` supplied locally).
- API safe tests: 99/99 (with dummy local env; no live Supabase).
- Website platform 61/61, reports 3/3, auth UI 11/11, EV form 3/3 (via tsx),
  localisation 4 languages × 22 routes.
- Production-preview browser crawl: 23 routes × 1440/820/390 px — no console
  errors, broken images, horizontal overflow or Replit banner; corporate pages
  load without sign-in; all seven nav links route and highlight correctly.
- Overview dashboard checked in a browser with intercepted synthetic API
  responses only. This is not evidence of live tenant data, RLS or auth.

Stale tests fixed: three website tests predated the EV Charging module and
one API test predated the buildings/assets tables (energy workspace now reads
nine tables, not seven).
