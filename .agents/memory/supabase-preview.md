---
name: Supabase and preview trust boundaries
description: Environment-specific TLS, cookie and email-link caveats for phased SaaS work.
---

Keep database certificate verification enabled when inspecting or migrating Supabase.
The development environment did not trust Supabase's database CA by default.

**Why:** Correct connection credentials reached the server but initially failed
with SELF_SIGNED_CERT_IN_CHAIN. Installing trust in the official Supabase CA
allowed a verified connection; disabling TLS verification was unnecessary.

**How to apply:** Treat certificate-chain errors separately from bad credentials.
Use Supabase's documented CA over verified HTTPS; do not ask the user to keep
replacing working credentials or silently weaken TLS.

The development preview can rewrite emitted SameSite=Lax cookies to SameSite=None
for iframe use. Secure and HttpOnly were retained in observed proxied responses.

**Why:** End-to-end checks saw a different SameSite attribute from the one emitted
by Express. A strict Lax-only browser assertion misdiagnosed this as an app error.

**How to apply:** Verify server intent separately from proxied attributes and retain
explicit exact-origin/custom-header CSRF protection. Never treat SameSite alone
as sufficient protection or assume development proxy behaviour is production behaviour.

Do not infer email-link correctness from seeded verified test accounts.

**Why:** Database/API/browser testing can establish sessions and tenant isolation
without exercising a real inbox or Supabase's redirect allowlist.

**How to apply:** Keep actual verification/recovery delivery as an explicit phase
gate. Report it unverified until a real same-browser PKCE email round trip succeeds.
