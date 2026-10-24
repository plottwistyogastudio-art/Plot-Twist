// Server only: promo codes. Rules are stored in the promo_codes table (see supabase/schema.sql).
import { supabaseAdmin } from "@/lib/supabase";
import { paidOrderCount, priceFor } from "@/lib/referral";

export type Promo = {
  code: string; kind: "percent" | "amount"; value: number; package_ids: string[];
  expires_at: string | null; max_uses: number | null;
  one_per_person: boolean; new_members_only: boolean; active: boolean; note: string | null; created_at: string;
};

export const MIN_CHARGE = 10000; // never charge less than this (payment provider minimum)
export const PROMO_RE = /^[A-Z0-9_-]{3,30}$/;
export const normalisePromo = (s: unknown) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 30);

export function promoDiscount(p: Pick<Promo, "kind" | "value">, price: number) {
  const raw = p.kind === "percent" ? Math.round((price * p.value) / 100) : p.value;
  return Math.max(0, Math.min(raw, price - MIN_CHARGE));
}

export type PromoResult =
  | { ok: false; message: string }
  | { ok: true; code: string | null; amount: number; discount: number; message: string };

// Check a code for this member and package. Referral and promo never stack: the bigger discount wins.
export async function evaluatePromo(userId: string, rawCode: string, pkg: { id: string; name: string; price: number; oncePerPerson?: boolean }): Promise<PromoResult> {
  const code = normalisePromo(rawCode);
  const bad = (message: string): PromoResult => ({ ok: false, message });
  if (!code) return bad("Enter a promo code.");
  const db = supabaseAdmin();
  const { data: promo } = await db.from("promo_codes").select("*").eq("code", code).maybeSingle<Promo>();
  if (!promo || !promo.active) return bad("This code is not valid.");
  if (promo.expires_at && Date.parse(promo.expires_at) < Date.now()) return bad("This code has expired.");
  if (!promo.package_ids.includes(pkg.id)) return bad(`This code does not apply to ${pkg.name}.`);
  if (promo.new_members_only && (await paidOrderCount(userId)) > 0) return bad("This code is for new members only.");

  if (promo.one_per_person) {
    const { count } = await db.from("orders").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("promo_code", code).eq("status", "paid");
    if ((count ?? 0) > 0) return bad("You have already used this code.");
  }
  if (promo.max_uses !== null) {
    // paid orders, plus other people's open orders (a member's own open order is replaced when they order again)
    const { count } = await db.from("orders").select("id", { count: "exact", head: true })
      .eq("promo_code", code).in("status", ["pending", "paid"])
      .or(`status.eq.paid,user_id.neq.${userId}`);
    if ((count ?? 0) >= promo.max_uses) return bad("This code has been fully used.");
  }

  const base = await priceFor(userId, pkg); // referral price, if the member has one
  const d = promoDiscount(promo, pkg.price);
  if (d <= 0) return bad("This code gives no discount on this package.");
  if (d > base.discount) {
    return { ok: true, code, amount: pkg.price - d, discount: d, message: `Code ${code} applied.` };
  }
  return { ok: true, code: null, amount: base.amount, discount: base.discount, message: "Your referral discount is already bigger, so we kept that one. Discounts do not combine." };
}
