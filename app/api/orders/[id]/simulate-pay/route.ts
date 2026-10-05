import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";
import { fulfillOrder } from "@/lib/booking";

// TESTING ONLY: pretends the QRIS was paid.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Safe by default: only works when NEXT_PUBLIC_PAYMENT_MODE is exactly "simulate"
  if (process.env.NEXT_PUBLIC_PAYMENT_MODE !== "simulate")
    return NextResponse.json({ error: "Disabled" }, { status: 403 });
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const { data: order } = await supabaseAdmin().from("orders").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await fulfillOrder(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
