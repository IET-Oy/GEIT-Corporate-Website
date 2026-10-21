import { describeStagingCandidate, assertStagingConfiguration, verifyStagingApi } from "../src/lib/staging-isolation.ts";

// Preparation only: no database connections, credential output or mutations.
try {
  const mode = process.argv[2];
  if (!["--candidate", "--local", "--api"].includes(mode) || process.argv.length !== 3) {
    throw new Error("Choose exactly one of --candidate, --local or --api.");
  }
  if (process.env.GEIT_ALLOW_TEST_FIXTURE_WRITES &&
      process.env.GEIT_ALLOW_TEST_FIXTURE_WRITES !== "no") {
    throw new Error("Keep fixture writes disabled during isolation preparation.");
  }
  const result = mode === "--candidate" ? describeStagingCandidate(process.env)
    : mode === "--local" ? assertStagingConfiguration()
    : await verifyStagingApi();
  console.log(JSON.stringify({
    check: mode.slice(2),
    ...result,
    fixtureWrites: "disabled",
    databaseContacted: false,
    note: mode === "--candidate"
      ? "Candidate fingerprints only. Independently verify new non-production resources before approval."
      : "Configuration identity only; database readiness and credentials are not remotely verified.",
  }, null, 2));
} catch (error) {
  // Every error thrown by these helpers is intentionally credential-free.
  console.error(error instanceof Error ? error.message : "Staging isolation verification failed.");
  process.exitCode = 1;
}
