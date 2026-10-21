import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

// Hostinger starts one entrypoint. The API stays on loopback while Next owns PORT.
const required = ["DATABASE_URL", "REDIS_URL", "APP_ORIGIN"];
for (const name of required)
  if (!process.env[name])
    throw new Error(`Configure ${name} in the hosting environment.`);
if (process.env.DEMO_MODE !== "true")
  throw new Error("This release requires DEMO_MODE=true.");
const origin = new URL(process.env.APP_ORIGIN);
if (origin.protocol !== "https:")
  throw new Error("Public sandbox requires an HTTPS APP_ORIGIN.");
if (
  process.env.ENABLE_DEMO_SEED === "true" &&
  (!process.env.DEMO_PASSWORD ||
    process.env.DEMO_PASSWORD.length < 12 ||
    process.env.DEMO_PASSWORD === "NaxeDemo2026!")
)
  throw new Error(
    "Set a private DEMO_PASSWORD (12+ characters), different from the local example, before creating public demo accounts.",
  );
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 4000)
  throw new Error(
    "PORT must be a valid public application port different from internal port 4000.",
  );
const children = new Set();
let stopping = false;
function launch(args, env = {}) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.add(child);
  child.on("exit", () => children.delete(child));
  return child;
}
async function command(args) {
  await new Promise((resolve, reject) => {
    const child = launch(args);
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`Preparation failed (${signal ?? code}).`)),
    );
  });
}
async function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  for (let i = 0; i < 50 && children.size; i++) await delay(100);
  for (const child of children) child.kill("SIGKILL");
  process.exit(code);
}
process.on("SIGTERM", () => void stop(0));
process.on("SIGINT", () => void stop(0));
try {
  await command(["scripts/migrate.mjs"]);
  if (process.env.ENABLE_DEMO_SEED === "true")
    await command(["--import", "tsx", "prisma/seed.ts"]);
  const api = launch(["--import", "tsx", "server/index.ts"], {
    PORT: "4000",
    API_HOST: "127.0.0.1",
    NODE_ENV: "production",
  });
  api.once("error", (e) => {
    console.error(e.message);
    void stop(1);
  });
  api.once("exit", () => {
    if (!stopping) void stop(1);
  });
  let ready = false;
  for (let i = 0; i < 60 && !stopping; i++) {
    try {
      const r = await fetch("http://127.0.0.1:4000/api/health", {
        signal: AbortSignal.timeout(1000),
      });
      if (r.ok && (await r.json()).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  if (!ready)
    throw new Error(
      "API readiness failed. Check PostgreSQL and Redis connectivity.",
    );
  const frontend = launch(
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "0.0.0.0",
      "-p",
      String(port),
    ],
    { NODE_ENV: "production" },
  );
  frontend.once("error", (e) => {
    console.error(e.message);
    void stop(1);
  });
  frontend.once("exit", (code) => {
    if (!stopping) void stop(code ?? 1);
  });
} catch (e) {
  console.error(e.message);
  await stop(1);
}
