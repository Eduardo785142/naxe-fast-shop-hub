import { readFileSync } from "node:fs";

// Both migrations and Prisma must use the same trust policy.
export function postgresConfig(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("Configure DATABASE_URL.");
  const url = new URL(connectionString);
  const supabase = url.hostname.endsWith(".supabase.co") ||
    url.hostname.endsWith(".pooler.supabase.com");
  if (!supabase) return { connectionString };

  // pg URL SSL parameters override the explicit ssl object. Remove them so
  // sslmode=require cannot silently discard our CA or hostname verification.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert", "ssl", "uselibpqcompat"])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    connectionTimeoutMillis: 15000,
    ssl: {
      ca: readFileSync("certificates/supabase-prod-ca-2021.crt", "utf8"),
      rejectUnauthorized: true,
    },
  };
}
