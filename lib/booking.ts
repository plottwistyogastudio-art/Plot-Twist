import { OPENING_DATE, CLASS_CAPACITY } from "@/data/schedule";
import { firstPlot, packages } from "@/data/packages";
import { supabaseAdmin } from "@/lib/supabase";

import { CANCEL_HOURS, findClass as findClassIn, classStart } from "@/lib/booking-shared";
import { getConfig } from "@/lib/config";
import { qualifyReferral } from "@/lib/referral";
export { CANCEL_HOURS, classStart };

// Looks the class up in the live (admin-edited) schedule
export async function findClass(key: string) {
  return findClassIn(key, await getConfig());
}
const allPackages = [...packages, ...firstPlot];

// Validity rules.
// "purchase": the clock starts when the package is bought.
// "first_booking": the clock starts when the first class is booked with it.
const VALIDITY: Record<string, { days: number; from: "purchase" | "first_booking" }> = {
  "drop-in": { days: 7, from: "purchase" },
  "pack-5": { days: 35, from: "first_booking" },
  "pack-10": { days: 70, from: "first_booking" },
  "first-plot-3": { days: 21, from: "first_booking" },
  "first-plot-5": { days: 35, from: "first_booking" },
};
const addDays = (days: number) => new Date(Date.now() + days * 86400_000).toISOString();

export const findPackage = (id: string) => allPackages.find((p) => p.id === id);
export const classKey = (iso: string, time: string) => `${iso}_${time}`;

export type BookResult =
  | { status: "booked" | "waitlist"; bookingId: string; packRemaining: number }
  | { status: "needs_payment" }
  | { status: "error"; message: string };

