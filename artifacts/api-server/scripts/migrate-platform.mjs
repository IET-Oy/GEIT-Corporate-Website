import { readFile, readdir } from "node:fs/promises";
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
    await db.query("begin");
    await db.query("select pg_advisory_xact_lock(795482614)");
    await db.query("create table if not exists public.geit_schema_migrations (version integer primary key, checksum text not null, applied_at timestamptz not null default now())");
    await db.query("revoke all on public.geit_schema_migrations from public, anon, authenticated");
    const directory = new URL("../migrations/", import.meta.url);
    const files = (await readdir(directory)).filter((file) => /^\d{3}_[a-z_]+\.sql$/.test(file)).sort();
    const versions = new Set();
    for (const file of files) {
      const version = Number(file.slice(0, 3));
      if (versions.has(version)) throw new Error("Duplicate migration version.");
      versions.add(version);
      const sql = await readFile(new URL(file, directory), "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      const prior = await db.query("select checksum from public.geit_schema_migrations where version=$1", [version]);
      if (prior.rowCount) {
        if (prior.rows[0].checksum !== hash) throw new Error("Migration checksum mismatch; never edit an applied migration.");
        console.log(`Migration ${version} already applied.`);
      } else {
        await db.query(sql);
        await db.query("insert into public.geit_schema_migrations(version,checksum) values($1,$2)", [version, hash]);
        console.log(`Migration ${version} applied.`);
      }
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
