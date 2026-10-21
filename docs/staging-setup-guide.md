# GEIT Energy DT — staging source package setup

## What is prepared

`scripts/prepare-staging-source.py` prepares a source-only directory and ZIP:

- `generated-artifacts/geit-energy-dt-staging-source/`
- `generated-artifacts/geit-energy-dt-staging-source.zip`

This is an **import source**, not a new hosted application or an isolated runtime.
Do not run it inside the current workspace: a different directory still inherits
the current process environment. No secrets, database connections, migration
runs, fixtures, deployments or authenticated tests are part of packaging.

The copy includes the current tracked application/library source and public
website assets, plus explicitly listed new staging files. It excludes environment
files, local approvals, Git history, private agent context, raw attachments,
screenshots, dumps, uploads, dependencies and builds. Raw image-regeneration
scripts can still refer to excluded attachments; the already prepared public
website images are included. No image regeneration is required for normal builds.
Historical HTML audit reports are excluded; they remain in the original project.

Only the copy receives a replacement `.replit`, a disabled `scripts/post-merge.sh`
and staging safety instructions in `replit.md`. No artifact service definitions
are edited. Review the included manifest for file hashes and copy replacements.
The known-pattern credential scan is supplementary, not a security certification.

## Operator procedure — stop at each approval boundary

### 1. Import into a separate application

Use the ZIP/source directory to create a **new** Replit application/workspace,
not a branch or subdirectory running with this application's credentials.
The root of the new application must be the directory containing `.replit`,
`package.json` and `pnpm-workspace.yaml`, not their parent ZIP folder.
Do not import Secrets, connector credentials, custom-domain settings, database
contents, customer files or production deployment settings.

Do not publish or start services automatically. Confirm in the imported copy:

- `.replit` has no existing `SUPABASE_URL` and no post-merge hook.
- `scripts/post-merge.sh` refuses automatic setup/schema writes.
- `GEIT_ENVIRONMENT=staging`, `GEIT_ALLOW_TEST_FIXTURE_WRITES=no`,
  and `GEIT_AI_ENABLED=false`.
- The real `config/staging-approval.json` is absent; the example is unapproved.
- `/api` will route only to that new application's API.

Source metadata preserves existing routing declarations and public branding.
The operator must review/register the copied services in the new workspace.
This package does not create or register them in a remote workspace.

### 2. Provision only new non-production dependencies

Use the independently created Supabase project `geit-energy-saas-staging`.
Obtain its actual project reference from its dashboard: the display name is not
the reference. Confirm the endpoint, publishable key and database connection
belong to that project, not to the protected existing project.

In the new Replit application, provision a **new empty non-production legacy
database** so the managed `DATABASE_URL` is supplied there. Do not copy or manually
overwrite the existing application's managed DATABASE_URL. Do not point it at
the Energy DT Supabase database. The API imports this dependency at startup;
preparing its schema is a separate, later-approved action, not an import step.

Generate a new, secure random **32+ character staging SESSION_SECRET** through
an approved secret-generation/management process. Never reuse the production
key or expose it in command output. Keep it stable and consistent across the
staging API and test process.

### 3. Enter staging-only configuration securely

Use the new application's Secrets/settings, not this workspace and not source:

| Variable | Staging value |
| --- | --- |
| `SUPABASE_URL` | `https://<confirmed-staging-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key from that staging project |
| `SUPABASE_DB_URL` | Direct/session-pooler PostgreSQL URI for that staging project |
| `SESSION_SECRET` | Independently generated staging secret |
| `PLATFORM_ORIGIN` | Exact new staging HTTPS application origin, no path |
| `DATABASE_URL` | Managed connection to the newly provisioned non-production legacy database |
| `GEIT_TEST_SUPABASE_PROJECT_REF` | Independently confirmed 20-character staging ref |
| `GEIT_ENVIRONMENT` | `staging` |
| `GEIT_STAGING_APPROVAL_FILE` | Correct absolute runtime path to the reviewed local approval |
| `GEIT_ALLOW_TEST_FIXTURE_WRITES` | `no` or absent; never enabled by packaging or preflight |
| `GEIT_AI_ENABLED` | `false` |

Retain the new workspace's managed PORT/BASE_PATH. Review development, shared
and later published environment scopes independently. Do not request or enter
these values in the live project. No service-role key or browser-visible
database variable is required.

### 4. Independently review identity before approving the manifest

After permission to run local configuration checks, in the new application only:

```sh
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --candidate
```

This reads only its own environment and makes no network/database requests.
It prints project/origin and non-secret hashes, not passwords/signing secrets.

An operator must independently verify:

1. **Supabase project:** dashboard confirms the new staging project reference,
   endpoint and publishable-key association.
2. **Database target:** dashboard connection details match that reference;
   separately confirm the legacy database was newly provisioned in the new
   workspace, is non-production and has no customer data.
3. **API origin:** belongs to the new staging application and its `/api` routes
   point to the staging backend, never the existing API.
4. **Test process:** runs in the separate staging workspace, has explicit staging
   values, and uses the same reviewed project, database targets and origin.
   NODE_ENV alone does not establish isolation.

Do not read or copy production credentials to make these comparisons. The
candidate's self-consistent values cannot independently prove non-production.

Copy `config/staging-approval.example.json` to `config/staging-approval.json`.
Fill only independently checked fields, assign a new non-secret random 32-hex
isolation ID, and set `independentlyVerified: true` only after that review.
Do not copy an approval from another application. Ensure its runtime path exists.
Then, after permission:

```sh
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --local
```

### 5. Build/start verification requires separate approval

No build or test was executed while producing the package. The new safeguards
include offline regression tests; execute type/build checks and those tests only
after review/approval. Start only the new application's managed services.

Then, from the approved staging QA environment, with fixture writes disabled:

```sh
pnpm --filter @workspace/api-server exec node scripts/staging-preflight.mjs --api
```

The staging-only identity endpoint returns a fresh HMAC challenge binding the
API's project ref, origin, both database-target fingerprints, publishable-key
fingerprint and isolation ID to the independent staging signing secret.
It does not contact a database or Auth/Storage provider. Wrong signatures,
targets, manifests, origin responses and redirects fail verification.

The fixture harness repeats this verification **before every run, including
cleanup, and before any database connection**. Existing write-approval guards
remain mandatory. Neither the helper nor the package enables fixture writes.

These checks establish configuration agreement, not actual DB credentials,
contents, schema, RLS behaviour or provider security settings. Do not claim
isolation until the independent review and applicable runtime checks are done.

### 6. Stop before schema and authenticated QA

Do not run migrations, SQL writes, schema push, fixture creation/deletion,
authenticated integration tests or publishing yet. Obtain separate approval.

In Supabase, still review email/password provider, email confirmation, delivery,
rate limits, password/session policies, Site URL and exact callback allowlist:

- `<staging-origin>/app/auth/callback`
- `<staging-origin>/app/auth/callback?flow=recovery`

Later-approved migrations 001–006 create application tables, RLS/RPC policies
and `geit-private-documents`. Do not manually pre-create the bucket. Database
and Storage-byte backup/recovery configuration also needs separate review.

See `docs/staging-isolation.md` and `docs/qa-staging-workflow.md` for the later
approval gates and QA procedures. The migration runner is not protected by the
fixture-write flag: do not invoke it without independent target verification
and explicit migration approval.
