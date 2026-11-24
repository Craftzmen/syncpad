import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);

type Nodemailer = typeof import("nodemailer");

function loadNodemailer(): Nodemailer {
  // A static import is rewritten to a hashed package name that Bun cannot resolve.
  const packageName = "node" + "mailer";
  const loaded = nodeRequire(packageName) as Nodemailer & { default?: Nodemailer };
  return typeof loaded.createTransport === "function" ? loaded : loaded.default!;
}

export type EmailConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

export function getEmailConfigFromEnv():
  | { ok: true; config: EmailConfig }
  | { ok: false; reason: string } {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_APP_PASSWORD?.replace(/\s+/g, "");
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!host || !user || !password || !from) {
    return { ok: false, reason: "SMTP not configured" };
  }

  return { ok: true, config: { host, port, user, password, from } };
}

let transport: ReturnType<Nodemailer["createTransport"]> | null = null;
let transportKey = "";

function getTransport(config: EmailConfig) {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (!transport || transportKey !== key) {
    transport = loadNodemailer().createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
    });
    transportKey = key;
  }
  return transport;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ sent: true } | { sent: false; reason: string }> {
  const cfg = getEmailConfigFromEnv();
  if (!cfg.ok) return { sent: false, reason: cfg.reason };

  try {
    await getTransport(cfg.config).sendMail({
      from: cfg.config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email failed";
    console.error("sendEmail failed", reason);
    return { sent: false, reason };
  }
}

export function appOrigin() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function emailDocument(options: {
  heading: string;
  paragraphs: string[];
  actionLabel?: string;
  actionUrl?: string;
}) {
  const action =
    options.actionLabel && options.actionUrl
      ? `<p style="margin:24px 0 0"><a href="${escapeHtml(options.actionUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:8px;padding:10px 16px;font-size:14px">${escapeHtml(options.actionLabel)}</a></p>`
      : "";
  const html = `<div style="font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#111;line-height:1.5;max-width:480px">
    <p style="margin:0 0 8px;font-size:13px;color:#8e8e8e">SyncPad</p>
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600">${escapeHtml(options.heading)}</h1>
    ${options.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:14px;color:#3d3d3d">${escapeHtml(p)}</p>`).join("")}
    ${action}
  </div>`;
  const text = [
    options.heading,
    "",
    ...options.paragraphs,
    options.actionUrl ? `\n${options.actionLabel ?? "Open"}: ${options.actionUrl}` : "",
  ].join("\n");
  return { html, text };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
