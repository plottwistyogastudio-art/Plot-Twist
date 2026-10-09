import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { applyReferralCode } from "@/lib/referral";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { code } = await req.json().catch(() => ({}));
  const r = await applyReferralCode(user.id, String(code ?? ""));
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
