import { NextResponse } from "next/server";
import { testNotifications } from "@/lib/notify";

// Open /api/cron/notify-test?secret=<CRON_SECRET> in the browser: sends one test email and one test WhatsApp
// and shows which settings are missing. Protected by the same CRON_SECRET as the reminders.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace("Bearer ", "") ?? new URL(req.url).searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await testNotifications());
}
