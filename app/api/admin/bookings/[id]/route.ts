import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { cancelBooking, promoteBooking } from "@/lib/booking";

// PATCH { action: "checkin" | "uncheckin" | "promote" }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return forbidden();
  const { id } = await params;
  const { action } = await req.json();
  if (action === "promote") {
    const r = await promoteBooking(id);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  if (action === "checkin" || action === "uncheckin") {
    await supabaseAdmin().from("bookings").update({ checked_in_at: action === "checkin" ? new Date().toISOString() : null }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
}

// Cancel on behalf of a member: the credit always goes back.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return forbidden();
  const { id } = await params;
  const { data: b } = await supabaseAdmin().from("bookings").select("user_id").eq("id", id).single();
  if (!b) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  const r = await cancelBooking(b.user_id, id, { refundAlways: true });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
