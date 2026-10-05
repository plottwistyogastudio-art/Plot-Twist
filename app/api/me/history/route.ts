import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";

// Everything the member has bought and booked, newest first.
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const db = supabaseAdmin();
  const [{ data: packs }, { data: bookings }, { data: orders }] = await Promise.all([
    db.from("credit_packs").select("id,package_id,total,remaining,expires_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    db.from("bookings").select("id,class_key,status,checked_in_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(150),
    db.from("orders").select("id,package_id,amount,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  return NextResponse.json({ packs, bookings, orders });
}
