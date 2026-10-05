import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";

// Everything we hold about the signed-in member, as a JSON download.
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const db = supabaseAdmin();
  const [profile, packs, bookings, orders, adjustments] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    db.from("credit_packs").select("*").eq("user_id", user.id),
    db.from("bookings").select("*").eq("user_id", user.id),
    db.from("orders").select("*").eq("user_id", user.id),
    db.from("credit_adjustments").select("*").eq("user_id", user.id),
  ]);
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    account: { email: user.email, createdAt: user.created_at },
    profile: profile.data, creditPacks: packs.data, bookings: bookings.data, orders: orders.data, creditAdjustments: adjustments.data,
  });
}
