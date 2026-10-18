import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { connectSupabase } from "./supabase-connection.mjs";

let db;
try {
  db = await connectSupabase();
  const tables = await db.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
  console.log("Existing public tables:", tables.rows.map((r) => r.table_name));
  if (!process.argv.includes("--apply")) {
    console.log("Read-only inspection complete. Use --apply for the reviewed additive migration.");
  } else {
    const sql = await readFile(new URL("../migrations/001_identity.sql", import.meta.url), "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    await db.query("begin");
    await db.query("select pg_advisory_xact_lock(795482614)");
    await db.query("create table if not exists public.geit_schema_migrations (version integer primary key, checksum text not null, applied_at timestamptz not null default now())");
    await db.query("revoke all on public.geit_schema_migrations from public, anon, authenticated");
    const prior = await db.query("select checksum from public.geit_schema_migrations where version=$1", [1]);
    if (prior.rowCount) {
      if (prior.rows[0].checksum !== hash) throw new Error("Migration checksum mismatch; never edit an applied migration.");
      console.log("Identity migration already applied.");
    } else {
      await db.query(sql);
      await db.query("insert into public.geit_schema_migrations(version,checksum) values($1,$2)", [1, hash]);
      console.log("Identity migration applied.");
    }
    await db.query("commit");
  }
} catch (error) {
  if (db) await db.query("rollback").catch(() => {});
  console.error("Migration failed:", error.code || "CONFIGURATION_OR_MIGRATION_ERROR");
  process.exitCode = 1;
} finally {
  if (db) await db.end();
}
