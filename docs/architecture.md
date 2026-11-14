# GEIT applications — architecture after the Energy DT separation (Nov 2026)

GEIT runs two independent applications, connected only by links.

| | GEIT corporate website | Energy DT |
| --- | --- | --- |
| Repository | `IET-Oy/GEIT-Corporate-Website` (this one) | `IET-Oy/Energy-DT` |
| What it is | Public company website, incl. the `/energy-dt` information page | AI-powered energy digital twin SaaS application |
| Runtime | Static files (React/Vite build) | Static SPA + Node.js function for `/api/*` (Express) |
| Hosting | geit.rw on register.rw cPanel (`deploy/geit-rw`) | Vercel (`vercel.json`) |
| Data | None (contact form is validation-only) | Existing Supabase project `ahtoaubpffxbgkydguxi` (Auth, Postgres + RLS, Storage) |
| Secrets on the server | None | `SESSION_SECRET`, Supabase publishable key, optional AI key (Vercel env vars) |

```
geit.rw (static)                          Energy DT (Vercel)
 ├─ /energy-dt  info page ── Launch ───►  /app            workspace
 ├─ /app/*  "has moved" ── forwards ───►  /app/*          same path
 └─ FAQ sign-in links ───────────────────►  /app/sign-in
                                          /api/*  ──► Supabase
Energy DT header/footer ── links ──► geit.rw, /privacy-policy, /terms-of-use
```

## Coupling points (configuration only)

- Corporate build: `VITE_ENERGY_DT_URL` = Energy DT HTTPS origin. Drives the
  Launch/Create-account buttons, FAQ sign-in links and `/app/*` forwarding. If
  unset, Launch falls back to the contact page and `/app/*` shows a notice.
- Energy DT build: `VITE_CORPORATE_SITE_URL` (default `https://geit.rw`).

Neither repository imports the other's code. Each has its own copy of what it
needs (Energy DT keeps the OpenAPI contract and generated clients; this
repository keeps a trimmed contract for health and the legacy enquiry API).

## What stayed here

- `artifacts/geit-website` — the corporate site.
- `artifacts/api-server` — health check and the **legacy, unused** enquiry
  endpoint (`POST /api/enquiries`, optional `DATABASE_URL`). The website does not
  call it and the geit.rw deployment does not run it.
- `artifacts/geit-energy-dt-film`, `artifacts/mockup-sandbox` — marketing film and design sandbox.

Energy DT's history before the split remains in this repository's Git history
(up to commit `949b09f`).
