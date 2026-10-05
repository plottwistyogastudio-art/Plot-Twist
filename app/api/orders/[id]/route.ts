import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const { data } = await supabaseAdmin().from("orders").select("id, status, amount, package_id, class_key").eq("id", id).eq("user_id", user.id).single();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Did the class booking after payment end up booked or waitlisted?
  let booking = null;
  if (data.status === "paid" && data.class_key) {
    const r = await supabaseAdmin().from("bookings").select("id, status").eq("user_id", user.id).eq("class_key", data.class_key).in("status", ["booked", "waitlist"]).maybeSingle();
    booking = r.data;
  }
  return NextResponse.json({ ...data, booking });
}
