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

Helpers that share synthetic users with a browser pass must end only their own
Supabase session, never all sessions for the account.

**Why:** Supabase `signOut()` defaults to global scope. A concurrent database
verification helper invalidated the browser's otherwise valid session, causing a
misleading verified-email error midway through a working import/analysis journey.

**How to apply:** Use `signOut({ scope: "local" })` in overlapping test helpers,
and defer fixture deletion until the browser pass ends. Distinguish test-session
interference from a product authentication failure before changing auth logic.

An identity-provider outage is not an invalid session.

**Why:** The provider SDK can resolve with a null user and a retryable error rather than throwing. Ignoring that error made a temporary upstream failure clear otherwise legitimate customer cookies.

**How to apply:** Classify transient provider failures before user/credential validation, including after refresh or code exchange. Return a safe 503 and preserve cookies; reserve session clearing for confirmed invalid authentication.
