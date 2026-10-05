import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return forbidden();
  return NextResponse.json({ ok: true, email: admin.email });
}
