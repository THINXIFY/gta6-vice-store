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
  await run("/admin/wallets", "Wallet saved.", () =>
    admin.updateWallet(me, { asset: text(form, "asset", 10), network: text(form, "network", 20), address: text(form, "address", 200), active: flag(form, "active"), validated: flag(form, "validated"), live: flag(form, "live") }, ip),
  );
}

export async function priceAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/pricing", "Price saved.", async () => {
    await admin.updatePrice(me, { editionId: text(form, "editionId", 40), platformId: text(form, "platformId", 40), dollars: text(form, "dollars", 20), active: flag(form, "active") }, ip);
    revalidatePath("/", "layout");
  });
}

export async function platformAction(form: FormData) {
  const me = await requireAdmin("owner");
  const ip = await requestIpHash();
  await run("/admin/pricing", "Platform updated.", async () => {
    await admin.setPlatformActive(me, text(form, "platformId", 40), flag(form, "active"), ip);
    revalidatePath("/", "layout");
  });
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
