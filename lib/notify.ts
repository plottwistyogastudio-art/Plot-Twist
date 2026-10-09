import { after } from "next/server";
import { CLASS_CAPACITY } from "@/data/schedule";
import { formatFullDay, parseISO } from "@/lib/dates";
import { formatIDR } from "@/data/packages";
import { CANCEL_HOURS, findClass } from "@/lib/booking-shared";
import { getConfig } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";
import { emailEnabled, memberEmailEnabled, sendEmail } from "@/lib/email";

// Booking / purchase messages by email (lib/email.ts) and, when FONNTE_TOKEN is set, WhatsApp through Fonnte (https://fonnte.com).
// FONNTE_TOKEN   : device token from the Fonnte dashboard (server only).
// WA_NOTIFY_TO   : studio number(s) or group id(s), comma separated. Gets one message per booking / purchase.
// WA_MEMBER_MESSAGES : set to "off" to stop messages to members.
// Sending never blocks or breaks a booking or payment: errors are only logged.

export const waEnabled = () => !!process.env.FONNTE_TOKEN;
export const notifyEnabled = () => waEnabled() || emailEnabled();

// "+62 812-3456-7890" / "0812…" / "812…" -> "628123456789"; group ids (…@g.us) are kept as they are
export function normalisePhone(raw: string) {
  const s = raw.trim();
  if (s.endsWith("@g.us")) return s;
  let d = s.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d.length >= 9 ? d : "";
}

async function send(target: string, message: string) {
  const to = normalisePhone(target);
  if (!to) return;
  try {
    const body = new FormData();
    body.append("target", to);
    body.append("message", message);
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: process.env.FONNTE_TOKEN! },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || j?.status === false) console.error("WhatsApp send failed", res.status, j?.reason ?? j);
  } catch (e) {
    console.error("WhatsApp send error", e);
  }
}

// Runs after the response is sent when possible, so the member never waits for WhatsApp
function later(fn: () => Promise<void>) {
  const safe = () => fn().catch((e) => console.error("WhatsApp task error", e));
  try { after(safe); } catch { void safe(); }
}

