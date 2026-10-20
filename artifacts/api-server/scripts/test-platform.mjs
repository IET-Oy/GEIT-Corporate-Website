import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { connectSupabase } from "./supabase-connection.mjs";
import { createClient } from "@supabase/supabase-js";
import { PRIVATE_DOCUMENT_BUCKET, privateDocumentKey } from "../src/lib/private-storage.ts";
import { runEnergyIntegration } from "./test-energy-integration.mjs";
import { runEngineeringIntegration } from "./test-engineering-integration.mjs";
import { runSustainabilityIntegration } from "./test-sustainability-integration.mjs";
import { assertFixtureTarget } from "./fixture-safety.mjs";

// Must precede even cleanup and database connections.
assertFixtureTarget();

// Isolated, synthetic development fixtures. Never print credentials or reuse customer data.
const fixturePath = "/tmp/geit-platform-test-fixtures.json";
const origin = process.env.PLATFORM_ORIGIN || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const base = `${origin}/api/platform`;
let db;
let fixtures;
function scopedClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
async function cleanup() {
  if (!fixtures) return;
  // Delete bytes through the Storage API before tenant deletion revokes access.
  // Deleting storage.objects with SQL would leave physical bytes orphaned.
  for (let i = 0; i < (fixtures.orgIds || []).length; i++) {
    const account = fixtures.accounts[i];
    const auth = scopedClient();
    const signed = await auth.auth.signInWithPassword({ email: account.email, password: account.password });
    if (signed.error || !signed.data.session) throw new Error("Cannot authenticate synthetic fixture cleanup.");
    const store = scopedClient(signed.data.session.access_token).storage.from(PRIVATE_DOCUMENT_BUCKET);
    const files = await store.list(fixtures.orgIds[i]);
    if (files.error) throw new Error("Cannot list synthetic storage cleanup.");
    if (files.data.length) {
      const deleted = await store.remove(files.data.map((file) => `${fixtures.orgIds[i]}/${file.name}`));
      if (deleted.error || deleted.data.length !== files.data.length) throw new Error("Synthetic storage cleanup failed.");
    }
    await auth.auth.signOut({ scope: "local" });
  }
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
  if (process.env.NODE_ENV === "production") throw new Error("Development fixtures must not run in production.");
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
    async function rowsFor(table, token) {
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 200);
      return response.json();
    }
    for (const table of ["geit_memberships", "geit_audit_events"]) {
      const rows = await rowsFor(table, rlsToken);
      assert.ok(rows.length > 0);
      assert.ok(rows.every((row) => row.organisation_id === orgIds[0]));
    }
    const profiles = await rowsFor("geit_profiles", rlsToken);
    assert.ok(profiles.some((p) => p.user_id === fixtures.accounts[0].id));
    assert.ok(!profiles.some((p) => p.user_id === fixtures.accounts[1].id));
    passed("Membership, audit and profile records are tenant-isolated through direct REST");

    const clients = jars.map((jar) => scopedClient(decodeURIComponent(jar.get("geit-access"))));
    const stores = clients.map((client) => client.storage.from(PRIVATE_DOCUMENT_BUCKET));
    const keys = orgIds.map((org) => privateDocumentKey(org, "pdf"));
    const bytes = new TextEncoder().encode("%PDF-1.4\n% Synthetic GEIT isolation fixture\n%%EOF\n");
    for (let i = 0; i < 2; i++) {
      const upload = await stores[i].upload(keys[i], bytes, { contentType: "application/pdf", upsert: false });
      assert.equal(upload.error, null, "Tenant owner must be able to upload a private file");
      const own = await stores[i].download(keys[i]);
      assert.equal(own.error, null); assert.ok(own.data);
      assert.equal(await own.data.text(), new TextDecoder().decode(bytes));
    }
    passed("Owners can upload and download real bytes inside their own tenant folders");
    for (let i = 0; i < 2; i++) {
      const foreign = await stores[i].download(keys[1 - i]);
      assert.ok(foreign.error, "Cross-tenant download must fail");
      const list = await stores[i].list(orgIds[1 - i]);
      assert.ok(list.error || list.data.length === 0, "Cross-tenant listing must be empty or denied");
      const signedUrl = await stores[i].createSignedUrl(keys[1 - i], 60);
      assert.ok(signedUrl.error, "Cross-tenant signed URL issuance must fail");
    }
    passed("Both tenants are denied foreign file downloads, listing and signed URLs");
    const publicUrl = stores[0].getPublicUrl(keys[0]).data.publicUrl;
    const publicFetch = await fetch(publicUrl);
    assert.notEqual(publicFetch.status, 200);
    const anonymous = scopedClient().storage.from(PRIVATE_DOCUMENT_BUCKET);
    assert.ok((await anonymous.download(keys[0])).error);
    passed("Public URLs and anonymous access cannot disclose private bytes");
    const badUpload = await stores[0].upload(privateDocumentKey(orgIds[1], "pdf"), bytes, { contentType: "application/pdf" });
    assert.ok(badUpload.error);
    const overwrite = await stores[0].upload(keys[1], bytes, { contentType: "application/pdf", upsert: true });
    assert.ok(overwrite.error);
    const foreignDelete = await stores[0].remove([keys[1]]);
    assert.ok(foreignDelete.error || foreignDelete.data.length === 0);
    assert.equal((await stores[1].download(keys[1])).error, null, "Denied mutation must leave foreign bytes intact");
    passed("Cross-tenant upload, overwrite and deletion attempts leave foreign files intact");
    assert.equal((await stores[2].download(keys[0])).error, null, "Reader must be able to read its own tenant");
    const readerWrite = await stores[2].upload(privateDocumentKey(orgIds[0], "pdf"), bytes, { contentType: "application/pdf" });
    assert.ok(readerWrite.error);
    const readerDelete = await stores[2].remove([keys[0]]);
    assert.ok(readerDelete.error || readerDelete.data.length === 0);
    assert.equal((await stores[0].download(keys[0])).error, null);
    passed("Reader role can read tenant files but cannot upload or delete them");
    const traversal = await stores[0].upload(`outside/${randomUUID()}.pdf`, bytes, { contentType: "application/pdf" });
    assert.ok(traversal.error);
    const html = await stores[0].upload(privateDocumentKey(orgIds[0], "pdf"), bytes, { contentType: "text/html" });
    assert.ok(html.error);
    passed("Malformed namespaces and disallowed MIME types are rejected");
    if (process.argv.includes("--energy")) await runEnergyIntegration({ request, jars, orgIds, clients, fixtures, passed, origin });
    if (process.argv.includes("--engineering")) await runEngineeringIntegration({ request, jars, orgIds, clients, fixtures, passed, origin });
    if (process.argv.includes("--sustainability")) await runSustainabilityIntegration({ request, jars, orgIds, clients, fixtures, passed, origin });
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
