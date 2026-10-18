import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { connectSupabase } from "./supabase-connection.mjs";
let db;
try {
  db = await connectSupabase();
  await db.query("begin read only");
  const ledger = await db.query("select version,checksum from public.geit_schema_migrations order by version");
  const directory = new URL("../migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => /^\d{3}_[a-z_]+\.sql$/.test(file)).sort();
  if (ledger.rowCount !== files.length) throw new Error("MIGRATION_LEDGER_DIFFERS_FROM_REPOSITORY");
  for (const file of files) {
    const hash = createHash("sha256").update(await readFile(new URL(file, directory))).digest("hex");
    if (ledger.rows.find((r) => r.version === Number(file.slice(0, 3)))?.checksum !== hash) throw new Error("MISSING_OR_MODIFIED_MIGRATION");
  }
  const tables = await db.query(`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relname like 'geit_%' and c.relname<>'geit_schema_migrations'`);
  if (tables.rows.some((r) => !r.relrowsecurity)) throw new Error("TENANT_TABLE_WITHOUT_RLS");
  const anonymous = await db.query(`select table_name from information_schema.table_privileges where table_schema='public'
    and table_name like 'geit_%' and grantee in ('anon','PUBLIC')`);
  if (anonymous.rowCount) throw new Error("ANONYMOUS_TABLE_PRIVILEGES");
  const functions = await db.query(`select p.proname,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'geit_%' and p.prosecdef`);
  if (functions.rows.some((r) => !r.proconfig?.some((v) => v === 'search_path=""' || v === 'search_path='))) throw new Error("UNSAFE_DEFINER_SEARCH_PATH");
  const bucket = await db.query("select public,file_size_limit,allowed_mime_types from storage.buckets where id='geit-private-documents'");
  if (bucket.rowCount !== 1 || bucket.rows[0].public) throw new Error("PRIVATE_BUCKET_NOT_PRIVATE");
  console.log(JSON.stringify({ migrationsVerified: files.length, tenantTablesWithRLS: tables.rowCount,
    anonymousTableGrants: anonymous.rowCount, safeDefinerFunctions: functions.rowCount,
    privateBucket: true, bucketByteLimit: bucket.rows[0].file_size_limit, backups: "NOT_VERIFIED" }));
  await db.query("rollback");
} catch (error) { console.error("Database audit failed:", error.code || error.message); process.exitCode = 1; }
finally { if (db) await db.end(); }
