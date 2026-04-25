import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransport() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] || 587);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env["MAIL_FROM"] || "noreply@qxwap.app";

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transport = createTransport();
  if (!transport) {
    logger.info({ to: opts.to, subject: opts.subject }, "📧 [DEV] email (no SMTP configured)");
    logger.info({ html: opts.html }, "📧 [DEV] email body");
    return;
  }
  await transport.sendMail({ from: FROM, ...opts });
}

export function otpHtml(code: string, purpose: "reset" | "verify") {
  const action = purpose === "reset" ? "รีเซ็ตรหัสผ่าน" : "ยืนยันอีเมล";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#7c3aed">QXwap — ${action}</h2>
      <p>รหัส OTP ของคุณคือ:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1e1e2e;background:#f3f4f6;padding:16px 24px;border-radius:12px;display:inline-block;margin:12px 0">${code}</div>
      <p style="color:#6b7280;font-size:14px">รหัสนี้หมดอายุใน 15 นาที อย่าแชร์กับใคร</p>
    </div>
  `;
}
