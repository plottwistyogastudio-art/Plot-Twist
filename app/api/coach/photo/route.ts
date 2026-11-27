import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { approvedLink, uploadPhoto } from "@/lib/coach";

// Approved coach only: one photo (JPEG, already resized by the browser). Returns its public URL.
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const link = await approvedLink(user.id);
  if (!link) return NextResponse.json({ error: "Your coach account is not approved yet." }, { status: 403 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > 4_000_000) return NextResponse.json({ error: "The photo must be under 4 MB." }, { status: 400 });
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return NextResponse.json({ error: "Please upload a JPG or PNG photo." }, { status: 400 });
  const url = await uploadPhoto(buf, link.teacherId);
  if (!url) return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  return NextResponse.json({ url });
}
