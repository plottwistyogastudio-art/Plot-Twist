import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { packLabel } from "@/lib/booking-shared";
import { closeStaleOrders } from "@/lib/orders";

// Orders that expired without payment are hidden unless ?expired=1
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const showExpired = new URL(req.url).searchParams.get("expired") === "1";
  const db = supabaseAdmin();
  await closeStaleOrders();
  let q = db.from("orders").select("*").order("created_at", { ascending: false }).limit(60);
  if (!showExpired) q = q.neq("status", "expired");
  const { data: orders } = await q;
  const ids = [...new Set((orders ?? []).map((o) => o.user_id))];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
  return NextResponse.json({
    orders: (orders ?? []).map((o) => {
      const p = profiles?.find((x) => x.id === o.user_id);
      return { id: o.id, userId: o.user_id, member: o.user_id ? p?.full_name || p?.email || "Member" : "Deleted member", pkg: packLabel(o.package_id), classKey: o.class_key, amount: o.amount, status: o.status, createdAt: o.created_at };
    }),
  });
}
