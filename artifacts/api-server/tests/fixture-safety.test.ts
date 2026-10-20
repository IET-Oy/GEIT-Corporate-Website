import test from "node:test";
import assert from "node:assert/strict";
import { assertFixtureTarget } from "../scripts/fixture-safety.mjs";

const ref = "abcdefghijklmnopqrst";
const approved = { NODE_ENV: "test", GEIT_ALLOW_TEST_FIXTURE_WRITES: "yes",
  GEIT_TEST_SUPABASE_PROJECT_REF: ref, SUPABASE_URL: `https://${ref}.supabase.co` };
test("fixture writes require explicit staging approval, not merely a development process", () => {
  for (const env of [{}, { NODE_ENV: "development" }, { ...approved, NODE_ENV: "production" },
    { ...approved, GEIT_ALLOW_TEST_FIXTURE_WRITES: "" }, { ...approved, GEIT_TEST_SUPABASE_PROJECT_REF: "" }]) {
    assert.throws(() => assertFixtureTarget(env));
  }
  assert.doesNotThrow(() => assertFixtureTarget(approved));
});
test("fixture approval is bound to the exact Supabase project endpoint", () => {
  for (const url of ["https://anotherprojectrefhere.supabase.co", `http://${ref}.supabase.co`,
    `https://${ref}.supabase.co.evil.invalid`, `https://${ref}.supabase.co/path`,
    `https://${ref}.supabase.co?target=other`, `https://user:password@${ref}.supabase.co`, "not-a-url"]) {
    assert.throws(() => assertFixtureTarget({ ...approved, SUPABASE_URL: url }));
  }
});
