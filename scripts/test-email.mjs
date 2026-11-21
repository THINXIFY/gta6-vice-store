/**
 * SMTP client tests against an in-process fake SMTP server (no network, no dependencies):
 * conversation order, AUTH PLAIN/LOGIN, MIME body, header-injection refusal, error capture,
 * and the rule that unencrypted SMTP is only allowed for localhost.
 *   npm run test:email
 */
import assert from "node:assert/strict";
import net from "node:net";
import { buildMessage, parseAddress, sendMail } from "../src/server/email/smtp.ts";

function fakeServer({ auth = "PLAIN LOGIN", rejectRcpt = false } = {}) {
  const sessions = [];
  const server = net.createServer((sock) => {
    const s = { commands: [], data: "" };
    sessions.push(s);
    let inData = false;
    let buf = "";
    sock.write("220 fake ESMTP\r\n");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            sock.write("250 2.0.0 queued as FAKE123\r\n");
          } else s.data += line + "\r\n";
          continue;
        }
        s.commands.push(line);
        const cmd = line.split(" ")[0].toUpperCase();
        if (cmd === "EHLO") sock.write(`250-fake\r\n250-AUTH ${auth}\r\n250 8BITMIME\r\n`);
        else if (cmd === "AUTH" && line.startsWith("AUTH LOGIN")) sock.write("334 VXNlcm5hbWU6\r\n");
        else if (cmd === "AUTH") sock.write("235 ok\r\n");
        else if (s.commands.at(-2)?.startsWith("AUTH LOGIN")) sock.write("334 UGFzc3dvcmQ6\r\n");
        else if (s.commands.at(-3)?.startsWith("AUTH LOGIN")) sock.write("235 ok\r\n");
        else if (cmd === "MAIL") sock.write("250 ok\r\n");
        else if (cmd === "RCPT") sock.write(rejectRcpt ? "550 5.1.1 no such user\r\n" : "250 ok\r\n");
        else if (cmd === "DATA") {
          inData = true;
          sock.write("354 go\r\n");
        } else if (cmd === "QUIT") sock.end("221 bye\r\n");
        else sock.write("502 unknown\r\n");
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, sessions })));
}

const mail = { from: "VICE <orders@vice.test>", to: "buyer@example.com", subject: "Payment received: VICE-ABCDEFGH", text: "Hello\n.dot line", html: "<p>VICE-ABCDEFGH ünïcode</p>" };
let passed = 0;
const ok = (name) => console.log(`✓ ${name}`, ++passed);

{
  const { server, port, sessions } = await fakeServer();
  const r = await sendMail({ host: "127.0.0.1", port, security: "none", user: "u", pass: "p" }, mail);
  const s = sessions[0];
  assert.match(s.commands[0], /^EHLO /);
  assert.equal(s.commands[1], `AUTH PLAIN ${Buffer.from("\0u\0p").toString("base64")}`);
  assert.equal(s.commands[2], "MAIL FROM:<orders@vice.test>");
  assert.equal(s.commands[3], "RCPT TO:<buyer@example.com>");
  assert.match(s.data, /^Subject: Payment received: VICE-ABCDEFGH$/m);
  assert.match(s.data, /multipart\/alternative/);
  const parts = [...s.data.matchAll(/base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n--/g)].map((m) => Buffer.from(m[1].replace(/\r\n/g, ""), "base64").toString("utf8"));
  assert.equal(parts[0], mail.text);
  assert.equal(parts[1], mail.html);
  assert.match(r.messageId, /^<[0-9a-f]+@vice\.test>$/);
  ok("full conversation with AUTH PLAIN and a base64 MIME body");
  server.close();
}
{
  const { server, port, sessions } = await fakeServer({ auth: "LOGIN" });
  await sendMail({ host: "127.0.0.1", port, security: "none", user: "u", pass: "p" }, mail);
  assert.deepEqual(sessions[0].commands.slice(1, 4), ["AUTH LOGIN", Buffer.from("u").toString("base64"), Buffer.from("p").toString("base64")]);
  ok("AUTH LOGIN fallback");
  server.close();
}
{
  const { server, port } = await fakeServer({ rejectRcpt: true });
  await assert.rejects(sendMail({ host: "127.0.0.1", port, security: "none" }, mail), /RCPT failed: 550/);
  ok("server errors are reported");
  server.close();
}
{
  const { server, port } = await fakeServer();
  await assert.rejects(sendMail({ host: "127.0.0.1", port, security: "starttls", user: "u", pass: "p" }, mail), /does not offer STARTTLS/);
  ok("refuses to send credentials when STARTTLS is not offered");
  server.close();
}
await assert.rejects(sendMail({ host: "smtp.example.com", port: 25, security: "none" }, mail), /only allowed for a local/);
ok("unencrypted SMTP refused for remote hosts");
assert.throws(() => parseAddress("victim@example.com\r\nBcc: other@example.com"), /Invalid email/);
assert.throws(() => buildMessage({ ...mail, to: "a@b.c>, <evil@x.y" }), /Invalid email/);
assert.doesNotMatch(buildMessage({ ...mail, subject: "Hi\r\nBcc: x@y.z" }).data, /^Bcc:/m);
ok("header injection refused");
await assert.rejects(sendMail({ host: "127.0.0.1", port: 9, security: "none", timeoutMs: 1500 }, mail));
ok("connection failure is reported");
console.log(`\n${passed} email tests passed.`);
