import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";
import { cancelBooking, studioMatsTaken } from "@/lib/booking";
import { STUDIO_MAT_LIMIT } from "@/data/schedule";

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
  const db = supabaseAdmin();
  const { data: b } = await db.from("bookings").select("id,class_key,mat").eq("id", id).eq("user_id", user.id).in("status", ["booked", "waitlist"]).single();
  if (!b) return NextResponse.json({ ok: false }, { status: 404 });
  const full = "Studio mats are all taken for this class. Please bring your own mat.";
  if (mat === "studio" && b.mat !== "studio" && (await studioMatsTaken(b.class_key, id)) >= STUDIO_MAT_LIMIT)
    return NextResponse.json({ ok: false, message: full }, { status: 409 });
  await db.from("bookings").update({ mat }).eq("id", id);
  // Two people may take the last studio mat at the same moment: whoever is beyond the limit (by booking order) is released.
  if (mat === "studio") {
    const { data: list } = await db.from("bookings").select("id").eq("class_key", b.class_key).eq("mat", "studio").in("status", ["booked", "waitlist"]).order("created_at").order("id");
    if ((list ?? []).findIndex((r) => r.id === id) >= STUDIO_MAT_LIMIT) {
      await db.from("bookings").update({ mat: b.mat ?? null }).eq("id", id);
      return NextResponse.json({ ok: false, message: full }, { status: 409 });
    }
  }
  return NextResponse.json({ ok: true });
}