async function usablePack(userId: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("credit_packs")
    .select("*")
    .eq("user_id", userId)
    .gt("remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("expires_at", { ascending: true, nullsFirst: false })
    .limit(1);
  return data?.[0] ?? null;
}

// Takes one credit. If the pack's validity starts at the first booking, start the clock now.
function useCredit(pack: { remaining: number; expires_at: string | null; valid_days: number | null }) {
  return {
    remaining: pack.remaining - 1,
    expires_at: pack.expires_at ?? (pack.valid_days ? addDays(pack.valid_days) : null),
  };
}

export async function spotsLeft(key: string) {
  const { count } = await supabaseAdmin()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("class_key", key)
    .eq("status", "booked");
  return Math.max(0, CLASS_CAPACITY - (count ?? 0));
}

export async function bookClass(userId: string, key: string): Promise<BookResult> {
  const db = supabaseAdmin();
  const cls = await findClass(key);
  if (!cls) return { status: "error", message: "This class does not exist." };
  if (cls.iso < OPENING_DATE) return { status: "error", message: "Bookings are not open for this date." };
  const start = classStart(key);
  if (start.getTime() < Date.now()) return { status: "error", message: "This class has already started." };

  const { data: existing } = await db
    .from("bookings").select("id").eq("user_id", userId).eq("class_key", key).in("status", ["booked", "waitlist"]).limit(1);
  if (existing?.length) return { status: "error", message: "You already have a spot in this class." };

  const pack = await usablePack(userId);
  if (!pack) return { status: "needs_payment" };

  const left = await spotsLeft(key);
  if (left === 0) {
    // Waitlist closes CANCEL_HOURS before class. No credit is used until a spot opens.
    if (start.getTime() - Date.now() < CANCEL_HOURS * 3600_000)
      return { status: "error", message: "This class is full and the waitlist has closed." };
    const { data, error } = await db.from("bookings").insert({ user_id: userId, class_key: key, status: "waitlist" }).select("id").single();
    if (error) return { status: "error", message: "Could not join the waitlist." };
    return { status: "waitlist", bookingId: data.id, packRemaining: pack.remaining };
  }

  // Take the credit first, only if still available (guards against double use)
  const { data: taken } = await db.from("credit_packs")
    .update(useCredit(pack)).eq("id", pack.id).eq("remaining", pack.remaining).select("remaining").single();
  if (!taken) return { status: "error", message: "Please try again." };

  const { data, error } = await db.from("bookings")
    .insert({ user_id: userId, class_key: key, status: "booked", pack_id: pack.id }).select("id").single();
  if (error) {
    await db.from("credit_packs").update({ remaining: pack.remaining, expires_at: pack.expires_at }).eq("id", pack.id);
    return { status: "error", message: "Could not book this class." };
  }

  // Two people may tap the last spot at the same moment. Check again after saving:
  // whoever is beyond the capacity (by booking order) is released and gets their credit back.
  const { data: order } = await db.from("bookings").select("id").eq("class_key", key).eq("status", "booked").order("created_at").order("id");
  const position = (order ?? []).findIndex((r) => r.id === data.id);
  if (position >= CLASS_CAPACITY) {
    await db.from("bookings").update({ status: "cancelled" }).eq("id", data.id);
    await db.from("credit_packs").update({ remaining: pack.remaining, expires_at: pack.expires_at }).eq("id", pack.id);
    return { status: "error", message: "Sorry, someone just took the last spot. Please try again to join the waitlist." };
  }
  return { status: "booked", bookingId: data.id, packRemaining: taken.remaining };
}

// Cancel a booking. Credit is returned only up to CANCEL_HOURS before class.
export async function cancelBooking(userId: string, bookingId: string, opts: { refundAlways?: boolean } = {}) {
  const db = supabaseAdmin();
  const { data: b } = await db.from("bookings").select("*").eq("id", bookingId).eq("user_id", userId).single();
  if (!b || b.status === "cancelled") return { ok: false, message: "Booking not found." };

  const hoursLeft = (classStart(b.class_key).getTime() - Date.now()) / 3600_000;
  const refund = b.status === "booked" && (opts.refundAlways || hoursLeft >= CANCEL_HOURS);
  if (b.status === "booked" && hoursLeft < 0 && !opts.refundAlways) return { ok: false, message: "This class has already started." };

  await db.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  if (refund && b.pack_id) {
    const { data: p } = await db.from("credit_packs").select("remaining").eq("id", b.pack_id).single();
    if (p) await db.from("credit_packs").update({ remaining: p.remaining + 1 }).eq("id", b.pack_id);
  }
  // If this was the booking that started the pack's validity clock and the credit
  // came back, the pack counts as unused again: the clock starts over at the next booking.
  if (refund && b.pack_id) {
    const { data: p } = await db.from("credit_packs").select("valid_days").eq("id", b.pack_id).single();
    if (p?.valid_days) {
      const { count } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("pack_id", b.pack_id).eq("status", "booked");
      if ((count ?? 0) === 0) await db.from("credit_packs").update({ expires_at: null }).eq("id", b.pack_id);
    }
  }
  // A seat freed up (even a late cancel frees the seat, just no refund)
  if (b.status === "booked") await promoteWaitlist(b.class_key);
  return { ok: true, refunded: refund };
}

// Move the first person on the waitlist who still has a credit into the class.
async function promoteWaitlist(key: string) {
  const db = supabaseAdmin();
  const { data: queue } = await db.from("bookings")
    .select("*").eq("class_key", key).eq("status", "waitlist").order("created_at", { ascending: true });
  for (const w of queue ?? []) {
    if ((await spotsLeft(key)) === 0) return;
    const pack = await usablePack(w.user_id);
    if (!pack) continue;
    const { data: taken } = await db.from("credit_packs")
      .update(useCredit(pack)).eq("id", pack.id).eq("remaining", pack.remaining).select("id").single();
    if (!taken) continue;
    await db.from("bookings").update({ status: "booked", pack_id: pack.id }).eq("id", w.id);
    // TODO: message them (email / WhatsApp) that they are in
    return;
  }
}

export async function hasUsedFirstPlot(userId: string) {
  const { count } = await supabaseAdmin()
    .from("credit_packs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_first_plot", true);
  return (count ?? 0) > 0;
}

// Called when an order is paid: creates the credits, then books the chosen class.
export async function fulfillOrder(orderId: string) {
  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).single();
  if (!order) return { ok: false as const, message: "Order not found." };
  if (order.status === "paid") return { ok: true as const, already: true };

  // Mark paid first, only if still pending: makes this safe to call twice
  const { data: claimed } = await db.from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", orderId).eq("status", "pending").select("id").single();
  if (!claimed) return { ok: true as const, already: true };

  const pkg = findPackage(order.package_id);
  if (!pkg) return { ok: false as const, message: "Unknown package." };
  const rule = VALIDITY[pkg.id] ?? { days: 30, from: "purchase" as const };
  const { error } = await db.from("credit_packs").insert({
    user_id: order.user_id, package_id: pkg.id, total: pkg.classes, remaining: pkg.classes,
    expires_at: rule.from === "purchase" ? addDays(rule.days) : null,
    valid_days: rule.from === "first_booking" ? rule.days : null,
    is_first_plot: !!pkg.oncePerPerson,
  });
  if (error) return { ok: false as const, message: "Could not add credits." };

  try { await qualifyReferral(order.user_id); } catch { /* never block a paid order */ }

  const booking = order.class_key ? await bookClass(order.user_id, order.class_key) : null;
  return { ok: true as const, booking };
}

// Admin: move one specific waitlisted booking into the class (needs a free mat and a credit).
export async function promoteBooking(bookingId: string) {
  const db = supabaseAdmin();
  const { data: w } = await db.from("bookings").select("*").eq("id", bookingId).eq("status", "waitlist").single();
  if (!w) return { ok: false, message: "Waitlist entry not found." };
  if ((await spotsLeft(w.class_key)) === 0) return { ok: false, message: "The class is still full." };
  const pack = await usablePack(w.user_id);
  if (!pack) return { ok: false, message: "This member has no credit left." };
  const { data: taken } = await db.from("credit_packs")
    .update(useCredit(pack)).eq("id", pack.id).eq("remaining", pack.remaining).select("id").single();
  if (!taken) return { ok: false, message: "Please try again." };
  await db.from("bookings").update({ status: "booked", pack_id: pack.id }).eq("id", w.id);
  return { ok: true };
}