function toStudio(text: string) {
  const subject = text.split("\n")[0];
  const emails = (process.env.NOTIFY_EMAIL_TO ?? "").split(",");
  const list = (process.env.WA_NOTIFY_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  later(async () => {
    if (emailEnabled()) await sendEmail(emails, `[Plot Twist] ${subject}`, text);
    if (waEnabled()) for (const t of list) await send(t, text);
  });
}

async function member(userId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("full_name, whatsapp, email").eq("id", userId).maybeSingle();
  let email = (data?.email as string | undefined) || "";
  if (!email && memberEmailEnabled()) email = (await db.auth.admin.getUserById(userId)).data.user?.email ?? "";
  return { name: (data?.full_name as string | undefined) || "Member", whatsapp: (data?.whatsapp as string | undefined) || "", email };
}

function toMember(userId: string, subject: string, text: (name: string) => string) {
  const wa = waEnabled() && process.env.WA_MEMBER_MESSAGES !== "off";
  if (!wa && !memberEmailEnabled()) return;
  later(async () => {
    const m = await member(userId);
    const body = text(m.name.split(" ")[0]);
    if (memberEmailEnabled() && m.email) await sendEmail(m.email, subject, body, { toMember: true });
    if (wa && m.whatsapp) await send(m.whatsapp, body);
  });
}

async function classLine(key: string) {
  const c = findClass(key, await getConfig());
  const [iso, time] = key.split("_");
  const day = formatFullDay(parseISO(iso));
  return { name: c?.session.name ?? "Class", when: `${day}, ${time}`, teacher: c ? c.session.teacher : "" };
}

async function spotsInfo(key: string) {
  const { count } = await supabaseAdmin().from("bookings").select("id", { count: "exact", head: true }).eq("class_key", key).eq("status", "booked");
  return `${count ?? 0}/${CLASS_CAPACITY}`;
}

const SIGN = "\n\nPlot Twist Studio";

export function notifyBooked(userId: string, key: string, kind: "booked" | "waitlist" | "promoted") {
  if (!notifyEnabled()) return;
  later(async () => {
    const c = await classLine(key);
    const m = await member(userId);
    const spots = await spotsInfo(key);
    const label = kind === "booked" ? "Booking baru" : kind === "waitlist" ? "Waitlist baru" : "Naik dari waitlist";
    toStudio(`${label}: ${m.name}\n${c.name}, ${c.when}\nMat terisi: ${spots}`);
    toMember(userId, kind === "waitlist" ? "You are on the waitlist" : kind === "promoted" ? "A spot opened, you are booked" : "Your booking is confirmed", (n) =>
      kind === "waitlist"
        ? `Hi ${n}, you're on the waitlist for ${c.name} on ${c.when}. If a spot opens we book you automatically and message you here.${SIGN}`
        : `${kind === "promoted" ? `Good news ${n}, a spot opened! You're now booked` : `Hi ${n}, you're booked`} for ${c.name} on ${c.when}.\nPlease arrive 10 minutes early. You can cancel up to ${CANCEL_HOURS} hours before class to keep your credit.${SIGN}`,
    );
  });
}

export function notifyCancelled(userId: string, key: string, wasBooked: boolean, refunded: boolean) {
  if (!notifyEnabled()) return;
  later(async () => {
    const c = await classLine(key);
    const m = await member(userId);
    const spots = await spotsInfo(key);
    toStudio(`${wasBooked ? "Booking dibatalkan" : "Keluar dari waitlist"}: ${m.name}\n${c.name}, ${c.when}${wasBooked ? `\nKredit ${refunded ? "dikembalikan" : "tidak dikembalikan (kurang dari 12 jam)"}\nMat terisi: ${spots}` : ""}`);
    toMember(userId, "Your booking is cancelled", (n) =>
      `Hi ${n}, your ${wasBooked ? "booking" : "waitlist spot"} for ${c.name} on ${c.when} is cancelled.${wasBooked ? (refunded ? " Your class credit was returned." : ` Your credit was not returned because it was less than ${CANCEL_HOURS} hours before class.`) : ""}${SIGN}`,
    );
  });
}

export function notifyPurchase(userId: string, pkgName: string, classes: number, amount: number) {
  if (!notifyEnabled()) return;
  later(async () => {
    const m = await member(userId);
    toStudio(`Pembelian lunas: ${m.name}\n${pkgName} (${classes} kelas), ${formatIDR(amount)}${m.whatsapp ? `\nWA: ${m.whatsapp}` : ""}`);
    toMember(userId, "Payment confirmed", (n) => `Hi ${n}, thank you! Your payment of ${formatIDR(amount)} for ${pkgName} is confirmed. ${classes} ${classes === 1 ? "class is" : "classes are"} now in your account.\nBook your class: ${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/schedule${SIGN}`);
  });
}

// For the 24-hour reminder
export async function sendReminder(userId: string, key: string) {
  const wa = waEnabled() && process.env.WA_MEMBER_MESSAGES !== "off";
  if (!wa && !memberEmailEnabled()) return false;
  const c = await classLine(key);
  const m = await member(userId);
  const text = `Hi ${m.name.split(" ")[0]}, a reminder that you are booked for ${c.name} on ${c.when}${c.teacher ? ` with ${c.teacher}` : ""}, about 24 hours from now.\nPlease arrive 10 minutes early. If you cannot make it, cancel up to ${CANCEL_HOURS} hours before class to keep your credit.${SIGN}`;
  let sent = false;
  if (memberEmailEnabled() && m.email) { await sendEmail(m.email, `Reminder: ${c.name}, ${c.when}`, text, { toMember: true }); sent = true; }
  if (wa && m.whatsapp) { await send(m.whatsapp, text); sent = true; }
  return sent;
}
