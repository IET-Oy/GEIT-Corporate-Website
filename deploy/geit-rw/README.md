# Hosting GEIT on geit.rw (register.rw)

This bundle runs the **corporate website and the Energy DT application in one
Node.js process**. The API serves `/api/*`; every other path serves the built
website, so `https://geit.rw/` and `https://geit.rw/app/...` work from the same
origin (required for Energy DT's secure cookies).

## 0. Check your register.rw hosting plan

| Plan feature | What works |
| --- | --- |
| cPanel with **"Setup Node.js App"** (Node 20.12+; 22 recommended) | Everything: website + Energy DT. Use steps 1–6. |
| Static/PHP-only hosting (no Node.js) | Corporate pages only. Energy DT sign-in/workspace will **not** work. See "Static-only fallback". |
| VPS | Everything. Run `npm install --omit=dev && npm start` behind Nginx/Apache with HTTPS. |

If the cPanel "Software" section has no **Setup Node.js App**, ask register.rw
support to enable Node.js on the plan or upgrade to one that has it.

## 1. Build the bundle (on a computer with the repository)

```bash
corepack pnpm install --frozen-lockfile
node deploy/geit-rw/build-package.mjs
```

This produces `deploy/out/geit-rw-node.zip` (website built for
`https://geit.rw`, including `sitemap.xml` and `robots.txt`).

## 2. Point geit.rw at the hosting and enable HTTPS

- If geit.rw uses register.rw nameservers on the same account, the domain
  already points at the hosting. Otherwise set an `A` record for `geit.rw`
  and `www` to the server IP shown in cPanel.
- cPanel → **SSL/TLS Status** → run **AutoSSL** for `geit.rw` and `www.geit.rw`.
  HTTPS is mandatory: the server refuses to start without an `https://` origin.

## 3. Upload

cPanel → **File Manager** → create `/home/<user>/geit-app` (outside
`public_html`) → upload and extract `geit-rw-node.zip` there.

## 4. Create the Node.js application

cPanel → **Setup Node.js App** → **Create Application**:

- Node.js version: **22** (minimum 20.12)
- Application mode: **Production**
- Application root: `geit-app`
- Application URL: `geit.rw` (leave the path empty)
- Application startup file: `app.cjs`

Then **Run NPM Install** (installs `pdfkit`, `exceljs`, `unzipper`).

## 5. Environment variables

Add these in the application's **Environment variables** section (or copy
`env.example` to `.env` in `geit-app`):

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PLATFORM_ORIGIN` | `https://geit.rw` |
| `SUPABASE_URL` | `https://ahtoaubpffxbgkydguxi.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key |
| `SESSION_SECRET` | **Copy the existing value from Replit Secrets.** A new value makes saved analyses fail signature checks. |

Optional: `GEIT_AI_ENABLED=true`, `OPENAI_API_KEY`, `GEIT_AI_MODEL` for AI
explanations. Leave `DATABASE_URL` unset; without it, only the unused legacy
`/api/enquiries` endpoint returns 503.

Click **Restart**.

## 6. Supabase Auth settings

Supabase dashboard → **Authentication → URL Configuration**:

- Site URL: `https://geit.rw`
- Redirect URLs: `https://geit.rw/app/auth/callback` and
  `https://geit.rw/app/auth/callback?flow=recovery`

Without this, confirmation and password-reset emails link to the wrong site.

## 7. Verify

- `https://geit.rw/api/healthz` returns `{"status":"ok"}`.
- `https://geit.rw/`, `/about`, `/energy-dt` load; refreshing `/energy-dt`
  does not 404.
- Register a test account with a real inbox; confirm the email and sign in at
  `https://geit.rw/app/sign-in`.
- No Replit badge or banner appears (this bundle contains no Replit code).

Logs: cPanel → Setup Node.js App → your app → the log file path shown there.

## Updating later

Rebuild the bundle, upload, overwrite `dist/` and `public/`, then **Restart**.
Keep `.env` and environment variables as they are.

## Static-only fallback (no Node.js)

Upload the contents of `public/` to `public_html/` and rename
`static-only.htaccess` to `public_html/.htaccess`. The corporate pages, contact
details and the Energy DT information page work; the Energy DT application
(sign-in and workspace) does not, because it needs the Node.js API.

## Once geit.rw is live

Turn off or delete the Replit deployment so there is one public copy.
`geit-corporate-website.replit.app` also shows Replit's own hosting badge,
which this bundle does not include.
