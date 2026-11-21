import { currentAdmin, require2fa } from "@/server/auth";
import { orderLink, RELEASE_LINK_DAYS, sampleOrder } from "@/server/email";
import { renderEmail, type EmailKind } from "@/server/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: EmailKind[] = ["order_created", "payment_submitted", "payment_approved", "payment_rejected", "info_required", "game_ready", "admin_submission", "test"];

/** Admin-only preview of each template with sample data (?format=text for the plain-text part). */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const admin = await currentAdmin();
  const { kind } = await params;
  if (!admin || (require2fa() && !admin.twoFactor) || !KINDS.includes(kind as EmailKind)) return new Response("Not found", { status: 404 });
  const note = kind === "payment_rejected" ? "The transaction was sent on the wrong network, so it never reached our address." : "Please upload a screenshot that shows the full transaction hash and the amount.";
  const email = renderEmail(kind as EmailKind, {
    order: sampleOrder,
    link: kind === "admin_submission" ? "/admin/orders" : orderLink(sampleOrder.paymentId),
    note,
    fulfillmentKind: "redemption_code",
    linkDays: RELEASE_LINK_DAYS,
  });
  const text = new URL(req.url).searchParams.get("format") === "text";
  return new Response(text ? `Subject: ${email.subject}\n\n${email.text}` : email.html, {
    headers: {
      "Content-Type": text ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // Inert preview: no scripts; only the template's inline styles and web fonts.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; frame-ancestors 'self'",
    },
  });
}
