import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";
import { renderContactEmailHtml } from "../utils/contact.ts";

test("Nodemailer sendMail preserves the envelope and buffered HTML without SMTP or delivery", async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  try {
    const html = renderContactEmailHtml({ name: "Fixture", email: "person@example.test", message: "Hello & goodbye\n<script>syntheticProbe()</script>", recaptchaToken: "synthetic-test-only" });
    assert.doesNotMatch(html, /<script>/);
    const result = await transport.sendMail({ from: "sender@example.test", to: "recipient@example.test", subject: "Synthetic transport contract", html });
    assert.deepEqual(result.envelope, { from: "sender@example.test", to: ["recipient@example.test"] });
    assert.equal(typeof result.messageId, "string");
    assert.ok(Buffer.isBuffer(result.message));
    assert.match(result.message.toString("utf8"), /Content-Type: text\/html/);
    assert.match(result.message.toString("utf8"), /Subject: Synthetic transport contract/);
  } finally { transport.close(); }
});
