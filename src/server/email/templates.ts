import { brand } from "@/brand/brand";
import { emailPalette } from "@/brand/theme";
import { site } from "@/config/site";

/**
 * Branded transactional emails. Table layout + inline styles (the only thing every client
 * renders), 600px column, dark VICE palette with a sunset CTA. Every value is escaped.
 * Each template returns subject, HTML and a plain-text alternative.
 */

export type EmailKind = "order_created" | "payment_submitted" | "payment_approved" | "payment_rejected" | "info_required" | "game_ready" | "admin_submission" | "support_received" | "admin_support" | "test";

export type EmailOrder = {
  paymentId: string;
  reference: string;
  edition: string;
  platform: string;
  price: string;
  amount: string;
  asset: string;
  network: string;
  address?: string | null;
  quoteExpiresAt?: Date | null;
  txid?: string | null;
  claimedAmount?: string | null;
  verifiedAmount?: string | null;
  email?: string;
  isTest: boolean;
};

export type EmailData = {
  order?: EmailOrder;
  /** Customer-facing link (may carry a private key in the URL fragment). */
  link?: string;
  /** Administrator's message for rejected / info-required emails. */
  note?: string | null;
  fulfillmentKind?: "redemption_code" | "access_link";
  linkDays?: number;
  /** Contact-form message (support emails). */
  support?: { reference: string; topic: string; paymentId?: string | null; name?: string | null; email: string; message: string; isTest: boolean };
  /** Test mode: who the email was meant for. */
  redirectedFrom?: string;
};

/** This client's colours and font names (src/brand); email clients ignore CSS variables. */
const C = emailPalette;
const SANS = `'${brand.fonts.sans}','Helvetica Neue',Helvetica,Arial,sans-serif`;
const DISPLAY = `'${brand.fonts.display}',Impact,'Arial Narrow Bold','Arial Narrow',sans-serif`;
const MONO = `ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace`;

export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
const fmtDate = (d?: Date | null) => (d ? `${d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : "");

type Row = [label: string, value: string | null | undefined, mono?: boolean];
type Block = { heading: string; intro: string; rows?: Row[]; note?: { title: string; text: string; tone: "vice" | "lavender" | "sunset" }; cta?: { label: string; href: string }; after?: string };

function rowsHtml(rows: Row[]) {
  return rows
    .filter(([, v]) => v)
    .map(
      ([k, v, mono], i) => `<tr>
  <td style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font:500 13px/1.4 ${SANS};color:${C.muted};width:42%;vertical-align:top">${esc(k)}</td>
  <td style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font:${mono ? `500 13px/1.5 ${MONO}` : `600 14px/1.4 ${SANS}`};color:${C.warm};word-break:break-all;vertical-align:top">${esc(v)}</td>
</tr>`,
    )
    .join("");
}

function layout(preheader: string, b: Block, data: EmailData, audience: "customer" | "admin") {
  const testBanner = data.order?.isTest || data.support?.isTest || data.redirectedFrom
    ? `<tr><td style="padding:10px 24px;background:${C.warnBg};font:600 12px/1.5 ${SANS};color:${C.warnText};text-align:center">Test email${data.redirectedFrom ? ` (intended for ${esc(data.redirectedFrom)})` : ""}. No real payment or game is involved.</td></tr>`
    : "";
  const note = b.note
    ? `<tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid ${C[b.note.tone]};background:${C.note};border-radius:0 10px 10px 0"><tr><td style="padding:16px 18px">
  <p style="margin:0 0 6px;font:700 13px/1.4 ${SANS};color:${C.warm}">${esc(b.note.title)}</p>
  <p style="margin:0;font:400 14px/1.6 ${SANS};color:${C.body};white-space:pre-line">${esc(b.note.text)}</p>
</td></tr></table></td></tr>`
    : "";
  const cta = b.cta
    ? `<tr><td style="padding:28px 32px 4px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${C.sunset};background-image:linear-gradient(100deg,${C.vice},${C.sunset})">
  <a href="${esc(b.cta.href)}" style="display:inline-block;padding:14px 28px;font:700 15px/1 ${SANS};color:${C.bg};text-decoration:none;border-radius:999px">${esc(b.cta.label)}</a>
</td></tr></table></td></tr>`
    : "";
  const footer =
    audience === "customer"
      ? `You are receiving this email because an order was placed at ${esc(site.name)} with this address.`
      : `Sent to ${esc(site.name)} administrators. Verify every payment on the blockchain before approving.`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${esc(b.heading)}</title>
<style>@media (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:26px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
  <tr><td style="padding:0 8px 20px"><span style="font:800 30px/1 ${DISPLAY};letter-spacing:2px;color:${C.warm}">${esc(site.wordmark[0])} <span style="color:${C.sunset}">${esc(site.wordmark[1])}</span></span>${audience === "admin" ? `<span style="font:600 12px/1 ${SANS};color:${C.muted};padding-left:8px">Admin</span>` : ""}</td></tr>
  <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="height:4px;line-height:4px;font-size:0;background:${C.vice};background-image:linear-gradient(90deg,${C.vice},${C.sunset},${C.lavender})">&nbsp;</td></tr>
      ${testBanner}
      <tr><td class="px" style="padding:36px 32px 8px">
        <h1 class="h1" style="margin:0;font:700 30px/1.15 ${SANS};letter-spacing:-0.5px;color:${C.warm}">${esc(b.heading)}</h1>
        <p style="margin:14px 0 0;font:400 16px/1.6 ${SANS};color:${C.body}">${b.intro}</p>
      </td></tr>
      ${note}
      ${b.rows?.length ? `<tr><td class="px" style="padding:20px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(b.rows)}</table></td></tr>` : ""}
      ${cta}
      ${b.after ? `<tr><td class="px" style="padding:20px 32px 0;font:400 13px/1.6 ${SANS};color:${C.muted}">${b.after}</td></tr>` : ""}
      <tr><td style="padding:0 0 32px"></td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:22px 12px 0;font:400 12px/1.6 ${SANS};color:${C.faint};text-align:center">${footer}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function textVersion(b: Block, data: EmailData) {
  const strip = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [
    data.order?.isTest || data.support?.isTest || data.redirectedFrom ? `[TEST EMAIL${data.redirectedFrom ? ` intended for ${data.redirectedFrom}` : ""}. No real payment or game is involved.]\n` : "",
    b.heading.toUpperCase(),
    "",
    strip(b.intro),
    b.note ? `\n${b.note.title}:\n${b.note.text}` : "",
    b.rows?.length ? "\n" + b.rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n") : "",
    b.cta ? `\n${b.cta.label}: ${b.cta.href}` : "",
    b.after ? `\n${strip(b.after)}` : "",
    `\n--\n${site.name}`,
  ].join("\n");
}

