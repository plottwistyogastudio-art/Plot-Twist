import { NextResponse } from "next/server";
import { findClass, spotsLeft, studioMatsTaken } from "@/lib/booking";
import { STUDIO_MAT_LIMIT } from "@/data/schedule";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const cls = await findClass(decodeURIComponent(key));
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const left = await spotsLeft(decodeURIComponent(key));
  const studioLeft = Math.max(0, STUDIO_MAT_LIMIT - (await studioMatsTaken(decodeURIComponent(key))));
  return NextResponse.json({ ...cls.session, iso: cls.iso, spotsLeft: left, full: left === 0, studioMatsLeft: studioLeft });
}
