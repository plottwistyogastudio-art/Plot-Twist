import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { fulfillOrder } from "@/lib/booking";

// Mark an order as paid by hand (cash / bank transfer / QRIS checked on your phone).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return forbidden();
  const { id } = await params;
  const r = await fulfillOrder(id);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
