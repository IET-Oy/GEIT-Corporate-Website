# Hosting the GEIT corporate website on geit.rw (register.rw)

The corporate website is a **static site**. It needs no Node.js, database or
environment secrets on the server. Energy DT is a separate application
(repository `IET-Oy/IET-Oy-Energy-DT`, not yet deployed); this site only links to it.

## 1. Build the package

```bash
corepack pnpm install --frozen-lockfile
VITE_ENERGY_DT_URL=https://<energy-dt-domain> node deploy/geit-rw/build-package.mjs
```

`VITE_ENERGY_DT_URL` is the HTTPS origin of the Energy DT deployment (no path),
for example `https://energy-dt.vercel.app` or `https://app.geit.rw`. It is baked
into the build and powers the "Launch Energy DT" button. Without it the button
falls back to "Request access", which links to the contact page.

Output: `deploy/out/geit-rw-static.zip` (website, `sitemap.xml`, `robots.txt`
and `.htaccess` for HTTPS, page routing and caching).

## 2. Upload (cPanel)

1. **SSL/TLS Status** → run **AutoSSL** for `geit.rw` and `www.geit.rw`
   (DNS must already point to the cPanel server).
2. **File Manager** → `public_html` → upload `geit-rw-static.zip` → **Extract**
   (enable "Show Hidden Files" to see `.htaccess`). Replace existing files.
3. Visit `https://geit.rw`, `https://geit.rw/energy-dt` and refresh a deep link
   such as `https://geit.rw/services/energy-management`; it must not 404.

## Updating later

Rebuild the package and extract it over `public_html` again. If the Energy DT
URL changes, rebuild with the new `VITE_ENERGY_DT_URL`.

## Old Energy DT links

`https://geit.rw/app/...` addresses (bookmarks, earlier account emails) show
"Energy DT has moved" and forward to the same path on `VITE_ENERGY_DT_URL`.
