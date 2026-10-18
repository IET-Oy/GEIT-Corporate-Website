import pg from "pg";

// Public Supabase CA, downloaded over verified HTTPS; never weaken TLS checks.
export async function connectSupabase() {
  const api = new URL(process.env.SUPABASE_URL || "");
  const uri = new URL(process.env.SUPABASE_DB_URL || "");
  const project = api.hostname.split(".")[0];
  if (!api.hostname.endsWith(".supabase.co") ||
      !(uri.hostname === `db.${project}.supabase.co` ||
        decodeURIComponent(uri.username) === `postgres.${project}`)) {
    throw new Error("Database target does not match the configured Supabase API project.");
  }
  const response = await fetch(
    "https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt",
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error("Cannot download the official database CA.");
  const ca = await response.text();
  if (!ca.includes("BEGIN CERTIFICATE")) throw new Error("Invalid database CA.");
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) uri.searchParams.delete(key);
  const client = new pg.Client({
    connectionString: uri.toString(), connectionTimeoutMillis: 15000,
    ssl: { ca, rejectUnauthorized: true },
  });
  await client.connect();
  return client;
}
