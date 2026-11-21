/** Warm the database (migrations + seed) and bootstrap the first admin at server start. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("./server/db");
    await getDb();
    const { bootstrapAdmin } = await import("./server/auth");
    await bootstrapAdmin();
  }
}
