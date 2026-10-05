import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

const MANUAL_PACK_DAYS = 30; // TODO: how long a manually added credit stays valid

// Add (delta > 0) or remove (delta < 0) credits, always with a written reason.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return forbidden();
  const { id } = await params;
  const { delta, reason } = await req.json();
  const n = Math.trunc(Number(delta));
  const why = String(reason ?? "").trim();
  if (!n || Math.abs(n) > 50) return NextResponse.json({ ok: false, message: "Enter a number of credits." }, { status: 400 });
  if (!why) return NextResponse.json({ ok: false, message: "A reason is required." }, { status: 400 });
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const { data: packs } = await db.from("credit_packs").select("*").eq("user_id", id).gt("remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${now}`).order("expires_at", { ascending: true, nullsFirst: false });

  if (n > 0) {
    const pack = packs?.[0];
    if (pack) {
      await db.from("credit_packs").update({ remaining: pack.remaining + n, total: pack.total + n }).eq("id", pack.id);
    } else {
      await db.from("credit_packs").insert({
        user_id: id, package_id: "manual", total: n, remaining: n,
        expires_at: new Date(Date.now() + MANUAL_PACK_DAYS * 86400_000).toISOString(), is_first_plot: false,
      });
    }
  } else {
    let left = -n;
    for (const p of packs ?? []) {
      if (left === 0) break;
      const take = Math.min(left, p.remaining);
      await db.from("credit_packs").update({ remaining: p.remaining - take }).eq("id", p.id);
      left -= take;
    }
    if (left === -n) return NextResponse.json({ ok: false, message: "This member has no credits to remove." }, { status: 400 });
  }
  await db.from("credit_adjustments").insert({ user_id: id, delta: n, reason: why, admin_email: admin.email });
  return NextResponse.json({ ok: true });
}
