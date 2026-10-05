import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "teachers";

// Admin only: uploads one teacher photo (JPEG, already resized by the browser) and returns its public URL.
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > 4_000_000) return NextResponse.json({ error: "The photo must be under 4 MB." }, { status: 400 });
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return NextResponse.json({ error: "Please upload a JPG or PNG photo." }, { status: 400 });

  const db = supabaseAdmin();
  const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  let { error } = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error && /not found/i.test(error.message)) {
    await db.storage.createBucket(BUCKET, { public: true });
    ({ error } = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", cacheControl: "31536000" }));
  }
  if (error) return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  return NextResponse.json({ url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}
