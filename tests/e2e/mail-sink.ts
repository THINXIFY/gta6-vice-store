import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

/**
 * Playwright global setup: a fake SMTP inbox on 127.0.0.1:2526 so e2e tests exercise real
 * delivery (the app's SMTP client, MIME and templates). Messages are saved as JSON files in
 * .data/test-mail/ for tests to read; see readInbox() in mail.ts.
 */
export const MAIL_DIR = path.join(process.cwd(), ".data", "test-mail");
export const MAIL_PORT = 2526;

export default async function setup() {
  rmSync(MAIL_DIR, { recursive: true, force: true });
  mkdirSync(MAIL_DIR, { recursive: true });
  let n = 0;
  const server = net.createServer((sock) => {
    let buf = "";
    let data: string | null = null;
    let to = "";
    sock.write("220 test-sink ESMTP\r\n");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (data !== null) {
          if (line === ".") {
            writeFileSync(path.join(MAIL_DIR, `${Date.now()}-${++n}.json`), JSON.stringify({ to, raw: data }));
            data = null;
            sock.write("250 2.0.0 stored\r\n");
          } else data += (line.startsWith("..") ? line.slice(1) : line) + "\r\n";
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") sock.write("250-test-sink\r\n250 8BITMIME\r\n");
        else if (cmd === "RCPT") {
          to = /<([^>]+)>/.exec(line)?.[1] ?? "";
          sock.write("250 ok\r\n");
        } else if (cmd === "DATA") {
          data = "";
          sock.write("354 go\r\n");
        } else if (cmd === "QUIT") sock.end("221 bye\r\n");
        else sock.write("250 ok\r\n");
      }
    });
    sock.on("error", () => undefined);
  });
  await new Promise<void>((resolve) => server.listen(MAIL_PORT, "127.0.0.1", resolve));
  return () => new Promise<void>((resolve) => server.close(() => resolve()));
}
