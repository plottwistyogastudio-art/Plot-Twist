import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { approvedLink, getThemes, photoPrefix, saveThemes, upcomingClasses } from "@/lib/coach";

// { key, theme, photo }  save the theme and photo for one of this coach's own classes
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const link = await approvedLink(user.id);
  if (!link) return NextResponse.json({ error: "Your coach account is not approved yet." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const key = String(body?.key ?? "");
  const theme = String(body?.theme ?? "").trim().slice(0, 80);
  const photo = String(body?.photo ?? "");
  if (photo && !photo.startsWith(photoPrefix())) return NextResponse.json({ error: "Please upload the photo again." }, { status: 400 });
  if (!(await upcomingClasses(link.teacherId)).some((c) => c.key === key)) return NextResponse.json({ error: "That class is not on your list." }, { status: 400 });
  const items = await getThemes(link.teacherId);
  if (!theme && !photo) delete items[key]; else items[key] = { theme, photo };
  const { error } = await saveThemes(link.teacherId, items, user.email ?? null);
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
