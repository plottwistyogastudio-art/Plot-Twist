import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { packLabel } from "@/lib/booking-shared";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%,()]/g, " ").trim();
  const db = supabaseAdmin();
  let query = db.from("profiles").select("id,full_name,email,whatsapp,created_at").order("created_at", { ascending: false }).limit(40);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,whatsapp.ilike.%${q}%`);
  const { data: members } = await query;
  const ids = (members ?? []).map((m) => m.id);
  const { data: packs } = ids.length
    ? await db.from("credit_packs").select("user_id,package_id,remaining,expires_at").in("user_id", ids).gt("remaining", 0)
    : { data: [] };
  const now = Date.now();
  return NextResponse.json({
    members: (members ?? []).map((m) => {
      const mine = (packs ?? []).filter((p) => p.user_id === m.id && (!p.expires_at || new Date(p.expires_at).getTime() > now));
      return { ...m, credits: mine.reduce((n, p) => n + p.remaining, 0), summary: mine.length ? mine.map((p) => `${packLabel(p.package_id)} · ${p.remaining} left`).join(", ") : "No credits" };
    }),
  });
}
