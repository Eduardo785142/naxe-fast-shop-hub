import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { postgresConfig } from "./postgres-config.mjs";
export async function runMigrations() {
  const client = new Client(postgresConfig());
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(8710291)");
    await client.query(
      'CREATE TABLE IF NOT EXISTS "_naxe_migrations" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    for (const name of (
      await readdir("prisma/migrations", { withFileTypes: true })
    )
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()) {
      const sql = await readFile(
        `prisma/migrations/${name}/migration.sql`,
        "utf8",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query(
        'SELECT checksum FROM "_naxe_migrations" WHERE name=$1',
        [name],
      );
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum)
          throw Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_naxe_migrations" (name,checksum) VALUES ($1,$2)',
          [name, checksum],
        );
        await client.query("COMMIT");
        console.log(`Applied ${name}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(8710291)");
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await runMigrations();
