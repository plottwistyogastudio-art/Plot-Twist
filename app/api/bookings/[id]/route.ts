import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";
import { cancelBooking } from "@/lib/booking";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const result = await cancelBooking(user.id, id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

// Member chooses a studio mat or brings their own: PATCH { mat: "studio" | "own" }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const { mat } = await req.json();
  if (mat !== "studio" && mat !== "own") return NextResponse.json({ ok: false, message: "Choose studio or own." }, { status: 400 });
  const { data } = await supabaseAdmin().from("bookings").update({ mat }).eq("id", id).eq("user_id", user.id).in("status", ["booked", "waitlist"]).select("id").single();
  return NextResponse.json({ ok: !!data }, { status: data ? 200 : 404 });
}
