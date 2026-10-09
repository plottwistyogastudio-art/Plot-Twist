// Email through Resend (https://resend.com), plain fetch, no extra package.
// RESEND_KEY (or RESEND_API_KEY) : API key from the Resend dashboard (server only). Needed for studio emails.
// EMAIL_FROM     : "Plot Twist Studio <hello@yourdomain.com>", an address on a domain verified in Resend.
//                  Needed to email members. Without it only the studio is emailed (from Resend's test sender).
// EMAIL_REPLY_TO: where replies go when a member answers an email (e.g. your Gmail), optional.
// NOTIFY_EMAIL_TO: studio address(es) that get every booking / purchase email, comma separated.
// Sending never blocks or breaks a booking or payment: errors are only logged.

// The key may be saved as RESEND_KEY or RESEND_API_KEY
const apiKey = () => process.env.RESEND_KEY || process.env.RESEND_API_KEY || "";
export const emailEnabled = () => !!apiKey();
export const memberEmailEnabled = () => emailEnabled() && !!process.env.EMAIL_FROM && process.env.EMAIL_MEMBERS !== "off";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(text: string) {
  const body = esc(text).replace(/\n\n/g, "</p><p style=\"margin:0 0 14px\">").replace(/\n/g, "<br>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#8a5a44">$1</a>');
  return `<div style="background:#f6f0e6;padding:24px 12px"><div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e4d8c3;border-radius:14px;padding:24px;font-family:Georgia,serif;color:#3a2f27;line-height:1.55;font-size:16px"><p style="margin:0 0 14px">${body}</p></div></div>`;
}

export async function sendEmail(to: string | string[], subject: string, text: string, opts: { toMember?: boolean } = {}) {
  const list = (Array.isArray(to) ? to : [to]).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return { ok: false, detail: "No recipient (is NOTIFY_EMAIL_TO set?)" };
  if (!apiKey()) return { ok: false, detail: "No API key (RESEND_KEY / RESEND_API_KEY)" };
  const from = process.env.EMAIL_FROM || "Plot Twist Studio <onboarding@resend.dev>";
  if (opts.toMember && !process.env.EMAIL_FROM) return { ok: false, detail: "EMAIL_FROM is not set, so members are not emailed" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: list, subject, text, html: html(text), ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const detail = await res.text().catch(() => "");
    if (!res.ok) console.error("Email send failed", res.status, detail);
    return { ok: res.ok, detail: `HTTP ${res.status} ${detail}`.slice(0, 400) };
  } catch (e) {
    console.error("Email send error", e);
    return { ok: false, detail: String(e) };
  }
}
