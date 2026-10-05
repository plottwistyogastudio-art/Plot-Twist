import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";
import { findClass, findPackage, hasUsedFirstPlot } from "@/lib/booking";
import { firstPlotOpen } from "@/data/packages";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { packageId, classKey } = await req.json();

  const pkg = findPackage(String(packageId));
  if (!pkg) return NextResponse.json({ error: "Unknown package." }, { status: 400 });
  if (classKey && !findClass(String(classKey))) return NextResponse.json({ error: "Unknown class." }, { status: 400 });
  if (pkg.oncePerPerson && !firstPlotOpen())
    return NextResponse.json({ error: "First Plot has ended." }, { status: 409 });
  if (pkg.oncePerPerson && (await hasUsedFirstPlot(user.id)))
    return NextResponse.json({ error: "First Plot can only be bought once per person." }, { status: 409 });

  const { data, error } = await supabaseAdmin().from("orders")
    .insert({ user_id: user.id, package_id: pkg.id, class_key: classKey ?? null, amount: pkg.price })
    .select("id, amount, status").single();
  if (error) return NextResponse.json({ error: "Could not create the order." }, { status: 500 });

  // TODO (live payments): ask the payment gateway for a dynamic QRIS for this order,
  // save its id in orders.payment_ref and return the QR string here.
  return NextResponse.json({ order: data, qris: null });
}
