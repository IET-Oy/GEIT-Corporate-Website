# GEIT Ltd Corporate Website

A corporate website for Global Energy Innovation Technologies Ltd (GEIT Ltd), with global energy and technology positioning. The user approved extending it into an Energy Intelligence SaaS in phases without rebuilding the corporate site.

## Run & Operate

- `pnpm --filter @workspace/geit-website run dev` — run the public website
- `pnpm --filter @workspace/api-server run dev` — run the API server (managed PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Legacy env: `DATABASE_URL` — existing enquiry PostgreSQL; do not repurpose.
- SaaS env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`.
  The last is for explicit reviewed migrations/tests only, never runtime queries.
- `PLATFORM_ORIGIN` — explicit HTTPS application origin for production auth/CSRF;
  development uses the managed development origin.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/geit-website/` — public React/Vite website
- `artifacts/api-server/src/routes/enquiries.ts` — consultation enquiry endpoint
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/enquiries.ts` — persisted enquiry schema

## Architecture decisions

- The site uses the platform's React/Vite web artifact scaffold rather than the Next.js stack named in the source brief.
- The public consultation form is validation-only and does not send or store enquiries. A separate legacy enquiry API has PostgreSQL persistence code; do not implicitly connect the UI or migrate existing records.
- The SaaS account/organisation foundation uses the configured development Supabase Auth and PostgreSQL. The additive identity migration has been applied; tenant RLS is enabled. Private uploads/storage and eight service modules are later phases. Preserve the legacy database.
- See `docs/geit-saas-architecture.md` for the eight phases, verification results and open gates. Real email confirmation/recovery and redirect allowlists remain unverified; do not claim production readiness or start Phase 3 until addressed.

## Product

GEIT Ltd presents 11 energy consulting and digital service areas, sector solutions, company information, insights, legal pages, and a disconnected consultation form. Corporate routes and styling remain intact while the authenticated application is developed separately under `/app`.

## User preferences

- Use the supplied company facts and brand palette as the source of truth.
- Do not invent clients, completed projects, credentials, awards, partnerships, certifications, energy savings, investment returns, or emissions-reduction figures.

## Gotchas

- Replace origin-neutral sitemap paths with absolute URLs once GEIT's official publication domain is confirmed; do not assume `geit.rw`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
