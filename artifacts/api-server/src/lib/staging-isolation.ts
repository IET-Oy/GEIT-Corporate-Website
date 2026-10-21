import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

type Environment = Record<string, string | undefined>;
export type StagingIdentity = {
  version: 1;
  environment: "staging";
  projectRef: string;
  origin: string;
  isolationId: string;
  supabaseDatabaseTargetSha256: string;
  legacyDatabaseTargetSha256: string;
  publishableKeySha256: string;
};

// Public reference already present in this repository's protected .replit.
// This is an additional denylist, not an exhaustive inventory of production.
const protectedProjects = new Set(["toqtpvqpauqhduemwmve"]);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function databaseTarget(raw: string | undefined) {
  try {
    const url = new URL(raw || "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname ||
        !url.username || url.pathname.length < 2 || url.hash) throw new Error();
    // pg connection query parameters can override host/database/user. Reject
    // those rather than fingerprinting a different target from the one pg uses.
    for (const key of url.searchParams.keys()) {
      if (!["sslmode", "channel_binding"].includes(key) ||
          url.searchParams.getAll(key).length !== 1) throw new Error();
    }
    return {
      host: url.hostname,
      port: url.port || "5432",
      user: decodeURIComponent(url.username),
      database: decodeURIComponent(url.pathname.slice(1)),
    };
  } catch {
    throw new Error("Invalid staging database URI or unsupported connection parameters.");
  }
}

export function describeStagingCandidate(env: Environment): StagingIdentity {
  if (env.GEIT_ENVIRONMENT !== "staging") throw new Error("Explicit staging mode is required.");
  const ref = env.GEIT_TEST_SUPABASE_PROJECT_REF || "";
  if (!/^[a-z0-9]{20}$/.test(ref) || protectedProjects.has(ref)) {
    throw new Error("Staging reference is missing, invalid, or belongs to a protected project.");
  }
  let api: URL;
  let origin: URL;
  try {
    api = new URL(env.SUPABASE_URL || "");
    origin = new URL(env.PLATFORM_ORIGIN || "");
  } catch {
    throw new Error("Explicit staging API URL and application origin are required.");
  }
  if (api.href !== `https://${ref}.supabase.co/` ||
      origin.protocol !== "https:" || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Staging Supabase URL or application origin does not match its required format.");
  }
  if (!env.SUPABASE_PUBLISHABLE_KEY || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new Error("Staging publishable key and an independent 32+ character signing secret are required.");
  }
  const supabase = databaseTarget(env.SUPABASE_DB_URL);
  const legacy = databaseTarget(env.DATABASE_URL);
  for (const protectedRef of protectedProjects) {
    if (legacy.host === `db.${protectedRef}.supabase.co` || legacy.user === `postgres.${protectedRef}`) {
      throw new Error("The legacy connection points to a protected Supabase project.");
    }
  }
  const direct = supabase.host === `db.${ref}.supabase.co`;
  const pooler = supabase.host.endsWith(".pooler.supabase.com") && supabase.user === `postgres.${ref}`;
  if (!direct && !pooler) throw new Error("Staging database URI does not match the approved Supabase project.");
  const supabaseHash = digest(JSON.stringify(supabase));
  const legacyHash = digest(JSON.stringify(legacy));
  if (legacyHash === supabaseHash || legacy.host === `db.${ref}.supabase.co` ||
      legacy.user === `postgres.${ref}`) {
    throw new Error("The legacy database must be separately provisioned, not the Energy DT Supabase database.");
  }
  return {
    version: 1,
    environment: "staging",
    projectRef: ref,
    origin: origin.origin,
    isolationId: "", // Populated only by the independently reviewed approval.
    supabaseDatabaseTargetSha256: supabaseHash,
    legacyDatabaseTargetSha256: legacyHash,
    publishableKeySha256: digest(env.SUPABASE_PUBLISHABLE_KEY),
  };
}

export function validateStagingApproval(env: Environment, approval: unknown): StagingIdentity {
  const candidate = describeStagingCandidate(env);
  if (!approval || typeof approval !== "object") throw new Error("Staging approval is missing.");
  const pin = approval as Record<string, unknown>;
  if (pin.independentlyVerified !== true || pin.version !== 1 || pin.environment !== "staging" ||
      typeof pin.isolationId !== "string" || !/^[a-f0-9]{32}$/.test(pin.isolationId)) {
    throw new Error("An independently reviewed staging approval and 32-hex isolation ID are required.");
  }
  for (const key of ["projectRef", "origin", "supabaseDatabaseTargetSha256",
    "legacyDatabaseTargetSha256", "publishableKeySha256"] as const) {
    if (pin[key] !== candidate[key]) throw new Error(`Staging approval mismatch: ${key}.`);
  }
  return { ...candidate, isolationId: pin.isolationId };
}

export function assertStagingConfiguration(env: Environment = process.env): StagingIdentity {
  let approval: unknown;
  try {
    if (!env.GEIT_STAGING_APPROVAL_FILE) throw new Error();
    approval = JSON.parse(readFileSync(env.GEIT_STAGING_APPROVAL_FILE, "utf8"));
  } catch {
    throw new Error("Cannot read the independently reviewed staging approval file.");
  }
  return validateStagingApproval(env, approval);
}

function challengeMessage(identity: StagingIdentity, challenge: string) {
  // Fixed field order; do not authenticate arbitrary response fields.
  return JSON.stringify([
    identity.version, identity.environment, identity.projectRef, identity.origin,
    identity.isolationId, identity.supabaseDatabaseTargetSha256,
    identity.legacyDatabaseTargetSha256, identity.publishableKeySha256, challenge,
  ]);
}

export function signStagingChallenge(identity: StagingIdentity, challenge: string, secret: string) {
  if (!/^[a-f0-9]{64}$/.test(challenge)) throw new Error("Invalid staging identity challenge.");
  return createHmac("sha256", secret).update(challengeMessage(identity, challenge)).digest("hex");
}

export async function verifyStagingApi(env: Environment = process.env) {
  const identity = assertStagingConfiguration(env);
  const challenge = randomBytes(32).toString("hex");
  const url = new URL("/api/staging-isolation", identity.origin);
  url.searchParams.set("challenge", challenge);
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("Staging API identity verification could not reach the approved origin.");
  }
  if (!response.ok) throw new Error("Approved origin did not provide staging API identity.");
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    throw new Error("Invalid staging API identity response.");
  }
  const expected = signStagingChallenge(identity, challenge, env.SESSION_SECRET!);
  if (body.challenge !== challenge || typeof body.signature !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.signature) ||
      !timingSafeEqual(Buffer.from(body.signature, "hex"), Buffer.from(expected, "hex"))) {
    throw new Error("Staging API/test configuration mismatch; all fixture operations remain blocked.");
  }
  // Compare the visible identity as well as its keyed challenge response.
  for (const key of Object.keys(identity) as (keyof StagingIdentity)[]) {
    if (body[key] !== identity[key]) throw new Error("Staging API identity mismatch.");
  }
  return identity;
}
