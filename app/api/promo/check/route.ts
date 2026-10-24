import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { findPackage } from "@/lib/booking";
import { evaluatePromo } from "@/lib/promo";

// Preview a promo code for a package (the real price is calculated again when the order is created)
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { code, packageId } = await req.json().catch(() => ({}));
  const pkg = findPackage(String(packageId ?? ""));
  if (!pkg) return NextResponse.json({ ok: false, message: "Choose a package first." });
  const r = await evaluatePromo(user.id, String(code ?? ""), pkg);
  return NextResponse.json(r.ok ? { ...r, applied: r.code !== null } : r);
}
