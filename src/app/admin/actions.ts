"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as admin from "@/server/admin";
import { login, logout, requestIpHash, requireAdmin } from "@/server/auth";
import { NotFound } from "@/server/orders";
import { retryEmail, RetryError } from "@/server/email";
import { rateLimit } from "@/server/security";
import { setSupportStatus } from "@/server/support";

/**
 * Admin Server Actions. Next.js only accepts them as same-origin POSTs; each one re-checks
 * the session (and role inside the service) before doing anything.
 */

const text = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const flag = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

async function run(path: string, ok: string, fn: () => Promise<void>): Promise<never> {
  let qs: string;
  try {
    await fn();
    qs = `ok=${encodeURIComponent(ok)}`;
  } catch (err) {
    if (err instanceof admin.AdminError || err instanceof NotFound) qs = `error=${encodeURIComponent(err.message)}`;
    else throw err;
  }
  redirect(`${path}${path.includes("?") ? "&" : "?"}${qs}`);
}

export async function loginAction(_: unknown, form: FormData): Promise<{ error?: string; needCode?: boolean }> {
  const email = text(form, "email", 254).toLowerCase();
  const code = text(form, "code", 12) || undefined;
  const ip = await requestIpHash();
  // Each step (password, then code) counts, so the per-email budget allows a few full sign-ins.
  const byIp = await rateLimit(`admin-login:${ip}`, 12, 15 * 60_000);
  const byEmail = await rateLimit(`admin-login-email:${email}`, 8, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) return { error: "Too many sign-in attempts. Try again in 15 minutes.", needCode: Boolean(code) };
  const user = await login(email, String(form.get("password") ?? ""), code);
  if (user === "code_required") return { needCode: true };
  if (!user) return code ? { error: "That code is not valid. Enter the current code from your authenticator app.", needCode: true } : { error: "Incorrect email or password." };
  redirect("/admin");
}

// ── Two-factor authentication ───────────────────────────────────────────────

export async function start2faAction() {
  const me = await requireAdmin(undefined, { allowWithout2fa: true });
  await run("/admin/settings", "Scan the QR code, then enter a code to finish.", () => admin.startTotp(me));
}

export async function confirm2faAction(form: FormData) {
  const me = await requireAdmin(undefined, { allowWithout2fa: true });
  const ip = await requestIpHash();
  await run("/admin/settings", "Two-factor authentication is on.", () => admin.confirmTotp(me, text(form, "code", 12), ip));
}

export async function cancel2faAction() {
  const me = await requireAdmin(undefined, { allowWithout2fa: true });
  await run("/admin/settings", "Setup cancelled.", () => admin.cancelTotp(me));
}

export async function disable2faAction(form: FormData) {
  const me = await requireAdmin();
  const ip = await requestIpHash();
  await run("/admin/settings", "Two-factor authentication is off.", () => admin.disableTotp(me, text(form, "code", 12), ip));
}

export async function reset2faAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/settings", "Two-factor authentication reset. They must set it up again.", () => admin.resetTotp(me, text(form, "id", 40), ip));
}

// ── Screenshot retention ────────────────────────────────────────────────────

export async function purgeScreenshotsAction() {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  let n = 0;
  await run("/admin/settings", "Retention purge complete.", async () => {
    n = await admin.purgeScreenshots(me, ip);
    if (!n) throw new admin.AdminError("No screenshots are due for deletion yet.");
  });
}

export async function testEmailAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const to = text(form, "to", 254);
  const limit = await rateLimit(`admin-test-email:${me.id}`, 5, 10 * 60_000);
  await run("/admin/emails", `Test email sent to ${to}.`, async () => {
    if (!limit.ok) throw new admin.AdminError("Too many test emails. Try again in a few minutes.");
    const status = await admin.testEmail(me, to, ip);
    if (status === "failed") throw new admin.AdminError("The test email could not be sent. The delivery log shows the error.");
    if (status === "skipped") throw new admin.AdminError("The test email was logged but not sent. The delivery log shows why.");
  });
}

export async function supportStatusAction(form: FormData) {
  const me = await requireAdmin();
  const ip = await requestIpHash();
  const id = text(form, "id", 40);
  const status = form.get("status") === "open" ? "open" : "resolved";
  await run(`/admin/support?view=${status === "resolved" ? "open" : "resolved"}`, status === "resolved" ? "Marked as resolved." : "Reopened.", async () => {
    try {
      await setSupportStatus(me, id, status, ip);
    } catch (e) {
      throw new admin.AdminError((e as Error).message);
    }
  });
}

