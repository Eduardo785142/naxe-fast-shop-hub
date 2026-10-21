import { runMigrations } from "../scripts/migrate.mjs";
import { seedDemo } from "./seed";
const state = globalThis as typeof globalThis & {
  naxeEmbeddedApi?: Promise<void>;
};
export function startEmbeddedApi() {
  return (state.naxeEmbeddedApi ??= start());
}
async function start() {
  for (const key of ["DATABASE_URL", "REDIS_URL", "APP_ORIGIN"])
    if (!process.env[key])
      throw new Error(`Configure ${key} in the hosting environment.`);
  if (process.env.DEMO_MODE !== "true")
    throw new Error("NAXE LIVE requires DEMO_MODE=true.");
  if (!process.env.APP_ORIGIN?.startsWith("https://"))
    throw new Error("Public sandbox requires HTTPS APP_ORIGIN.");
  if (
    process.env.ENABLE_DEMO_SEED === "true" &&
    (!process.env.DEMO_PASSWORD ||
      process.env.DEMO_PASSWORD.length < 12 ||
      process.env.DEMO_PASSWORD === "NaxeDemo2026!")
  )
    throw new Error(
      "Configure a private DEMO_PASSWORD (12+ characters), different from the local example.",
    );
  await runMigrations();
  if (process.env.ENABLE_DEMO_SEED === "true") await seedDemo();
  process.env.NAXE_API_PORT = "4000";
  process.env.API_HOST = "127.0.0.1";
  await import("./index");
  console.log(
    JSON.stringify({
      event: "embedded_api_ready",
      port: 4000,
      mode: "sandbox",
    }),
  );
}
