import { Client } from "pg";
import { spawn } from "node:child_process";
import { mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { io } from "socket.io-client";
import assert from "node:assert/strict";
const connection = new URL(process.env.DATABASE_URL ?? "");
assert.ok(
  ["127.0.0.1", "localhost"].includes(connection.hostname),
  "Run this check only against a local development PostgreSQL.",
);
const database = `naxe_check_${randomBytes(6).toString("hex")}`;
connection.pathname = "/postgres";
const admin = new Client({ connectionString: connection.toString() });
await admin.connect();
const directory = await mkdtemp(path.join(tmpdir(), "naxe-standalone-"));
const sockets = [];
let child;
let output = "";
const origin = "https://darkslateblue-pelican-597772.hostingersite.com";
const root = "http://127.0.0.1:3100";
const password = randomBytes(24).toString("base64url");
async function call(endpoint, body, cookie, method) {
  const response = await fetch(root + endpoint, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: origin }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response;
}
async function login(email) {
  const r = await call("/api/auth/login", { email, password });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie") ?? "", /Secure/);
  return r.headers.get("set-cookie").split(";")[0];
}
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  connection.pathname = "/" + database;
  await cp(".next/standalone", directory, { recursive: true });
  await cp("public", path.join(directory, "public"), { recursive: true });
  await cp(".next/static", path.join(directory, ".next/static"), {
    recursive: true,
  });
  child = spawn(process.execPath, [path.join(directory, "server.js")], {
    cwd: directory,
    env: {
      ...process.env,
      DATABASE_URL: connection.toString(),
      APP_ORIGIN: origin,
      DEMO_MODE: "true",
      ENABLE_DEMO_SEED: "true",
      DEMO_PASSWORD: password,
      NAXE_EMBED_API: "true",
      API_INTERNAL_URL: "",
      PORT: "3100",
      HOSTNAME: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await call("/api/health");
      if (r.ok && (await r.json()).ok) {
        ready = true;
        break;
      }
    } catch {}
    if (child.exitCode !== null) break;
    await delay(250);
  }
  assert.ok(ready, "Isolated standalone failed to start: " + output);
  console.log(
    "PASS: isolated artifact applies fresh migrations, seeds data, and serves database/Redis health.",
  );
  const sql = new Client({ connectionString: connection.toString() });
  await sql.connect();
  try {
    const role = `anonymous_${randomBytes(4).toString("hex")}`;
    await sql.query("BEGIN");
    await sql.query(`CREATE ROLE "${role}" NOLOGIN`);
    await sql.query(`GRANT SELECT ON "User" TO "${role}"`);
    await sql.query(`SET LOCAL ROLE "${role}"`);
    const hidden = await sql.query('SELECT count(*)::integer AS n FROM "User"');
    assert.equal(hidden.rows[0].n, 0);
    await sql.query("ROLLBACK");
  } finally {
    await sql.end();
  }
  console.log(
    "PASS: anonymous database role cannot read application users under RLS.",
  );
  assert.ok((await (await call("/")).text()).includes("NAXE LIVE"));
  assert.equal((await call("/api/streams")).status, 200);
  assert.equal((await call("/api/account")).status, 401);
  const seller = await login("vendedor@naxe.test"),
    a = await login("comprador.a@naxe.test"),
    b = await login("comprador.b@naxe.test");
  const latest = [];
  for (let i = 0; i < 3; i++)
    await new Promise((resolve, reject) => {
      const s = io(root, {
        path: "/socket.io",
        addTrailingSlash: false,
        transports: ["websocket"],
        extraHeaders: { Origin: origin },
        reconnection: false,
      });
      sockets.push(s);
      const t = setTimeout(() => reject(Error("WebSocket timed out")), 10000);
      s.on("connect", () => s.emit("join", "live-perfume"));
      s.on("state", (state) => {
        latest[i] = state;
        clearTimeout(t);
        resolve();
      });
      s.on("connect_error", reject);
    });
  assert.equal(
    (
      await call(
        "/api/seller/lots/lot-perfume",
        {
          productId: "perfume",
          startCents: 1500,
          incrementCents: 100,
          bidMode: "FIXED",
          durationSeconds: 10,
          position: 0,
        },
        seller,
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("/api/seller/lots/lot-perfume/start", {}, seller)).status,
    200,
  );
  const quote = await (await call("/api/quote/perfume", undefined, a)).json();
  const attempt = randomUUID();
  const bid = (cookie, amount, attemptId = randomUUID()) =>
    call(
      "/api/lots/lot-perfume/bid",
      { amountCents: amount, attemptId, shippingMaxCents: quote.cents },
      cookie,
    );
  assert.equal((await bid(a, 1500, attempt)).status, 200);
  assert.equal((await bid(a, 1500, attempt)).status, 200);
  assert.equal((await bid(b, 1600)).status, 200);
  const simultaneous = await Promise.all([bid(a, 1700), bid(b, 1700)]);
  assert.deepEqual(simultaneous.map((r) => r.status).sort(), [200, 409]);
  console.log(
    "PASS: login, cookies, authorization, WebSocket, idempotent bids and concurrent bid rejection.",
  );
  let final;
  for (let i = 0; i < 60; i++) {
    final = await (await call("/api/streams/live-perfume")).json();
    if (final.lots[0].status === "SOLD") break;
    await delay(250);
  }
  assert.equal(final.lots[0].status, "SOLD");
  assert.equal(final.lots[0].currentCents, 1700);
  for (
    let i = 0;
    i < 40 &&
    !latest.every(
      (s) => s.lots[0].result?.winnerId === final.lots[0].result.winnerId,
    );
    i++
  )
    await delay(100);
  for (const state of latest)
    assert.equal(state.lots[0].result.winnerId, final.lots[0].result.winnerId);
  const accounts = await Promise.all(
    [a, b].map(async (c) => (await call("/api/account", undefined, c)).json()),
  );
  assert.equal(
    accounts.flatMap((x) => x.orders).filter((o) => o.lotId === "lot-perfume")
      .length,
    1,
  );
  assert.equal((await bid(a, 1800)).status, 409);
  console.log(
    "PASS: authoritative timeout, one consistent winner, exactly one sandbox order and expired bid rejection.",
  );
} finally {
  for (const s of sockets) s.close();
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((r) => child.once("exit", r)),
      delay(5000),
    ]);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await delay(300);
    }
  }
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.end();
  await rm(directory, { recursive: true, force: true });
}