/** Owner-only: send a failed email again (rebuilt from current records; audited). */
export async function retryEmailAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 40);
  const back = text(form, "back", 200);
  // Return only to an admin path (no open redirect).
  const path = /^\/admin(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(back) ? back : "/admin/emails";
  const limit = await rateLimit(`admin-email-retry:${me.id}`, 20, 10 * 60_000);
  await run(path, "Email sent.", async () => {
    if (!limit.ok) throw new admin.AdminError("Too many retries. Try again in a few minutes.");
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new admin.AdminError("Email not found.");
    let status: string;
    try {
      status = await retryEmail(id);
    } catch (e) {
      if (e instanceof RetryError) throw new admin.AdminError(e.message);
      throw e;
    }
    await admin.auditEmailRetry(me, id, status, ip);
    if (status !== "sent") throw new admin.AdminError(status === "skipped" ? "Not sent: email delivery is not configured. The log shows why." : "The retry failed again. The log shows the error.");
  });
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function reviewAction(form: FormData) {
  const me = await requireAdmin();
  const paymentId = text(form, "paymentId", 20);
  const action = text(form, "action", 20) as Parameters<typeof admin.review>[2];
  const labels: Record<string, string> = {
    start_review: "Review started.",
    approve: "Payment approved.",
    request_info: "Customer asked for more information.",
    reject: "Payment rejected.",
    release: "Game released to the customer.",
    note: "Note saved.",
  };
  if (!(action in labels)) redirect(`/admin/orders/${paymentId}?error=Unknown%20action`);
  const ip = await requestIpHash();
  await run(`/admin/orders/${paymentId}`, labels[action]!, async () => {
    await admin.review(
      me,
      paymentId,
      action,
      { verifiedAmount: text(form, "verifiedAmount", 40), checklist: form.getAll("checklist").map(String), customerNote: text(form, "customerNote", 1000), adminNote: text(form, "adminNote", 2000) },
      ip,
    );
    revalidatePath("/admin", "layout");
  });
}

export async function walletAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/wallets", "Wallet saved.", async () => {
    await admin.updateWallet(me, { asset: text(form, "asset", 10), network: text(form, "network", 20), address: text(form, "address", 200), active: flag(form, "active"), validated: flag(form, "validated"), live: flag(form, "live") }, ip);
    // Checkout offers methods from the database (catalogue), so refresh every page.
    revalidatePath("/", "layout");
  });
}

export async function addWalletAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const [asset = "", network = ""] = text(form, "method", 40).split(":");
  await run("/admin/wallets", "Payment method added. Enter its receiving address.", async () => {
    await admin.addWallet(me, { asset, network }, ip);
    revalidatePath("/", "layout");
  });
}

export async function priceAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/pricing", "Price saved.", async () => {
    await admin.updatePrice(me, { editionId: text(form, "editionId", 40), platformId: text(form, "platformId", 40), dollars: text(form, "dollars", 20), active: flag(form, "active") }, ip);
    revalidatePath("/", "layout");
  });
}


// ── Catalogue (WL-2): product, editions, platforms, edition contents ─────────

const CATALOGUE = "/admin/pricing";

export async function productAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run(CATALOGUE, "Product saved.", async () => {
    await admin.updateProduct(me, { title: text(form, "title", 200), shortTitle: text(form, "shortTitle", 80) }, ip);
    revalidatePath("/", "layout");
  });
}

export async function editionAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 60) || undefined;
  await run(CATALOGUE, id ? "Edition saved." : "Edition added.", async () => {
    await admin.saveEdition(
      me,
      {
        id,
        name: text(form, "name", 200),
        summary: text(form, "summary", 1000),
        shortSummary: text(form, "shortSummary", 200),
        recommended: flag(form, "recommended"),
        sort: text(form, "sort", 6),
        active: flag(form, "active"),
      },
      ip,
    );
    revalidatePath("/", "layout");
  });
}

export async function platformEditAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 60) || undefined;
  await run(CATALOGUE, id ? "Platform saved." : "Platform added.", async () => {
    await admin.savePlatform(
      me,
      {
        id,
        name: text(form, "name", 200),
        shortName: text(form, "shortName", 100),
        sort: text(form, "sort", 6),
        redeemLabel: text(form, "redeemLabel", 200),
        redeemUrl: text(form, "redeemUrl", 600),
        redeemSteps: text(form, "redeemSteps", 3000),
        active: flag(form, "active"),
      },
      ip,
    );
    revalidatePath("/", "layout");
  });
}

export async function editionItemAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 60) || undefined;
  await run(CATALOGUE, id ? "Item saved." : "Item added.", async () => {
    await admin.saveEditionItem(
      me,
      { id, category: text(form, "category", 200), name: text(form, "name", 400), editionIds: form.getAll("editionIds").map(String), sort: text(form, "sort", 6) },
      ip,
    );
    revalidatePath("/", "layout");
  });
}

export async function deleteEditionItemAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run(CATALOGUE, "Item removed.", async () => {
    await admin.deleteEditionItem(me, text(form, "id", 60), ip);
    revalidatePath("/", "layout");
  });
}

// ── Homepage layout (WL-3) ───────────────────────────────────────────────────

const HOMEPAGE = "/admin/homepage";

export async function homeBlockAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run(HOMEPAGE, "Homepage saved.", async () => {
    await admin.saveHomeBlock(me, { id: text(form, "id", 40), enabled: flag(form, "enabled"), nav: text(form, "nav", 60) }, ip);
    revalidatePath("/", "layout");
  });
}

export async function moveHomeBlockAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const direction = text(form, "direction", 4) === "up" ? "up" : "down";
  await run(HOMEPAGE, "Order updated.", async () => {
    await admin.moveHomeBlock(me, text(form, "id", 40), direction, ip);
    revalidatePath("/", "layout");
  });
}

