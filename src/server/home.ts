import "server-only";
import { asc } from "drizzle-orm";
import { cache } from "react";
import { homeBlocks as seedBlocks } from "@/brand/home";
import * as s from "@/db/schema";
import { BLOCKS, isBlockId, navFrom, type HomeBlock } from "@/lib/blocks";
import { getDb } from "./db";

/** The client's default layout (src/brand/home.ts), with required blocks forced on. */
export function seedHome(): HomeBlock[] {
  return seedBlocks.filter((b) => isBlockId(b.id)).map((b, i) => ({ id: b.id as HomeBlock["id"], enabled: b.enabled || Boolean(BLOCKS[b.id as HomeBlock["id"]].required), sort: i, nav: b.nav }));
}

/**
 * The home page layout from the database (Admin → Homepage), once per request. Blocks that
 * exist in code but not yet in the table are appended from the seed (switched off unless the seed
 * lists them). Falls back to the seed when the database is unavailable (e.g. during `next build`).
 */
export const getHome = cache(async (): Promise<HomeBlock[]> => {
  try {
    const db = await getDb();
    const rows = await db.select().from(s.homeBlocks).orderBy(asc(s.homeBlocks.sort), asc(s.homeBlocks.id));
    if (!rows.length) return seedHome();
    const blocks: HomeBlock[] = rows
      .filter((r) => isBlockId(r.id))
      .map((r) => ({ id: r.id as HomeBlock["id"], enabled: r.enabled || Boolean(BLOCKS[r.id as HomeBlock["id"]].required), sort: r.sort, nav: r.navLabel }));
    const known = new Set(blocks.map((b) => b.id));
    for (const b of seedHome()) if (!known.has(b.id)) blocks.push({ ...b, sort: blocks.length });
    return blocks;
  } catch (err) {
    if (process.env.NEXT_PHASE !== "phase-production-build") console.error("[home] falling back to the seed layout", err);
    return seedHome();
  }
});

export async function getNav() {
  return navFrom(await getHome());
}

/** Whether a block is switched on (e.g. hide "Watch trailer" when the trailers block is off). */
export async function blockOn(id: HomeBlock["id"]) {
  return (await getHome()).some((b) => b.id === id && b.enabled);
}
