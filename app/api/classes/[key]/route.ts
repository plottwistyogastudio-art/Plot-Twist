import { NextResponse } from "next/server";
import { findClass, spotsLeft } from "@/lib/booking";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const cls = findClass(decodeURIComponent(key));
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const left = await spotsLeft(decodeURIComponent(key));
  return NextResponse.json({ ...cls.session, iso: cls.iso, spotsLeft: left, full: left === 0 });
}
