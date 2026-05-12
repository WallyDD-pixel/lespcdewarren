import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 465);
const secure = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
const user = process.env.SMTP_USER || process.env.GMAIL_USER || "";
const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
const from = process.env.EMAIL_FROM || (user ? `Les PC de Warren <${user}>` : undefined);

if (!user || !pass) {
  console.warn("[mail] SMTP_USER / SMTP_PASS manquants: configurez Gmail (mot de passe d'application)");
}

export const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

export async function sendMail(opts: { to: string; subject: string; html: string; attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>; bcc?: string; }) {
  if (!from) throw new Error("EMAIL_FROM non configuré");
  const info = await transport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, attachments: opts.attachments, ...(opts.bcc ? { bcc: opts.bcc } : {}) });
  return info.messageId as string;
}
