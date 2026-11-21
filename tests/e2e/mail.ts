import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { MAIL_DIR } from "./mail-sink";

export type Received = { to: string; subject: string; html: string; text: string; headers: string };

/** Messages captured by the fake SMTP inbox (decoded MIME parts). */
export function readInbox(): Received[] {
  let files: string[] = [];
  try {
    files = readdirSync(MAIL_DIR).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return files.map((f) => {
    const { to, raw } = JSON.parse(readFileSync(path.join(MAIL_DIR, f), "utf8")) as { to: string; raw: string };
    const headers = raw.split("\r\n\r\n")[0]!;
    const subjectRaw = /^Subject: (.*)$/m.exec(headers)?.[1] ?? "";
    const subject = subjectRaw.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, b) => Buffer.from(b, "base64").toString("utf8"));
    const part = (type: string) => {
      const m = new RegExp(`Content-Type: ${type}; charset=utf-8\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n([A-Za-z0-9+/=\\r\\n]+?)\\r\\n--`).exec(raw);
      return m ? Buffer.from(m[1]!.replace(/\r\n/g, ""), "base64").toString("utf8") : "";
    };
    return { to, subject, headers, html: part("text/html"), text: part("text/plain") };
  });
}