export async function resetHomeAction() {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run(HOMEPAGE, "Homepage reset to the default layout.", async () => {
    await admin.resetHome(me, ip);
    revalidatePath("/", "layout");
  });
}

// ── Content (WL-4) ───────────────────────────────────────────────────────────

const contentPath = (tab: string, anchor = "") => `/admin/content?tab=${tab}${anchor ? `&at=${encodeURIComponent(anchor)}` : ""}`;

export async function copyAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const section = text(form, "section", 40);
  const fields = Object.fromEntries([...form.entries()].filter(([k]) => k.startsWith("f:")).map(([k, v]) => [k.slice(2), String(v).slice(0, 2000)]));
  await run(contentPath("text", section), "Wording saved.", async () => {
    await admin.saveCopy(me, section, fields, ip);
    revalidatePath("/", "layout");
  });
}

export async function resetCopyAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const section = text(form, "section", 40);
  await run(contentPath("text", section), "Wording reset to the default.", async () => {
    await admin.resetCopy(me, section, ip);
    revalidatePath("/", "layout");
  });
}

export async function faqAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 80) || undefined;
  await run(contentPath("faq"), id ? "Question saved." : "Question added.", async () => {
    await admin.saveFaq(
      me,
      {
        id,
        group: text(form, "group", 20),
        question: text(form, "question", 400),
        answer: text(form, "answer", 3000),
        published: flag(form, "published"),
        checkoutOnly: flag(form, "checkoutOnly"),
        source: text(form, "source", 400),
      },
      ip,
    );
    revalidatePath("/", "layout");
  });
}

export async function deleteFaqAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run(contentPath("faq"), "Question removed.", async () => {
    await admin.deleteFaq(me, text(form, "id", 80), ip);
    revalidatePath("/", "layout");
  });
}

export async function moveFaqAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run(contentPath("faq"), "Order updated.", async () => {
    await admin.moveFaq(me, text(form, "id", 80), text(form, "direction", 4) === "up" ? "up" : "down", ip);
    revalidatePath("/", "layout");
  });
}

export async function noteAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 80) || undefined;
  await run(contentPath("notes"), id ? "Note saved." : "Note added.", async () => {
    await admin.saveNote(me, { id, title: text(form, "title", 200), body: text(form, "body", 800), published: flag(form, "published") }, ip);
    revalidatePath("/", "layout");
  });
}

export async function deleteNoteAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run(contentPath("notes"), "Note removed.", async () => {
    await admin.deleteNote(me, text(form, "id", 80), ip);
    revalidatePath("/", "layout");
  });
}

export async function pageAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 40);
  await run(contentPath("pages", id), "Page saved.", async () => {
    await admin.savePage(
      me,
      id,
      {
        title: text(form, "title", 200),
        heading: text(form, "heading", 300),
        description: text(form, "description", 400),
        intro: text(form, "intro", 3000),
        sections: String(form.get("sections") ?? "").slice(0, 50_000),
        updated: text(form, "updated", 10),
      },
      ip,
    );
    revalidatePath("/", "layout");
  });
}

export async function publishAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const id = text(form, "id", 40);
  const publish = flag(form, "publish");
  await run(contentPath("pages", id), publish ? "Page published." : "Page unpublished.", async () => {
    await admin.setPagePublished(me, id, publish, ip);
    revalidatePath("/", "layout");
  });
}

export async function emailIdentityAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/emails", "Sender settings saved.", () =>
    admin.saveEmailIdentity(me, { fromName: text(form, "fromName", 120), replyTo: text(form, "replyTo", 200), adminNotify: text(form, "adminNotify", 2000) }, ip),
  );
}

export async function addInventoryAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const kind = text(form, "kind", 20) === "access_link" ? "access_link" : "redemption_code";
  await run("/admin/fulfillment", "Item added to inventory.", () =>
    admin.addInventory(
      me,
      { editionId: text(form, "editionId", 40), platformId: text(form, "platformId", 40), kind, secret: text(form, "secret", 500), sourceReference: text(form, "sourceReference", 200), region: text(form, "region", 40), isTest: flag(form, "isTest") },
      ip,
    ),
  );
}

export async function removeInventoryAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/fulfillment", "Item removed.", () => admin.removeInventory(me, text(form, "id", 40), ip));
}

export async function createAdminAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  const role = text(form, "role", 10) === "owner" ? "owner" : "reviewer";
  await run("/admin/settings", "Admin created.", () => admin.createAdmin(me, { email: text(form, "email", 254).toLowerCase(), role, password: String(form.get("password") ?? "") }, ip));
}

export async function setAdminActiveAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/settings", "Admin updated.", () => admin.setAdminActive(me, text(form, "id", 40), flag(form, "active"), ip));
}

export async function changePasswordAction(form: FormData) {
  const me = await requireAdmin();
  const ip = await requestIpHash();
  await run("/admin/settings", "Password changed.", () => admin.changePassword(me, String(form.get("current") ?? ""), String(form.get("next") ?? ""), ip));
}
