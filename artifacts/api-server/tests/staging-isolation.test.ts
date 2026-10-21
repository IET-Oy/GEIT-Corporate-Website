import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeStagingCandidate,
  validateStagingApproval,
  assertStagingConfiguration,
  signStagingChallenge,
} from "../src/lib/staging-isolation";

// Synthetic local configuration only. These tests never contact a provider.
const ref = "abcdefghijklmnopqrst";
const env = {
  GEIT_ENVIRONMENT: "staging",
  GEIT_TEST_SUPABASE_PROJECT_REF: ref,
  SUPABASE_URL: `https://${ref}.supabase.co`,
  SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key-for-offline-tests",
  SUPABASE_DB_URL: `postgresql://postgres:synthetic@db.${ref}.supabase.co:5432/postgres?sslmode=require`,
  DATABASE_URL: "postgresql://staging:synthetic@legacy.staging.invalid:5432/geit_staging?sslmode=require",
  SESSION_SECRET: "synthetic-offline-signing-secret-never-use-in-deployments",
  PLATFORM_ORIGIN: "https://geit.staging.invalid",
};
function approval() {
  return {
    ...describeStagingCandidate(env),
    independentlyVerified: true,
    isolationId: "a".repeat(32),
  };
}

test("staging is explicit; known protected projects cannot be approved", () => {
  assert.throws(() => describeStagingCandidate({ ...env, GEIT_ENVIRONMENT: undefined }));
  const protectedRef = "toqtpvqpauqhduemwmve";
  assert.throws(() => describeStagingCandidate({
    ...env, GEIT_TEST_SUPABASE_PROJECT_REF: protectedRef,
    SUPABASE_URL: `https://${protectedRef}.supabase.co`,
  }));
});

test("staging requires an exact project URL and explicit HTTPS origin", () => {
  for (const SUPABASE_URL of ["https://other.supabase.co", `${env.SUPABASE_URL}/rest/v1`, `${env.SUPABASE_URL}?key=value`]) {
    assert.throws(() => describeStagingCandidate({ ...env, SUPABASE_URL }));
  }
  for (const PLATFORM_ORIGIN of ["", "http://geit.staging.invalid", `${env.PLATFORM_ORIGIN}/app`]) {
    assert.throws(() => describeStagingCandidate({ ...env, PLATFORM_ORIGIN }));
  }
});

test("approval is not inferred from candidate fingerprints", () => {
  assert.throws(() => validateStagingApproval(env, describeStagingCandidate(env)));
  assert.throws(() => validateStagingApproval(env, { ...approval(), independentlyVerified: false }));
  assert.throws(() => validateStagingApproval(env, { ...approval(), isolationId: "" }));
  assert.doesNotThrow(() => validateStagingApproval(env, approval()));
});

test("every pinned target and publishable key must match", () => {
  for (const key of ["projectRef", "origin", "supabaseDatabaseTargetSha256", "legacyDatabaseTargetSha256", "publishableKeySha256"]) {
    assert.throws(() => validateStagingApproval(env, { ...approval(), [key]: "mismatched" }));
  }
  assert.throws(() => validateStagingApproval({ ...env, SUPABASE_PUBLISHABLE_KEY: "different-synthetic-key" }, approval()));
  assert.throws(() => validateStagingApproval({ ...env, DATABASE_URL: env.DATABASE_URL.replace("geit_staging", "other") }, approval()));
});

test("connection overrides and foreign database hosts fail closed", () => {
  assert.throws(() => describeStagingCandidate({ ...env, SUPABASE_DB_URL: `${env.SUPABASE_DB_URL}&host=other.invalid` }));
  assert.throws(() => describeStagingCandidate({ ...env, DATABASE_URL: `${env.DATABASE_URL}&database=other` }));
  assert.throws(() => describeStagingCandidate({
    ...env, SUPABASE_DB_URL: `postgresql://postgres.${ref}:synthetic@untrusted.invalid/postgres`,
  }));
  assert.doesNotThrow(() => describeStagingCandidate({
    ...env, SUPABASE_DB_URL: `postgresql://postgres.${ref}:synthetic@aws-0-region.pooler.supabase.com:5432/postgres`,
  }));
});

test("legacy database cannot reuse the tenant database or a protected Supabase project", () => {
  assert.throws(() => describeStagingCandidate({ ...env, DATABASE_URL: env.SUPABASE_DB_URL }));
  assert.throws(() => describeStagingCandidate({
    ...env, DATABASE_URL: "postgresql://postgres:synthetic@db.toqtpvqpauqhduemwmve.supabase.co/postgres",
  }));
});

test("fingerprints do not contain passwords and remain stable across password rotation", () => {
  const candidate = describeStagingCandidate(env);
  assert.equal(candidate.legacyDatabaseTargetSha256, describeStagingCandidate({
    ...env, DATABASE_URL: env.DATABASE_URL.replace(":synthetic@", ":different-synthetic@"),
  }).legacyDatabaseTargetSha256);
  assert.ok(!JSON.stringify(candidate).includes(":synthetic@"));
  assert.ok(!JSON.stringify(candidate).includes(env.SESSION_SECRET));
  assert.ok(!JSON.stringify(candidate).includes(env.SUPABASE_PUBLISHABLE_KEY));
});

test("staging signing secret must be present and at least 32 characters", () => {
  for (const SESSION_SECRET of ["", "short"]) {
    assert.throws(() => describeStagingCandidate({ ...env, SESSION_SECRET }));
  }
});

test("challenge signature binds identity, nonce and independently configured secret", () => {
  const identity = validateStagingApproval(env, approval());
  const challenge = "b".repeat(64);
  const signed = signStagingChallenge(identity, challenge, env.SESSION_SECRET);
  assert.match(signed, /^[a-f0-9]{64}$/);
  assert.notEqual(signed, signStagingChallenge(identity, "c".repeat(64), env.SESSION_SECRET));
  assert.notEqual(signed, signStagingChallenge(identity, challenge, `${env.SESSION_SECRET}-different`));
  for (const key of ["origin", "projectRef", "isolationId", "legacyDatabaseTargetSha256", "supabaseDatabaseTargetSha256", "publishableKeySha256"] as const) {
    assert.notEqual(signed, signStagingChallenge({ ...identity, [key]: "different" }, challenge, env.SESSION_SECRET));
  }
  assert.throws(() => signStagingChallenge(identity, "invalid", env.SESSION_SECRET));
});

test("a missing approval file blocks runtime and test verification", () => {
  assert.throws(() => assertStagingConfiguration(env));
});
