import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import { getLinks, getThemes, saveLinks, upcomingClasses } from "@/lib/coach";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const [cfg, links] = await Promise.all([getConfig(), getLinks()]);
  const coaches = await Promise.all(cfg.teachers.map(async (t) => {
    const [classes, themes] = await Promise.all([upcomingClasses(t.id), getThemes(t.id)]);
    const link = links.find((l) => l.teacherId === t.id && l.status === "approved");
    return {
      id: t.id, name: t.name, email: link?.email ?? "", linked: !!link, userId: link?.userId ?? "",
      classes: classes.map((c) => ({ ...c, theme: themes[c.key]?.theme ?? "", photo: themes[c.key]?.photo ?? "" })),
    };
  }));
  const pending = links.filter((l) => l.status === "pending").map((l) => ({ userId: l.userId, email: l.email, teacherId: l.teacherId, teacher: cfg.teachers.find((t) => t.id === l.teacherId)?.name ?? l.teacherId, at: l.at }));
  return NextResponse.json({ pending, coaches });
}

// { action: "approve" | "reject" | "unlink", userId }
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return forbidden();
  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "");
  const links = await getLinks();
  const l = links.find((x) => x.userId === userId);
  if (!l) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let next = links;
  if (body?.action === "approve") {
    if (links.some((x) => x.teacherId === l.teacherId && x.status === "approved" && x.userId !== userId)) return NextResponse.json({ error: "This coach already has an approved account. Unlink it first." }, { status: 400 });
    l.status = "approved";
  } else if (body?.action === "reject" || body?.action === "unlink") {
    next = links.filter((x) => x.userId !== userId);
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  const { error } = await saveLinks(next, admin.email ?? null);
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
