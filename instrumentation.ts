export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NAXE_EMBED_API !== "false" &&
    (!process.env.API_INTERNAL_URL ||
      ["http://127.0.0.1:4000", "http://localhost:4000"].includes(
        process.env.API_INTERNAL_URL,
      ))
  ) {
    const { startEmbeddedApi } = await import("./server/bootstrap");
    await startEmbeddedApi();
  }
}
