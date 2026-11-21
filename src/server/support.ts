import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { paymentIdPattern } from "@/lib/orders/id";
import { contentPreview } from "@/lib/media";
import type { Admin } from "./auth";
import { getDb } from "./db";
import { notifySupport } from "./email";
import { Conflict } from "./orders";
import { email as parseEmail, InputError } from "./security";
import { getPublished } from "./content";

export const SUPPORT_TOPICS = { order: "An order", payment: "A payment", delivery: "Game delivery", refund: "A refund", other: "Something else" } as const;
export type SupportTopic = keyof typeof SUPPORT_TOPICS;

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const newReference = () => `SUP-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b & 31]).join("")}`;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "");

/**
 * Contact form submission. Accepted when the Contact page is published, or in content
 * preview (stored as a test message). A filled honeypot is accepted silently and dropped.
 */
export async function createSupportMessage(body: Record<string, unknown>, ipHash: string): Promise<{ reference: string }> {
  const published = (await getPublished()).contact;
  if (!published && !contentPreview) throw new Conflict("The contact form is not available yet.");
  if (clean(body.website, 200)) return { reference: newReference() }; // bot: pretend success, store nothing

  const topic = clean(body.topic, 20) as SupportTopic;
  if (!(topic in SUPPORT_TOPICS)) throw new InputError("Choose what your message is about.");
  const email = parseEmail(body.email);
  const name = clean(body.name, 120) || null;
  const paymentId = clean(body.paymentId, 20).toUpperCase() || null;
  if (paymentId && !paymentIdPattern.test(paymentId)) throw new InputError("A Payment ID looks like VICE-7K2M9QXR. Leave it empty if you do not have one.");
  const message = clean(body.message, 4000);
  if (message.length < 10) throw new InputError("Write a message of at least 10 characters.");

  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = newReference();
    const [row] = await db
      .insert(s.supportMessages)
      .values({ reference, name, email, topic, paymentId, message, isTest: !published, ipHash })
      .onConflictDoNothing()
      .returning({ id: s.supportMessages.id });
    if (row) {
      await notifySupport(row.id);
      return { reference };
    }
  }
  throw new Error("Could not allocate a support reference.");
}

export async function listSupport(status: "open" | "resolved" | "all" = "open") {
  const db = await getDb();
  const q = db.select().from(s.supportMessages);
  const rows = await (status === "all" ? q : q.where(eq(s.supportMessages.status, status))).orderBy(status === "open" ? s.supportMessages.createdAt : desc(s.supportMessages.createdAt)).limit(200);
  const [counts] = await db
    .select({ open: sql<number>`count(*) filter (where ${s.supportMessages.status} = 'open')::int`, resolved: sql<number>`count(*) filter (where ${s.supportMessages.status} = 'resolved')::int` })
    .from(s.supportMessages);
  return { rows, counts: counts! };
}

export async function openSupportCount() {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(s.supportMessages).where(eq(s.supportMessages.status, "open"));
  return r!.n;
}

/** Any admin can resolve or reopen a message; every change is audited. */
export async function setSupportStatus(admin: Admin, id: string, status: "open" | "resolved", ipHash: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new InputError("Message not found.");
  const db = await getDb();
  const actor = `admin:${admin.email}`;
  const updated = await db
    .update(s.supportMessages)
    .set(status === "resolved" ? { status, resolvedAt: new Date(), resolvedBy: actor } : { status, resolvedAt: null, resolvedBy: null })
    .where(and(eq(s.supportMessages.id, id), eq(s.supportMessages.status, status === "resolved" ? "open" : "resolved")))
    .returning({ id: s.supportMessages.id });
  if (!updated.length) throw new InputError("That message was already updated.");
  await db.insert(s.auditLogs).values({ actor, action: `support.${status}`, entity: "support", entityId: id, ipHash });
}
