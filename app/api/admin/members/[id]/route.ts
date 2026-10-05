import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return forbidden();
  const { id } = await params;
  const db = supabaseAdmin();
  const [{ data: profile }, { data: packs }, { data: bookings }, { data: orders }, { data: adjustments }] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).single(),
    db.from("credit_packs").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("bookings").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(40),
    db.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("credit_adjustments").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ profile, packs, bookings, orders, adjustments });
}
