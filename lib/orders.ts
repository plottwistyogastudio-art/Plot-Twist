// Server only: closing QRIS orders that were never paid.
// A DOKU QRIS page is valid for 30 minutes (payment_due_date in lib/doku.ts). After that the order can no longer be paid,
// so it is marked "expired" and hidden from the lists. The row is kept (not deleted) so a very late payment
// notification can still be matched to it.
import { supabaseAdmin } from "@/lib/supabase";

const QRIS_VALID_MIN = 30;
const GRACE_MIN = 5;

// Orders that were sent to the payment page (they have a payment_ref) and are older than the QRIS validity.
// Orders without a payment_ref (manual transfer / cash flow) are never closed automatically.
export async function closeStaleOrders() {
  const cutoff = new Date(Date.now() - (QRIS_VALID_MIN + GRACE_MIN) * 60_000).toISOString();
  await supabaseAdmin().from("orders").update({ status: "expired" })
    .eq("status", "pending").not("payment_ref", "is", null).lt("created_at", cutoff);
}

// When a member starts a new order for the same package, their earlier unpaid QRIS order for it is closed,
// so they never end up with two open orders for one package.
export async function closeOlderPending(userId: string, packageId: string) {
  await supabaseAdmin().from("orders").update({ status: "expired" })
    .eq("user_id", userId).eq("package_id", packageId).eq("status", "pending").not("payment_ref", "is", null);
}
