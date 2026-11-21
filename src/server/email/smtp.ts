import { randomBytes } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

/**
 * Minimal SMTP submission client (RFC 5321/3207/4954), no dependencies.
 *  - tls:      implicit TLS (port 465)
 *  - starttls: plain connect, then STARTTLS is required before AUTH (port 587, default)
 *  - none:     no encryption, allowed only for a local mail catcher (localhost)
 * Bodies are base64-encoded MIME (multipart/alternative), so no dot-stuffing or 8-bit issues.
 */

export type SmtpConfig = { host: string; port: number; security: "tls" | "starttls" | "none"; user?: string; pass?: string; timeoutMs?: number };
export type Mail = { from: string; to: string; subject: string; text: string; html: string; replyTo?: string; headers?: Record<string, string> };

const ADDRESS = /^[^\s<>()",;:\\@]+@[^\s<>()",;:\\@]+\.[^\s<>()",;:\\@]+$/;
/** "Name <a@b.c>" or "a@b.c" → { name, address } (rejects anything that could inject headers). */
export function parseAddress(input: string): { name?: string; address: string } {
  const m = /^\s*(?:"?([^"<>\r\n]*?)"?\s*<([^<>\r\n]+)>|([^<>\s\r\n]+))\s*$/.exec(input);
  const address = (m?.[2] ?? m?.[3] ?? "").trim();
  if (!ADDRESS.test(address)) throw new Error(`Invalid email address: ${input.slice(0, 80)}`);
  const name = m?.[1]?.trim();
  return name ? { name, address } : { address };
}

