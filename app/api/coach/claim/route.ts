import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { getLinks, saveLinks } from "@/lib/coach";

// A signed-in user says "I am this coach". An admin approves it (Admin → Coach themes).
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const teacherId = String(body?.teacherId ?? "");
  const cfg = await getConfig();
  if (!cfg.teachers.some((t) => t.id === teacherId)) return NextResponse.json({ error: "Pick your name from the list." }, { status: 400 });
  const links = await getLinks();
  if (links.some((l) => l.userId === user.id && l.status === "approved")) return NextResponse.json({ error: "You are already a coach here." }, { status: 400 });
  if (links.some((l) => l.teacherId === teacherId && l.status === "approved")) return NextResponse.json({ error: "This coach already has an account. Ask the studio if that is a mistake." }, { status: 400 });
  const rest = links.filter((l) => l.userId !== user.id);
  rest.push({ userId: user.id, email: user.email ?? "", teacherId, status: "pending", at: new Date().toISOString() });
  const { error } = await saveLinks(rest, user.email ?? null);
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
