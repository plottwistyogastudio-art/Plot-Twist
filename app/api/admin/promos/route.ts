import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { packages, firstPlot } from "@/data/packages";
import { PROMO_RE, normalisePromo } from "@/lib/promo";

const ALL = [...packages, ...firstPlot];
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const db = supabaseAdmin();
  const [{ data: promos, error }, { data: used }] = await Promise.all([
    db.from("promo_codes").select("*").order("created_at", { ascending: false }),
    db.from("orders").select("promo_code,status,discount").not("promo_code", "is", null).in("status", ["pending", "paid"]),
  ]);
  if (error) return NextResponse.json({ error: "Could not load. Did you run the promo SQL in Supabase?" }, { status: 500 });
  const stats = new Map<string, { paid: number; pending: number; given: number }>();
  for (const o of used ?? []) {
    const s = stats.get(o.promo_code) ?? { paid: 0, pending: 0, given: 0 };
    if (o.status === "paid") { s.paid++; s.given += o.discount ?? 0; } else s.pending++;
    stats.set(o.promo_code, s);
  }
  return NextResponse.json({
    promos: (promos ?? []).map((p) => ({ ...p, ...(stats.get(p.code) ?? { paid: 0, pending: 0, given: 0 }) })),
    packages: ALL.map((p) => ({ id: p.id, name: p.name, price: p.price })),
  });
}

function parse(b: Record<string, unknown>) {
  const kind = b.kind === "amount" ? "amount" : "percent";
  const value = Math.round(Number(b.value));
  if (!Number.isFinite(value) || value <= 0) return { error: "Enter the discount." };
  if (kind === "percent" && value > 100) return { error: "A percentage can be 1 to 100." };
  if (kind === "amount" && value > 10_000_000) return { error: "That amount is too large." };
  const ids = (Array.isArray(b.packageIds) ? b.packageIds : []).map(String).filter((id) => ALL.some((p) => p.id === id));
  if (!ids.length) return { error: "Tick at least one package." };
  let expires_at: string | null = null;
  if (b.expires) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.expires))) return { error: "Bad expiry date." };
    expires_at = `${b.expires}T23:59:59+07:00`; // valid through the end of that day, Jakarta time
    if (Number.isNaN(Date.parse(expires_at))) return { error: "Bad expiry date." };
  }
  let max_uses: number | null = null;
  if (b.maxUses !== "" && b.maxUses !== null && b.maxUses !== undefined) {
    max_uses = Math.round(Number(b.maxUses));
    if (!Number.isFinite(max_uses) || max_uses < 1 || max_uses > 100000) return { error: "Maximum uses must be a whole number from 1." };
  }
  return {
    row: {
      kind, value, package_ids: ids, expires_at, max_uses,
      one_per_person: b.onePerPerson !== false, new_members_only: b.newMembersOnly === true,
      note: String(b.note ?? "").trim().slice(0, 200) || null,
    },
  };
}

// { action: "create" | "update", code, kind, value, packageIds, expires, maxUses, onePerPerson, newMembersOnly, note }
// { action: "active", code, active }   { action: "delete", code }
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const b = await req.json().catch(() => null);
  if (!b) return bad("Bad request.");
  const db = supabaseAdmin();
  const code = normalisePromo(b.code);

  if (b.action === "create" || b.action === "update") {
    if (!PROMO_RE.test(code)) return bad("Code: 3 to 30 letters, numbers, - or _.");
    const p = parse(b);
    if ("error" in p) return bad(p.error as string);
    if (b.action === "create") {
      const { error } = await db.from("promo_codes").insert({ code, ...p.row });
      if (error) return bad(error.code === "23505" ? "That code already exists." : "Could not save. Did you run the promo SQL in Supabase?");
    } else {
      const { error } = await db.from("promo_codes").update(p.row).eq("code", code);
      if (error) return bad("Could not save.");
    }
    return NextResponse.json({ ok: true });
  }
  if (b.action === "active") {
    await db.from("promo_codes").update({ active: b.active === true }).eq("code", code);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "delete") {
    const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("promo_code", code);
    if ((count ?? 0) > 0) return bad("This code has orders. Switch it off instead of deleting.");
    await db.from("promo_codes").delete().eq("code", code);
    return NextResponse.json({ ok: true });
  }
  return bad("Unknown action.");
}