const orderRows = (o: EmailOrder): Row[] => [
  ["Payment ID", o.paymentId, true],
  ["Order reference", o.reference, true],
  ["Edition", `${o.edition}, ${o.platform}`],
  ["Price", o.price],
];

export function renderEmail(kind: EmailKind, data: EmailData): { subject: string; html: string; text: string } {
  const o = data.order;
  const pid = o?.paymentId ?? "";
  const test = o?.isTest ? "[Test] " : "";
  let subject: string;
  let preheader: string;
  let block: Block;
  let audience: "customer" | "admin" = "customer";

  switch (kind) {
    case "order_created":
      subject = `${test}Complete your payment for order ${pid}`;
      preheader = `Send ${o!.amount} ${o!.asset} on ${o!.network} to complete your order.`;
      block = {
        heading: "Complete your payment",
        intro: `Thanks for your order. Send <strong style="color:${C.warm}">exactly ${esc(o!.amount)} ${esc(o!.asset)}</strong> on the ${esc(o!.network)} network to the address below${o!.quoteExpiresAt ? ` before ${esc(fmtDate(o!.quoteExpiresAt))}` : ""}. Then submit your transaction hash and a screenshot on your order page.`,
        rows: [...orderRows(o!), ["Amount to send", `${o!.amount} ${o!.asset}`, true], ["Network", o!.network], ["Receiving address", o!.address, true], ["Quote valid until", fmtDate(o!.quoteExpiresAt)]],
        note: { title: "Send on the right network", text: `Only send ${o!.asset} on ${o!.network}. Funds sent on another network or in another coin can be lost.`, tone: "sunset" },
        cta: data.link ? { label: "Open your order", href: data.link } : undefined,
        after: "This link opens your private order page. Keep this email and do not forward it.",
      };
      break;
    case "payment_submitted":
      subject = `${test}We received your payment details for ${pid}`;
      preheader = "We are verifying your transaction. This usually takes about 30 minutes.";
      block = {
        heading: "Payment received for review",
        intro: `We have your transaction details and are verifying them on the blockchain. Verification usually takes <strong style=\"color:${C.warm}\">about 30 minutes</strong>. We will email you as soon as it is done.`,
        rows: [...orderRows(o!), ["Amount reported", o!.claimedAmount ? `${o!.claimedAmount} ${o!.asset}` : null, true], ["Network", o!.network], ["Transaction hash", o!.txid, true]],
        cta: data.link ? { label: "Check order status", href: data.link } : undefined,
        after: "Every payment is checked by a person. Nothing is approved automatically.",
      };
      break;
    case "payment_approved":
      subject = `${test}Payment verified for order ${pid}`;
      preheader = "Your payment is confirmed. We will email you when your game is ready.";
      block = {
        heading: "Your payment is verified",
        intro: "We confirmed your transaction on the blockchain. Your game is being prepared, and we will email you again when it is ready.",
        rows: [...orderRows(o!), ["Amount verified", o!.verifiedAmount ? `${o!.verifiedAmount} ${o!.asset}` : null, true], ["Network", o!.network]],
        cta: data.link ? { label: "Check order status", href: data.link } : undefined,
      };
      break;
    case "payment_rejected":
      subject = `${test}We could not verify the payment for ${pid}`;
      preheader = "Your payment could not be verified. See the reason inside.";
      block = {
        heading: "We could not verify your payment",
        intro: "We checked the transaction you submitted and could not accept it for this order.",
        note: { title: "Reason", text: data.note ?? "", tone: "vice" },
        rows: orderRows(o!),
        cta: data.link ? { label: "View your order", href: data.link } : undefined,
        after: "If you think this is a mistake, reply with your Payment ID and transaction hash and we will look again.",
      };
      break;
    case "info_required":
      subject = `${test}More information needed for order ${pid}`;
      preheader = "We need a little more information to verify your payment.";
      block = {
        heading: "We need more information",
        intro: "We could not finish verifying your payment yet. Please read the message below and send the details from your order page.",
        note: { title: "What we need", text: data.note ?? "", tone: "lavender" },
        rows: orderRows(o!),
        cta: data.link ? { label: "Update your order", href: data.link } : undefined,
      };
      break;
    case "game_ready":
      subject = `${test}Your game is ready: order ${pid}`;
      preheader = "Your order is complete. Open your order page to get your game.";
      block = {
        heading: "Your game is ready",
        intro: `Your order is complete. Open your order page to see your ${data.fulfillmentKind === "access_link" ? "access link" : "redemption code"} and how to use it.`,
        rows: orderRows(o!),
        cta: data.link ? { label: "Get your game", href: data.link } : undefined,
        after: `For your security, the ${data.fulfillmentKind === "access_link" ? "link" : "code"} is not included in this email. The button opens your private order page and works for ${data.linkDays ?? 30} days. Do not forward this email.`,
      };
      break;
    case "admin_submission":
      audience = "admin";
      subject = `${test}Payment to review: ${pid}`;
      preheader = `${o!.claimedAmount ?? "?"} ${o!.asset} reported on ${o!.network}.`;
      block = {
        heading: "New payment to review",
        intro: "A customer submitted payment details. Check the transaction on the blockchain before approving.",
        rows: [
          ["Payment ID", o!.paymentId, true],
          ["Customer", o!.email],
          ["Edition", `${o!.edition}, ${o!.platform}`],
          ["Expected", `${o!.amount} ${o!.asset}`, true],
          ["Reported", o!.claimedAmount ? `${o!.claimedAmount} ${o!.asset}` : null, true],
          ["Network", o!.network],
          ["Transaction hash", o!.txid, true],
        ],
        cta: data.link ? { label: "Review payment", href: data.link } : undefined,
      };
      break;
    case "support_received": {
      const m = data.support!;
      subject = `${m.isTest ? "[Test] " : ""}We received your message (${m.reference})`;
      preheader = "Thanks for contacting us. We will reply by email.";
      block = {
        heading: "We received your message",
        intro: "Thanks for getting in touch. A member of our team will read your message and reply to this email address. Please keep your reference number.",
        rows: [["Reference", m.reference, true], ["Topic", m.topic], ["Payment ID", m.paymentId, true]],
        after: "We will never ask for your wallet private key, recovery phrase or console password.",
      };
      break;
    }
    case "admin_support": {
      audience = "admin";
      const m = data.support!;
      subject = `${m.isTest ? "[Test] " : ""}Support message ${m.reference}: ${m.topic}`;
      preheader = m.message.slice(0, 90);
      block = {
        heading: "New support message",
        intro: "A customer sent a message through the contact form.",
        rows: [["Reference", m.reference, true], ["From", m.name ? `${m.name} <${m.email}>` : m.email], ["Topic", m.topic], ["Payment ID", m.paymentId, true]],
        note: { title: "Message", text: m.message, tone: "lavender" },
        cta: data.link ? { label: "Open in Admin", href: data.link } : undefined,
      };
      break;
    }
    case "test":
      audience = "admin";
      subject = `Test email from ${site.name} admin`;
      preheader = "Your email settings work.";
      block = {
        heading: "Your email settings work",
        intro: `This test was sent from ${esc(site.name)} admin settings. Order emails will look like this.`,
        rows: [["Sent at", fmtDate(new Date())]],
      };
      break;
  }
  return { subject, html: layout(preheader, block, data, audience), text: textVersion(block, data) };
}
