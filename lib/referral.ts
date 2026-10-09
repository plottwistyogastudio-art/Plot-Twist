import { supabaseAdmin } from "@/lib/supabase";
import {
  REFERRAL_DISCOUNT_PCT, REFERRAL_FRIENDS_PER_REWARD, REFERRAL_REWARD_CLASSES, REFERRAL_REWARD_VALID_DAYS,
  REFERRAL_ON_FIRST_PLOT, referralPrice,
} from "@/data/referral";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const make = () => "PLOT-" + Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

// A member gets a code only after their first paid purchase. Created the first time it is needed.
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const db = supabaseAdmin();
  if ((await paidOrderCount(userId)) === 0) return null;
  const { data: p } = await db.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
  if (!p) return null; // no profile yet
  if (p.referral_code) return p.referral_code;
  for (let i = 0; i < 6; i++) {
    const code = make();
    const { error } = await db.from("profiles").update({ referral_code: code }).eq("id", userId).is("referral_code", null);
    if (!error) {
      const { data } = await db.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
      if (data?.referral_code) return data.referral_code;
    }
  }
  return null;
}

export async function paidOrderCount(userId: string) {
  const { count } = await supabaseAdmin().from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "paid");
  return count ?? 0;
}

// Does this member get the new-member discount on their next purchase?
export async function referralDiscountEligible(userId: string) {
  const { data: p } = await supabaseAdmin().from("profiles").select("referred_by").eq("id", userId).maybeSingle();
  if (!p?.referred_by) return false;
  return (await paidOrderCount(userId)) === 0;
}

// Price to charge for a package, with the referral discount if it applies.
export async function priceFor(userId: string, pkg: { price: number; oncePerPerson?: boolean }) {
  const eligible = (REFERRAL_ON_FIRST_PLOT || !pkg.oncePerPerson) && (await referralDiscountEligible(userId));
  if (!eligible) return { amount: pkg.price, discount: 0 };
  const amount = referralPrice(pkg.price);
  return { amount, discount: pkg.price - amount };
}

// Link a new member to the member who invited them. Only before the first purchase, only once.
export async function applyReferralCode(userId: string, rawCode: string) {
  const db = supabaseAdmin();
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false as const, message: "Enter a code." };
  const { data: me } = await db.from("profiles").select("referred_by").eq("id", userId).maybeSingle();
  if (!me) return { ok: false as const, message: "Please finish creating your account first." };
  if (me.referred_by) return { ok: true as const, already: true };
  if ((await paidOrderCount(userId)) > 0) return { ok: false as const, message: "Referral codes are for new members only." };
  const { data: owner } = await db.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!owner || (await paidOrderCount(owner.id)) === 0) return { ok: false as const, message: "We could not find this code." };
  if (owner.id === userId) return { ok: false as const, message: "You cannot use your own code." };
  const { error } = await db.from("profiles").update({ referred_by: owner.id }).eq("id", userId).is("referred_by", null);
  if (error) return { ok: false as const, message: "Could not apply the code. Please try again." };
  return { ok: true as const, already: false };
}

// Called when an order is paid. If it is a referred member's first paid order, it counts for the referrer,
// and every REFERRAL_FRIENDS_PER_REWARD such members earn the referrer a free class.
export async function qualifyReferral(userId: string) {
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("referred_by, referral_qualified_at").eq("id", userId).maybeSingle();
  if (!p?.referred_by || p.referral_qualified_at) return;
  if ((await paidOrderCount(userId)) !== 1) return; // first paid order only
  const { data: marked } = await db.from("profiles").update({ referral_qualified_at: new Date().toISOString() })
    .eq("id", userId).is("referral_qualified_at", null).select("id").single();
  if (!marked) return;
  await grantDueRewards(p.referred_by);
}

export async function referralStats(userId: string) {
  const db = supabaseAdmin();
  const [{ count: qualified }, { count: granted }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId).not("referral_qualified_at", "is", null),
    db.from("credit_packs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("package_id", "referral-reward"),
  ]);
  const q = qualified ?? 0;
  return { qualified: q, rewards: granted ?? 0, untilNext: REFERRAL_FRIENDS_PER_REWARD - (q % REFERRAL_FRIENDS_PER_REWARD) };
}

async function grantDueRewards(referrerId: string) {
  const db = supabaseAdmin();
  const { qualified, rewards } = await referralStats(referrerId);
  const due = Math.floor(qualified / REFERRAL_FRIENDS_PER_REWARD) - rewards;
  for (let i = 0; i < due; i++) {
    await db.from("credit_packs").insert({
      user_id: referrerId, package_id: "referral-reward",
      total: REFERRAL_REWARD_CLASSES, remaining: REFERRAL_REWARD_CLASSES,
      expires_at: new Date(Date.now() + REFERRAL_REWARD_VALID_DAYS * 86400_000).toISOString(),
    });
  }
}

export { REFERRAL_DISCOUNT_PCT, REFERRAL_FRIENDS_PER_REWARD };
