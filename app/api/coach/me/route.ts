import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { buildReport, feeFor, getFeeSettings } from "@/lib/coachFees";
import { getLinks, getThemes, upcomingClasses } from "@/lib/coach";

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const links = await getLinks();
  const mine = links.find((l) => l.userId === user.id);
  const cfg = await getConfig();

  if (!mine) {
    const taken = new Set(links.filter((l) => l.status === "approved").map((l) => l.teacherId));
    return NextResponse.json({ state: "none", email: user.email, teachers: cfg.teachers.filter((t) => !taken.has(t.id)).map((t) => ({ id: t.id, name: t.name })) });
  }
  const teacher = cfg.teachers.find((t) => t.id === mine.teacherId);
  if (!teacher) return NextResponse.json({ state: "none", email: user.email, teachers: cfg.teachers.map((t) => ({ id: t.id, name: t.name })) });
  if (mine.status === "pending") return NextResponse.json({ state: "pending", email: user.email, teacher: { id: teacher.id, name: teacher.name } });

  const month = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
  const [report, settings, classes, themes] = await Promise.all([buildReport(month, "checked"), getFeeSettings(), upcomingClasses(teacher.id), getThemes(teacher.id)]);
  const me = report.coaches.find((c) => c.id === teacher.id);
  const r = settings.rates[teacher.id];
  return NextResponse.json({
    state: "approved", email: user.email, teacher: { id: teacher.id, name: teacher.name },
    fee: {
      month, rate: r ?? null, dropIn: settings.dropIn,
      totals: me?.totals ?? { classes: 0, booked: 0, people: 0, fee: 0 },
      classes: (me?.classes ?? []).map((c) => ({ key: c.key, date: c.date, time: c.time, name: c.name, people: c.people, fee: c.fee })),
      upcomingNote: report.upcoming,
    },
    classes: classes.map((c) => ({ ...c, theme: themes[c.key]?.theme ?? "", photo: themes[c.key]?.photo ?? "" })),
  });
}
