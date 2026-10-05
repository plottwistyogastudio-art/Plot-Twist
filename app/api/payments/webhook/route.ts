import { NextResponse } from "next/server";

// Payment gateway (Midtrans / Xendit / ...) calls this when a QRIS is paid.
// When you connect a gateway:
//  1. verify the gateway's signature header,
//  2. find the order by orders.payment_ref,
//  3. call fulfillOrder(order.id) from "@/lib/booking".
export async function POST() {
  return NextResponse.json({ error: "Not connected yet" }, { status: 501 });
}
