import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { bookClass } from "@/lib/booking";

// Add a member to a class (walk-ins, phone bookings). Uses the member's own credit.
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const { classKey, memberId } = await req.json();
  const r = await bookClass(String(memberId), String(classKey));
  if (r.status === "needs_payment") return NextResponse.json({ ok: false, message: "This member has no credit. Add one on their member page first." }, { status: 400 });
  if (r.status === "error") return NextResponse.json({ ok: false, message: r.message }, { status: 400 });
  return NextResponse.json({ ok: true, status: r.status });
}
