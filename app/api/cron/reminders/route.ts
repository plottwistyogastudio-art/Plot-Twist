import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { classStart } from "@/lib/booking-shared";
import { notifyEnabled, sendReminder } from "@/lib/notify";

// Sends each member a reminder (email, and WhatsApp when connected) 24 hours before their class.
// Call it every 10-15 minutes from an external scheduler (cron-job.org, free), with the header
//   Authorization: Bearer <CRON_SECRET>      (or, if the scheduler cannot set headers: ?secret=<CRON_SECRET>)
const REMIND_HOURS = 24;

// "YYYY-MM-DD_HH:MM" in Jakarta time (UTC+7), the same format as booking class keys
const jakartaKey = (ms: number) => {
  const iso = new Date(ms + 7 * 3600_000).toISOString();
  return `${iso.slice(0, 10)}_${iso.slice(11, 16)}`;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace("Bearer ", "") ?? new URL(req.url).searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  if (!notifyEnabled()) return NextResponse.json({ ok: true, sent: 0, note: "No email or WhatsApp is configured" });

  const now = Date.now();
  const db = supabaseAdmin();
  // Classes that start within the next 24 hours and have not been reminded yet
  const { data: rows } = await db.from("bookings")
    .select("id, user_id, class_key, created_at")
    .eq("status", "booked").is("reminded_at", null)
    .gt("class_key", jakartaKey(now)).lte("class_key", jakartaKey(now + REMIND_HOURS * 3600_000));

  let sent = 0;
  for (const r of rows ?? []) {
    // Booked less than 24 hours before class: they just got a confirmation, no reminder needed
    if (new Date(r.created_at).getTime() > classStart(r.class_key).getTime() - REMIND_HOURS * 3600_000) continue;
    // Claim first so a retry never sends it twice
    const { data: claimed } = await db.from("bookings").update({ reminded_at: new Date().toISOString() })
      .eq("id", r.id).is("reminded_at", null).select("id").single();
    if (!claimed) continue;
    if (await sendReminder(r.user_id, r.class_key)) sent++;
  }
  return NextResponse.json({ ok: true, sent });
}
