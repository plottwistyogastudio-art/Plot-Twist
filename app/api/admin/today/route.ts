import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { getClasses, CLASS_CAPACITY, OPENING_DATE } from "@/data/schedule";
import { parseISO, startOfWeek, toISO, addDays } from "@/lib/dates";
import { classKey } from "@/lib/booking";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  const db = supabaseAdmin();

  const list = date < OPENING_DATE ? [] : getClasses(parseISO(date));
  const keys = list.map((c) => classKey(date, c.time));
  const { data: rows } = keys.length
    ? await db.from("bookings").select("class_key,status").in("class_key", keys).in("status", ["booked", "waitlist"])
    : { data: [] as { class_key: string; status: string }[] };
  const classes = list.map((c) => {
    const key = classKey(date, c.time);
    const mine = (rows ?? []).filter((r) => r.class_key === key);
    return { key, ...c, booked: mine.filter((r) => r.status === "booked").length, waitlist: mine.filter((r) => r.status === "waitlist").length, capacity: CLASS_CAPACITY };
  });

  // Sales this week (Mon-Sun, Jakarta dates)
  const weekStart = toISO(startOfWeek(parseISO(date)));
  const weekEnd = toISO(addDays(parseISO(weekStart), 7));
  const { data: paid } = await db.from("orders").select("amount")
    .eq("status", "paid").gte("paid_at", `${weekStart}T00:00:00+07:00`).lt("paid_at", `${weekEnd}T00:00:00+07:00`);

  const now = Date.now();
  const { count: pending } = await db.from("orders").select("id", { count: "exact", head: true })
    .eq("status", "pending").lt("created_at", new Date(now - 30 * 60_000).toISOString());
  const { data: expiring } = await db.from("credit_packs").select("user_id")
    .gt("remaining", 0).gt("expires_at", new Date(now).toISOString()).lt("expires_at", new Date(now + 7 * 86400_000).toISOString());

  return NextResponse.json({
    date, classes,
    stats: {
      classes: classes.length,
      booked: classes.reduce((n, c) => n + c.booked, 0),
      mats: classes.length * CLASS_CAPACITY,
      waitlist: classes.reduce((n, c) => n + c.waitlist, 0),
      salesWeek: (paid ?? []).reduce((n, o) => n + o.amount, 0),
      ordersWeek: paid?.length ?? 0,
    },
    attention: { pendingOrders: pending ?? 0, expiringMembers: new Set((expiring ?? []).map((e) => e.user_id)).size },
  });
}
