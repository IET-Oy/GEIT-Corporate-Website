/** Fail closed before any fixture connection, signup, upload or cleanup.
 * NODE_ENV describes the process, not whether a remote database is production.
 * The operator must explicitly identify a dedicated, disposable staging project.
 */
export function assertFixtureTarget(env = process.env) {
  if (env.NODE_ENV === "production" || env.GEIT_ALLOW_TEST_FIXTURE_WRITES !== "yes") {
    throw new Error("Fixture writes disabled. Use a confirmed disposable staging project and explicitly enable GEIT_ALLOW_TEST_FIXTURE_WRITES.");
  }
  const ref = env.GEIT_TEST_SUPABASE_PROJECT_REF;
  if (!ref || !/^[a-z0-9]{20}$/.test(ref)) throw new Error("Set GEIT_TEST_SUPABASE_PROJECT_REF to the confirmed staging project reference.");
  let url;
  try { url = new URL(env.SUPABASE_URL); } catch { throw new Error("Invalid staging Supabase URL."); }
  if (url.origin !== `https://${ref}.supabase.co` || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Fixture project does not match the explicitly approved staging project.");
  }
}
