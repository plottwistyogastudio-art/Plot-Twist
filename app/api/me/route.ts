import { NextResponse } from "next/server";
import { getUser, supabaseAdmin } from "@/lib/supabase";
import { hasUsedFirstPlot, cancelBooking } from "@/lib/booking";
import { ensureReferralCode, paidOrderCount, referralDiscountEligible, referralStats } from "@/lib/referral";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/data/legal";

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const [{ data: profile }, { data: packs }, { data: bookings }, usedFirstPlot] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    db.from("credit_packs").select("*").eq("user_id", user.id).or(`expires_at.is.null,expires_at.gt.${now}`).gt("remaining", 0),
    db.from("bookings").select("*").eq("user_id", user.id).in("status", ["booked", "waitlist"]).order("class_key"),
    hasUsedFirstPlot(user.id),
  ]);
  if (profile && !profile.email && user.email) await db.from("profiles").update({ email: user.email }).eq("id", user.id);
  const credits = (packs ?? []).reduce((n, p) => n + p.remaining, 0);
  let referral = null;
  if (profile) {
    const [code, stats, discountEligible] = await Promise.all([ensureReferralCode(user.id), referralStats(user.id), referralDiscountEligible(user.id)]);
    const hasPaid = (await paidOrderCount(user.id)) > 0;
    const canApplyCode = !profile.referred_by && !hasPaid;
    referral = { code, ...stats, referredBy: !!profile.referred_by, discountEligible, canApplyCode, hasPaid };
  }
  return NextResponse.json({ email: user.email, profile, packs, bookings, credits, usedFirstPlot, referral });
}

// Save name + WhatsApp (called right after sign up)
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { fullName, whatsapp, consent, terms, marketing } = await req.json();
  if (consent !== true || terms !== true) return NextResponse.json({ error: "Consent is required" }, { status: 400 });
  await supabaseAdmin().from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: String(fullName ?? "").slice(0, 120),
    whatsapp: String(whatsapp ?? "").slice(0, 30),
    consent_at: new Date().toISOString(),
    consent_version: PRIVACY_VERSION,
    terms_version: TERMS_VERSION,
    marketing_opt_in: marketing === true,
  });
  return NextResponse.json({ ok: true });
}

// Delete the account. Future bookings are cancelled first so seats free up and waitlists move.
// Payment records stay (without a name) for accounting, as the Privacy Policy says.
export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== true) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: open } = await db.from("bookings").select("id").eq("user_id", user.id).in("status", ["booked", "waitlist"]);
  for (const b of open ?? []) await cancelBooking(user.id, b.id, { refundAlways: true });
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Could not delete the account. Please contact the studio." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
