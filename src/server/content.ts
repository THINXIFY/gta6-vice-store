import "server-only";
import { cache } from "react";
import { infoPages, type InfoPage } from "@/config/legal";
import { assurances, faq as defaultFaq, type Assurance, type FaqItem } from "@/config/policies";
import { site, type PageId } from "@/config/site";
import * as s from "@/db/schema";
import { applyCopy, type Copy, type CopyOverrides } from "@/lib/content";
import { getDb } from "./db";

export type Published = Record<PageId, boolean>;
/** The editable parts of an information page. */
export type PageEdit = Pick<InfoPage, "title" | "heading" | "description" | "intro" | "sections" | "updated">;

/** Email sender identity set in Admin → Emails (the From address itself stays in EMAIL_FROM). */
export type EmailIdentity = { fromName: string; replyTo: string; adminNotify: string[] };

export type SiteContent = {
  copy: Copy;
  copyOverrides: CopyOverrides;
  faq: FaqItem[];
  notes: Assurance[];
  published: Published;
  pages: Record<PageId, InfoPage>;
  email: EmailIdentity;
};

const PAGE_IDS = Object.keys(site.pages) as PageId[];
export const defaultPublished = (): Published => Object.fromEntries(PAGE_IDS.map((id) => [id, site.pages[id].published])) as Published;

function build(rows: { key: string; value: unknown }[]): SiteContent {
  const get = <T,>(key: string) => rows.find((r) => r.key === key)?.value as T | undefined;
  const copyOverrides = get<CopyOverrides>("copy") ?? {};
  const pages = Object.fromEntries(
    PAGE_IDS.map((id) => {
      const edit = get<Partial<PageEdit>>(`page:${id}`);
      return [id, { ...infoPages[id], ...(edit ?? {}) }];
    }),
  ) as Record<PageId, InfoPage>;
  return {
    copy: applyCopy(copyOverrides),
    copyOverrides,
    faq: get<FaqItem[]>("faq") ?? defaultFaq,
    notes: get<Assurance[]>("notes") ?? assurances,
    published: { ...defaultPublished(), ...(get<Partial<Published>>("pages") ?? {}) },
    pages,
    email: { fromName: "", replyTo: "", adminNotify: [], ...(get<Partial<EmailIdentity>>("email") ?? {}) },
  };
}

/**
 * This client's wording (Admin → Content) over the defaults, once per request. Falls back to the
 * defaults when the database is unavailable (e.g. during `next build`).
 */
export const getContent = cache(async (): Promise<SiteContent> => {
  try {
    const db = await getDb();
    return build(await db.select().from(s.siteContent));
  } catch (err) {
    if (process.env.NEXT_PHASE !== "phase-production-build") console.error("[content] falling back to the default wording", err);
    return build([]);
  }
});

export const getCopy = async () => (await getContent()).copy;
export const getPublished = async () => (await getContent()).published;
export const getInfoPage = async (id: PageId) => (await getContent()).pages[id];
