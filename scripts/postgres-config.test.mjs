import test from "node:test";
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import ConnectionParameters from "pg/lib/connection-parameters.js";
import { postgresConfig } from "./postgres-config.mjs";

test("Supabase keeps CA and hostname verification despite URL SSL options", () => {
  for (const host of ["aws-0-us-east-2.pooler.supabase.com", "project.supabase.co"]) {
    const config = postgresConfig(`postgresql://user:pass@${host}:5432/postgres?sslmode=require&sslrootcert=ignored&uselibpqcompat=true&application_name=naxe`);
    const parsed = new ConnectionParameters(config);
    assert.equal(parsed.ssl.rejectUnauthorized, true);
    assert.match(new X509Certificate(parsed.ssl.ca).subject, /Supabase Root 2021 CA/);
    assert.equal(parsed.ssl.checkServerIdentity, undefined);
    assert.equal(new URL(config.connectionString).searchParams.get("application_name"), "naxe");
    assert.equal(config.connectionTimeoutMillis, 15000);
  }
});

test("Local and unrelated databases retain their connection settings", () => {
  for (const host of ["localhost", "127.0.0.1", "supabase.co.example.org"]) {
    const connectionString = `postgresql://user:pass@${host}/postgres`;
    assert.deepEqual(postgresConfig(connectionString), { connectionString });
  }
});
