import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";
import { findClass, findPackage, hasUsedFirstPlot } from "@/lib/booking";
import { firstPlotOpen } from "@/data/packages";
import { priceFor } from "@/lib/referral";
import { createCheckout, dokuEnabled, invoiceFor } from "@/lib/doku";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { packageId, classKey } = await req.json();

  const pkg = findPackage(String(packageId));
  if (!pkg) return NextResponse.json({ error: "Unknown package." }, { status: 400 });
  if (classKey && !(await findClass(String(classKey)))) return NextResponse.json({ error: "Unknown class." }, { status: 400 });
  if (pkg.oncePerPerson && !firstPlotOpen())
    return NextResponse.json({ error: "First Plot has ended." }, { status: 409 });
  if (pkg.oncePerPerson && (await hasUsedFirstPlot(user.id)))
    return NextResponse.json({ error: "First Plot can only be bought once per person." }, { status: 409 });

  const { amount, discount } = await priceFor(user.id, pkg);
  const { data, error } = await supabaseAdmin().from("orders")
    .insert({ user_id: user.id, package_id: pkg.id, class_key: classKey ?? null, amount, discount })
    .select("id, amount, status").single();
  if (error) return NextResponse.json({ error: "Could not create the order." }, { status: 500 });

  // Live payment: ask DOKU for a QRIS payment page for this order
  if (dokuEnabled() && process.env.NEXT_PUBLIC_PAYMENT_MODE !== "simulate") {
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const r = await createCheckout({
      orderId: data.id, amount: data.amount, email: user.email ?? undefined,
      callbackUrl: site ? `${site}/account` : undefined,
    });
    if (!r.ok) {
      await supabaseAdmin().from("orders").update({ status: "expired" }).eq("id", data.id).eq("status", "pending");
      return NextResponse.json({ error: r.message }, { status: 502 });
    }
    await supabaseAdmin().from("orders").update({ payment_ref: invoiceFor(data.id) }).eq("id", data.id);
    return NextResponse.json({ order: data, payUrl: r.url });
  }

  return NextResponse.json({ order: data, payUrl: null });
}
