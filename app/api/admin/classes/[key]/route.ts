import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { findClass, findPackage } from "@/lib/booking";
import { CLASS_CAPACITY } from "@/data/schedule";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await requireAdmin(req))) return forbidden();
  const key = decodeURIComponent((await params).key);
  const cls = findClass(key);
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = supabaseAdmin();
  const { data: bookings } = await db.from("bookings").select("*").eq("class_key", key).in("status", ["booked", "waitlist"]).order("created_at");
  const ids = [...new Set((bookings ?? []).map((b) => b.user_id))];
  const [{ data: profiles }, { data: packs }] = await Promise.all([
    ids.length ? db.from("profiles").select("id,full_name,whatsapp,email").in("id", ids) : { data: [] },
    ids.length ? db.from("credit_packs").select("id,user_id,package_id,remaining").in("id", (bookings ?? []).map((b) => b.pack_id).filter(Boolean)) : { data: [] },
  ]);
  // credit left per member, for the waitlist
  const { data: allPacks } = ids.length ? await db.from("credit_packs").select("user_id,package_id,remaining").in("user_id", ids).gt("remaining", 0) : { data: [] };
  const people = (bookings ?? []).map((b) => {
    const p = profiles?.find((x) => x.id === b.user_id);
    const pack = packs?.find((x) => x.id === b.pack_id) ?? allPacks?.find((x) => x.user_id === b.user_id);
    return {
      id: b.id, userId: b.user_id, status: b.status, mat: b.mat ?? null, checkedIn: !!b.checked_in_at,
      name: p?.full_name || p?.email || "Member", whatsapp: p?.whatsapp ?? "", email: p?.email ?? "",
      pack: pack ? `${findPackage(pack.package_id)?.name ?? pack.package_id} · ${pack.remaining} left` : "No credit",
    };
  });
  return NextResponse.json({ key, ...cls.session, iso: cls.iso, capacity: CLASS_CAPACITY, booked: people.filter((p) => p.status === "booked"), waitlist: people.filter((p) => p.status === "waitlist") });
}
