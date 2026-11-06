import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { bookClass, bookGuest } from "@/lib/booking";
import { guestMessagesOn } from "@/lib/notify";

// Add someone to a class (walk-ins, phone / WhatsApp bookings).
//   { classKey, memberId }                         a member with an account: uses the member's own credit
//   { classKey, guest: { name, whatsapp, mat?, notify? } }   a WhatsApp guest: no account, no credit
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const body = await req.json().catch(() => ({}));
  const classKey = String(body?.classKey ?? "");

  if (body?.guest) {
    const g = body.guest;
    const mat = g.mat === "studio" || g.mat === "own" ? g.mat : null;
    const r = await bookGuest(String(g.name ?? ""), String(g.whatsapp ?? ""), classKey, { mat, notify: g.notify !== false });
    if (!r.ok) return NextResponse.json({ ok: false, message: r.message }, { status: 400 });
    return NextResponse.json({ ok: true, status: "booked", whatsappSent: g.notify !== false && guestMessagesOn() });
  }

  const r = await bookClass(String(body?.memberId ?? ""), classKey);
  if (r.status === "needs_payment") return NextResponse.json({ ok: false, message: "This member has no credit. Add one on their member page first." }, { status: 400 });
  if (r.status === "error") return NextResponse.json({ ok: false, message: r.message }, { status: 400 });
  return NextResponse.json({ ok: true, status: r.status });
}
