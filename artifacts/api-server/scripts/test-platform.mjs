import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { connectSupabase } from "./supabase-connection.mjs";

// Isolated, synthetic development fixtures. Never print credentials or reuse customer data.
const fixturePath = "/tmp/geit-platform-test-fixtures.json";
const origin = process.env.PLATFORM_ORIGIN || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const base = `${origin}/api/platform`;
let db;
let fixtures;
async function cleanup() {
  if (!fixtures) return;
  const ids = fixtures.accounts.map((a) => a.id);
  await db.query("delete from public.geit_organisations where id in (select organisation_id from public.geit_memberships where user_id=any($1::uuid[]))", [ids]);
  await db.query("delete from auth.users where id=any($1::uuid[])", [ids]);
  await unlink(fixturePath).catch(() => {});
}
async function request(path, method = "GET", data, jar = new Map(), extra = {}) {
  const r = await fetch(`${base}${path}`, {
    method, headers: {
      Origin: origin, "X-GEIT-Request": "1",
      ...(method !== "DELETE" ? { "Content-Type": "application/json" } : {}),
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...extra,
    },
    ...(!["GET", "DELETE"].includes(method) ? { body: JSON.stringify(data || {}) } : {}),
    signal: AbortSignal.timeout(25000),
  });
  for (const value of r.headers.getSetCookie()) {
    const [pair] = value.split(";"); const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
    assert.match(value, /HttpOnly/i);
    // The development preview proxy may rewrite Lax to None for its iframe.
    assert.match(value, /SameSite=(Lax|None)/i);
    if (origin.startsWith("https:")) assert.match(value, /Secure/i);
  }
  const body = await r.json();
  return { status: r.status, body, headers: r.headers };
}
let count = 0;
function passed(name) { console.log(`PASS ${++count}: ${name}`); }
try {
  db = await connectSupabase();
  if (process.argv.includes("--cleanup")) {
    fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
    await cleanup(); console.log("Synthetic accounts and organisations removed.");
  } else {
    try {
      fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
      await cleanup();
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const suffix = randomUUID();
    fixtures = { accounts: ["A", "B", "Reader"].map((name) => ({
      id: randomUUID(), fullName: `GEIT Test ${name}`,
      email: `geit-test-${name.toLowerCase()}-${suffix}@example.invalid`,
      password: `${randomBytes(24).toString("base64url")}!9a`,
    })) };
    await writeFile(fixturePath, JSON.stringify(fixtures), { mode: 0o600 });
    for (const a of fixtures.accounts) {
      await db.query(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
        confirmation_token,recovery_token,email_change_token_new,email_change,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
        values('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,extensions.crypt($3,extensions.gen_salt('bf')),now(),
        '','','','','{"provider":"email","providers":["email"]}',$4::jsonb,now(),now())`,
        [a.id, a.email, a.password, JSON.stringify({ full_name: a.fullName })]);
      await db.query(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
        values($1::text,$1::uuid,$2::jsonb,'email',now(),now())`,
        [a.id, JSON.stringify({ sub: a.id, email: a.email, email_verified: true })]);
    }
    await writeFile(fixturePath, JSON.stringify(fixtures), { mode: 0o600 });
    const jars = fixtures.accounts.map(() => new Map());
    assert.equal((await request("/session")).body.user, null); passed("Signed-out session contains no account data");
    assert.equal((await request("/organisations", "POST", { name: "Blocked", timezone: "UTC" })).status, 401); passed("Unauthenticated write denied");
    assert.equal((await request("/auth/signin", "POST", {}, new Map(), { Origin: "https://attacker.invalid" })).status, 403); passed("Cross-origin login/CSRF denied");
    assert.equal((await request("/auth/signin", "POST", { email: "invalid", password: "short" })).status, 400); passed("Server validation rejects invalid credentials");
    for (let i = 0; i < fixtures.accounts.length; i++) {
      const a = fixtures.accounts[i];
      assert.equal((await request("/auth/signin", "POST", { email: a.email, password: a.password }, jars[i])).status, 200);
    }
    passed("Three independent verified Supabase accounts sign in with protected cookies");
    const orgIds = [];
    for (let i = 0; i < 2; i++) {
      const r = await request("/organisations", "POST", { name: `GEIT QA ${i} ${suffix}`, timezone: "UTC" }, jars[i]);
      assert.equal(r.status, 201); assert.equal(r.body.role, "owner"); orgIds.push(r.body.id);
    }
    fixtures.orgIds = orgIds; await writeFile(fixturePath, JSON.stringify(fixtures), { mode: 0o600 });
    passed("Atomic organisation and initial owner creation");
    const aSession = await request("/session", "GET", undefined, jars[0]);
    assert.deepEqual(aSession.body.organisations.map((o) => o.id), [orgIds[0]]); passed("Session contains only own tenant");
    assert.equal((await request(`/organisations/${orgIds[1]}/members`, "GET", undefined, jars[0])).status, 403);
    assert.equal((await request(`/organisations/${orgIds[1]}`, "PATCH", { name: "Tampered", timezone: "UTC" }, jars[0])).status, 403);
    passed("Cross-tenant member reads and organisation ID tampering denied");
    assert.equal((await request(`/organisations/${orgIds[0]}/members/${fixtures.accounts[0].id}`, "DELETE", {}, jars[0])).status, 400);
    assert.equal((await request(`/organisations/${orgIds[0]}/members`, "POST", { email: fixtures.accounts[0].email, role: "reader" }, jars[0])).status, 400);
    passed("Last owner cannot be removed or demoted");
    assert.equal((await request(`/organisations/${orgIds[0]}/members`, "POST", { email: fixtures.accounts[2].email, role: "reader" }, jars[0])).status, 200);
    assert.equal((await request(`/organisations/${orgIds[0]}`, "PATCH", { name: "No", timezone: "UTC" }, jars[2])).status, 403);
    assert.equal((await request(`/organisations/${orgIds[0]}/members`, "POST", { email: fixtures.accounts[2].email, role: "owner" }, jars[2])).status, 403);
    passed("Reader cannot edit organisation or self-promote");
    const rlsToken = decodeURIComponent(jars[0].get("geit-access"));
    const rest = await fetch(`${process.env.SUPABASE_URL}/rest/v1/geit_organisations?select=id`, {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${rlsToken}` },
    });
    assert.equal(rest.status, 200);
    assert.deepEqual((await rest.json()).map((o) => o.id), [orgIds[0]]);
    const denyWrite = await fetch(`${process.env.SUPABASE_URL}/rest/v1/geit_memberships`, {
      method: "POST", headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${rlsToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ organisation_id: orgIds[1], user_id: fixtures.accounts[0].id, role: "owner" }),
    });
    assert.ok([401, 403].includes(denyWrite.status));
    passed("Direct Supabase REST RLS isolates tenants and denies membership insertion");
    const refreshJar = new Map(jars[0]); refreshJar.set("geit-access", "invalid-expired-access");
    const refreshed = await request("/session", "GET", undefined, refreshJar);
    assert.equal(refreshed.body.user.id, fixtures.accounts[0].id);
    passed("Invalid/expired access token refreshes using HttpOnly refresh cookie");
    const expired = await request("/session", "GET", undefined, new Map([["geit-access", "invalid"], ["geit-refresh", "invalid"]]));
    assert.equal(expired.body.user, null); passed("Expired and invalid session fails closed");
    assert.equal((await request("/auth/callback", "POST", { code: "invalid-used-code" })).status, 400);
    passed("Invalid verification/recovery code rejected");
    assert.equal((await request("/auth/signout", "POST", {}, refreshJar)).status, 200);
    assert.equal((await request("/session", "GET", undefined, refreshJar)).body.user, null);
    passed("Sign-out revokes refresh session and clears account cookies");
    console.log(`${count} API/security checks passed.`);
    if (process.argv.includes("--keep")) console.log("Synthetic fixtures retained for browser checks; run --cleanup afterwards.");
    else await cleanup();
  }
} catch (error) {
  console.error("Platform verification failed:", error.code || error.name, error instanceof assert.AssertionError ? error.message : "(details suppressed)");
  if (!process.argv.includes("--keep")) await cleanup().catch(() => {});
  process.exitCode = 1;
} finally { if (db) await db.end(); }
