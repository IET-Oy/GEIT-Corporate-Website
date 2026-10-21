# Safe GEIT QA workflow

## Checks that do not write remote fixtures

```sh
pnpm --filter @workspace/api-server run test:safe
pnpm --filter @workspace/geit-website run test:platform
pnpm --filter @workspace/geit-website run check:localization
pnpm --filter @workspace/mockup-sandbox exec node --test tests/*.test.mjs
PORT=5173 BASE_PATH=/ pnpm run build
pnpm --filter @workspace/api-server run test:production
pnpm --filter @workspace/api-server exec tsx scripts/benchmark-safe.ts
pnpm --filter @workspace/api-server run audit:source
```

The explicit PORT and BASE_PATH above are build-time shell inputs, not deployment configuration. Managed workflows supply their own values. The production smoke command launches an isolated loopback process and does not certify a published deployment. Safe tests substitute synthetic provider responses where required; they do not prove live database RLS.

`audit:database` uses the configured external database in a read-only transaction. It checks metadata, migration checksums and security configuration, not customer records. A successful metadata audit does not prove tenant isolation under real identities.

## Explicit approval before remote writes

See [staging-isolation.md](staging-isolation.md) for the separate-workspace
configuration and approval procedure. The harness now requires explicit staging
mode, an independently reviewed identity approval, and a successful signed
challenge from the actual staging API before connecting, even for cleanup.
Do not run these commands until that preparation and separate write approval
are complete.

Do not run integration fixtures against an unclassified connection. A development process can still connect to production. The fixture commands now fail before connecting unless all of these are true:

1. An operator independently confirms a **dedicated, disposable non-production Supabase project** and the application origin served by an API configured for that same project. Prefer a separate staging workspace, not temporarily repointing a shared running application.
2. Configure that staging workspace's SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_DB_URL through Secrets. Never paste credentials into commands or reports. The connection helper additionally checks the database host/project association.
3. Set non-secret `GEIT_TEST_SUPABASE_PROJECT_REF` to the exact 20-character staging project reference.
4. Set non-secret `GEIT_ALLOW_TEST_FIXTURE_WRITES=yes` only in that approved staging workspace. NODE_ENV must not be production.
5. Configure PLATFORM_ORIGIN to the staging HTTPS application origin. Verify it is not the live application. Apply the reviewed repository migrations to staging using the existing migration runbook, not by editing historical migrations.
6. Run and record:

```sh
pnpm --filter @workspace/api-server run test:platform
pnpm --filter @workspace/api-server run test:energy:integration
pnpm --filter @workspace/api-server run test:engineering:integration
pnpm --filter @workspace/api-server run test:sustainability:integration
```

These commands **create and delete synthetic auth accounts, tenant records and storage objects**. The main harness owns cleanup. If fixtures must remain for a browser pass, use the documented harness `--keep` flow, complete the browser pass, then `--cleanup` against the same approved project. Never reuse customer accounts or share fixture files. Run overlapping test sessions with local-scope sign-out only. Remove GEIT_ALLOW_TEST_FIXTURE_WRITES after use.

Approval flags are an operator safety gate, not an independent proof that a project is non-production. They must never be set automatically from available credentials.

## Required remaining acceptance evidence

- Actual inbox signup verification, login, recovery, new/old password behaviour, logout and session revocation in the same browser.
- Two tenant organisations and every supported role: positive own-tenant CRUD and foreign-tenant denial via HTTP, direct PostgREST RPC/table access, and private Storage bytes.
- Reload persistence for sites, meters, tariffs, imports, saved analyses, six engineering/sustainability modules and exports.
- Concurrent same-meter overlapping commits, retrying the same commit, archive/import races, last-owner role changes, transaction rollback after a later invalid row; inspect the database after each run.
- Private bucket MIME/size rejection, cross-tenant list/download/delete denial, object-byte cleanup, interrupted upload/retry and concurrent uploads. There is no general document-library upload UI.
- Representative authenticated HTTP concurrency with p50/p95/p99, event-loop delay, memory, database query plans/locks, connection saturation and realistic simultaneous exports. Do not direct stress traffic at production.
- Backup/PITR and Storage-byte restore into another disposable project, signing-key recovery and historical-report verification.
- Full assistive-technology and keyboard review; low-powered physical device performance.
- Configure and validate real streaming, AI or billing only if those products/providers are actually enabled. No invented endpoints, fake checkout success or fabricated live events.

See `qa-security-audit-2026-10-20.html` for the executed results and remaining launch blockers.
