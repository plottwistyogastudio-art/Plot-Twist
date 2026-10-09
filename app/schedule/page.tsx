import type { Metadata } from "next";
import Link from "next/link";
import ScheduleBoard from "@/components/ScheduleBoard";
import { getConfig } from "@/lib/config";
import { teacherCards } from "@/data/teachers";
import ClassLegend from "@/components/ClassLegend";
import { OPENING_DATE, WEEKS_AHEAD, getClasses } from "@/data/schedule";
import { addDays, formatFullDay, parseISO, startOfWeek, toISO, today } from "@/lib/dates";

export const metadata: Metadata = { title: "Schedule", description: "See this week's yoga classes at Plot Twist in Lippo Karawaci and book your spot." };

// Always fresh, so changes made in the admin page show up right away
export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ teacher?: string }> }) {
  const config = await getConfig();
  const { teacher: teacherId } = await searchParams;
  const cards = teacherCards(config.teachers);
  const card = teacherId ? cards.find((x) => x.slug === teacherId.toLowerCase() || x.id === teacherId) : undefined;
  const teacher = card;

  if (teacher) {
    const opening = parseISO(OPENING_DATE);
    const now = today();
    const from = now < opening ? opening : now;
    const end = addDays(startOfWeek(opening), WEEKS_AHEAD * 7);
    const rows: { iso: string; date: Date; time: string; name: string; type: string; duration: string; level: string }[] = [];
    for (let d = from; d < end; d = addDays(d, 1)) {
      for (const c of getClasses(d, config)) {
        if (c.teacher === teacher.name) rows.push({ iso: toISO(d), date: d, time: c.time, name: c.name, type: c.type, duration: c.duration, level: c.level });
      }
    }
    const first = teacher.name.trim().split(/\s+/)[0];
    return (
      <section className="container page">
        <div className="eyebrow">Schedule</div>
        <h1 className="h1 h1-page">
          Classes with <em>{first}</em>
        </h1>
        <p className="lead">
          Every upcoming class taught by {teacher.name}.{" "}
          <Link href={`/teachers/${teacher.slug}`} className="text-link">Back to profile</Link>
          {" · "}
          <Link href="/schedule" className="text-link">Full schedule</Link>
        </p>

        <div className="class-list">
          {rows.map((c) => (
            <div className="class-row" key={c.iso + c.time}>
              <div>
                <div className="class-time">{c.time}</div>
                <div className="muted small">{c.duration}</div>
              </div>
              <div>
                <div className="class-name">{c.name}</div>
                <div className="muted small">{c.type} · {formatFullDay(c.date)}</div>
              </div>
              <div className="muted" />
              <div>
                <span className="pill">{c.level}</span>
              </div>
              <a href={`/book?class=${encodeURIComponent(c.iso + "_" + c.time)}`} className="btn btn-primary btn-sm class-book">
                Book
              </a>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="empty">No upcoming classes with {first} right now. Check the full schedule for other classes.</div>
          )}
        </div>

        <ClassLegend types={[...new Set(rows.map((r) => r.type))]} levels={[...new Set(rows.map((r) => r.level))]} />
      </section>
    );
  }

  return (
    <section className="container page">
      <div className="eyebrow">Schedule</div>
      <h1 className="h1 h1-page">
        Book your <em>spot</em>
      </h1>
      <p className="lead">
        Pick a day, choose a class and reserve your mat. New to yoga? Start with our{" "}
        <Link href="/class-guide" className="text-link">class guide</Link>.
      </p>

      <ScheduleBoard config={config} />

      <ClassLegend />

      <div className="note-band">
        <div>
          <div className="card-title">Need a package first?</div>
          <div className="muted">Class packs make every booking easier.</div>
        </div>
        <Link href="/packages" className="btn btn-outline">View packages</Link>
      </div>
    </section>
  );
}
