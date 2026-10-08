import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fulfillOrder } from "@/lib/booking";
import { dokuEnabled, verifyNotification } from "@/lib/doku";

// DOKU calls this when a QRIS is paid. Set this URL in the DOKU dashboard (Notification URL):
//   https://<your-domain>/api/payments/webhook
export async function POST(req: Request) {
  if (!dokuEnabled()) return NextResponse.json({ error: "Not connected" }, { status: 501 });
  const raw = await req.text();
  if (!verifyNotification(req.headers, raw)) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad body" }, { status: 400 }); }

  // Checkout: only act on SUCCESS, ignore everything else (but still answer 200)
  if (body?.transaction?.status !== "SUCCESS") return NextResponse.json({ ok: true });

  const invoice = String(body?.order?.invoice_number ?? "");
  const { data: order } = await supabaseAdmin().from("orders").select("id, amount, status").eq("payment_ref", invoice).maybeSingle();
  if (!order) return NextResponse.json({ ok: true }); // unknown invoice: nothing to do
  if (Number(body?.order?.amount) !== Number(order.amount)) {
    console.error("DOKU amount mismatch", invoice, body?.order?.amount, order.amount);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }
  const result = await fulfillOrder(order.id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 500 }); // DOKU will retry
  return NextResponse.json({ ok: true });
}
