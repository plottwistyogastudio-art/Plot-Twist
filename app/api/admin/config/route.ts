import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { getConfig, saveConfig, validateConfig } from "@/lib/config";
import { findClass } from "@/lib/booking-shared";
import { formatFullDay, parseISO } from "@/lib/dates";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  return NextResponse.json({ config: await getConfig() });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return forbidden();
  const body = await req.json().catch(() => null);
  const v = validateConfig(body?.config);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  // Never remove a class that members have already booked: list them so they can be cancelled first
  const old = await getConfig();
  const todayJakarta = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const { data: rows } = await supabaseAdmin()
    .from("bookings").select("class_key")
    .in("status", ["booked", "waitlist"]).gte("class_key", `${todayJakarta}_00:00`);
  const counts = new Map<string, number>();
  for (const r of rows ?? []) counts.set(r.class_key, (counts.get(r.class_key) ?? 0) + 1);
  const conflicts = [...counts.entries()]
    .filter(([key]) => findClass(key, old) && !findClass(key, v.config))
    .map(([key, count]) => {
      const [iso, time] = key.split("_");
      return { key, count, label: `${formatFullDay(parseISO(iso))}, ${time}` };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
  if (conflicts.length) {
    return NextResponse.json({
      error: "Some classes you removed already have bookings. Cancel those bookings first (credits are returned), then save again.",
      conflicts,
    }, { status: 409 });
  }

  const { error } = await saveConfig(v.config, admin.email ?? null);
  if (error) {
    const missing = /site_config|relation|schema cache/i.test(error.message);
    return NextResponse.json({
      error: missing ? "The site_config table does not exist yet. Run the new SQL from supabase/schema.sql in Supabase." : "Could not save. Try again.",
    }, { status: 500 });
  }
  return NextResponse.json({ ok: true, config: v.config });
}