const encodeWord = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v).toString("base64")}?=`);
const header = (v: string) => encodeWord(v.replace(/[\r\n]+/g, " ").trim());
const formatAddress = (a: { name?: string; address: string }) => (a.name ? `${/^[\x20-\x7e]*$/.test(a.name) ? `"${a.name.replace(/["\\]/g, "")}"` : encodeWord(a.name)} <${a.address}>` : a.address);
const b64 = (s: string) => Buffer.from(s).toString("base64").replace(/.{76}/g, "$&\r\n");

export function buildMessage(mail: Mail): { from: string; to: string; data: string; messageId: string } {
  const from = parseAddress(mail.from);
  const to = parseAddress(mail.to);
  const domain = from.address.split("@")[1]!;
  const messageId = `<${randomBytes(12).toString("hex")}@${domain}>`;
  const boundary = `vice-${randomBytes(12).toString("hex")}`;
  const lines = [
    `From: ${formatAddress(from)}`,
    `To: ${formatAddress(to)}`,
    ...(mail.replyTo ? [`Reply-To: ${formatAddress(parseAddress(mail.replyTo))}`] : []),
    `Subject: ${header(mail.subject)}`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    ...Object.entries(mail.headers ?? {}).map(([k, v]) => `${k.replace(/[^A-Za-z0-9-]/g, "")}: ${header(v)}`),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(mail.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(mail.html),
    `--${boundary}--`,
    "",
  ];
  return { from: from.address, to: to.address, data: lines.join("\r\n"), messageId };
}

class Conversation {
  private buffer = "";
  private waiting: ((r: { code: number; text: string }) => void) | null = null;
  private failure: Error | null = null;
  private onFail: ((e: Error) => void) | null = null;

  socket: net.Socket;

  constructor(socket: net.Socket) {
    this.socket = socket;
    this.attach(socket);
  }

  attach(socket: net.Socket) {
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.flush();
    });
    socket.on("error", (e) => this.fail(e));
    socket.on("close", () => this.fail(new Error("SMTP connection closed")));
  }

  private fail(e: Error) {
    this.failure ??= e;
    this.onFail?.(e);
  }

  private flush() {
    // A reply is complete at a line "NNN text" (a hyphen after the code means more lines follow).
    const lines = this.buffer.split("\r\n");
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\d{3}(?: |$)/.test(lines[i]!)) {
        const reply = lines.slice(0, i + 1);
        this.buffer = lines.slice(i + 1).join("\r\n");
        const done = this.waiting;
        this.waiting = null;
        done?.({ code: Number(reply.at(-1)!.slice(0, 3)), text: reply.map((l) => l.slice(4)).join("\n") });
        return;
      }
    }
  }

  read(): Promise<{ code: number; text: string }> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.waiting = resolve;
      this.onFail = reject;
      this.flush();
    });
  }

  async send(line: string, expect: number[]): Promise<string> {
    this.socket.write(line + "\r\n");
    return this.expect(expect, line.split(" ")[0]!);
  }

  async expect(codes: number[], step: string): Promise<string> {
    const r = await this.read();
    if (!codes.includes(r.code)) throw new Error(`SMTP ${step} failed: ${r.code} ${r.text.slice(0, 200)}`);
    return r.text;
  }
}

const isLocal = (host: string) => ["localhost", "127.0.0.1", "::1"].includes(host);

export async function sendMail(config: SmtpConfig, mail: Mail): Promise<{ messageId: string; response: string }> {
  if (config.security === "none" && !isLocal(config.host)) throw new Error("Unencrypted SMTP is only allowed for a local mail catcher.");
  const message = buildMessage(mail);
  const timeout = config.timeoutMs ?? 10_000;

  const socket: net.Socket =
    config.security === "tls" ? tls.connect({ host: config.host, port: config.port, servername: config.host }) : net.connect({ host: config.host, port: config.port });
  socket.setTimeout(timeout, () => socket.destroy(new Error("SMTP timeout")));
  const c = new Conversation(socket);
  const timer = setTimeout(() => socket.destroy(new Error("SMTP timeout")), timeout * 2);
  try {
    await c.expect([220], "greeting");
    const name = "vice.local";
    let features = await c.send(`EHLO ${name}`, [250]);
    if (config.security === "starttls") {
      if (!/^STARTTLS$/im.test(features)) throw new Error("SMTP server does not offer STARTTLS; refusing to send credentials in clear text.");
      await c.send("STARTTLS", [220]);
      const secure = tls.connect({ socket, servername: config.host });
      await new Promise<void>((resolve, reject) => {
        secure.once("secureConnect", resolve);
        secure.once("error", reject);
      });
      socket.removeAllListeners("data");
      socket.removeAllListeners("close");
      secure.setTimeout(timeout, () => secure.destroy(new Error("SMTP timeout")));
      c.attach(secure);
      features = await c.send(`EHLO ${name}`, [250]);
    }
    if (config.user) {
      const auth = /^AUTH[ =](.*)$/im.exec(features)?.[1]?.toUpperCase() ?? "";
      if (auth.includes("PLAIN")) {
        await c.send(`AUTH PLAIN ${Buffer.from(`\0${config.user}\0${config.pass ?? ""}`).toString("base64")}`, [235]);
      } else if (auth.includes("LOGIN")) {
        await c.send("AUTH LOGIN", [334]);
        await c.send(Buffer.from(config.user).toString("base64"), [334]);
        await c.send(Buffer.from(config.pass ?? "").toString("base64"), [235]);
      } else {
        throw new Error("SMTP server offers no supported AUTH method (PLAIN or LOGIN).");
      }
    }
    await c.send(`MAIL FROM:<${message.from}>`, [250]);
    await c.send(`RCPT TO:<${message.to}>`, [250, 251]);
    await c.send("DATA", [354]);
    // Base64 bodies never start a line with ".", but stuff anyway for safety.
    const response = await c.send(message.data.replace(/^\./gm, "..") + "\r\n.", [250]);
    await c.send("QUIT", [221]).catch(() => undefined);
    return { messageId: message.messageId, response: response.slice(0, 200) };
  } finally {
    clearTimeout(timer);
    c.socket.destroy();
  }
}
