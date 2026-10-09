import Image from "next/image";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import PackageCard from "@/components/PackageCard";
import TeacherCard from "@/components/TeacherCard";
import { classTypes } from "@/data/classTypes";
import { firstPlot, firstPlotOpen, firstPlotWindow } from "@/data/packages";
import { OPENING_DATE, getClasses } from "@/data/schedule";
import { site } from "@/data/site";
import { teacherCards } from "@/data/teachers";
import { getConfig } from "@/lib/config";
import { WEEKDAYS_SHORT, MONTHS_SHORT, addDays, parseISO, toISO } from "@/lib/dates";

// Rendered on every visit: First Plot disappears by itself after its end date,
// and schedule changes from the admin page show up right away
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getConfig();
  const teachers = teacherCards(config.teachers);

  // The next 4 classes (Jakarta time), never earlier than the opening day
  const nowJ = new Date(Date.now() + 7 * 3600_000);
  const todayISO = nowJ.toISOString().slice(0, 10);
  const nowTime = nowJ.toISOString().slice(11, 16);
  let day = parseISO(todayISO < OPENING_DATE ? OPENING_DATE : todayISO);
  const upcoming: { iso: string; c: ReturnType<typeof getClasses>[number] }[] = [];
  for (let i = 0; i < 21 && upcoming.length < 4; i++, day = addDays(day, 1)) {
    const iso = toISO(day);
    for (const c of getClasses(day, config)) {
      if (iso === todayISO && c.time <= nowTime) continue;
      if (upcoming.length < 4) upcoming.push({ iso, c });
    }
  }
  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <h1 className="h1">
            Come for the stretch.
            <br />
            <em>Stay for the twist.</em>
          </h1>
          <p className="lead">{site.description}</p>
          <div className="btn-row">
            <a href="/schedule" className="btn btn-primary">Book a class</a>
            <Link href="/schedule" className="btn btn-outline">View schedule</Link>
          </div>
        </div>
        <div className="hero-art">
          <Image src="/brand/twisty.png" alt="Twisty, the Plot Twist cat, stretching in downward dog" width={577} height={623} priority />
        </div>
      </section>

      <section className="info-strip">
        <div className="container info-grid">
          <div>
            <div className="eyebrow">Find us</div>
            {site.addressLines.map((l) => <div key={l}>{l}</div>)}
          </div>
          <div>
            <div className="eyebrow">Open</div>
            <div>Daily classes for all levels</div>
          </div>
          <div>
            <div className="eyebrow">Follow</div>
            <a href={site.instagramUrl} className="strong">{site.instagramHandle}</a>
            <div>Instagram</div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <div className="eyebrow">This week</div>
            <h2 className="h2">Upcoming classes</h2>
          </div>
          <Link href="/schedule" className="text-link">See full schedule</Link>
        </div>
        <div className="class-list">
          {upcoming.map(({ iso, c }) => (
            <div className="class-row" key={iso + c.time}>
              <div>
                <div className="class-time">{c.time}</div>
                <div className="muted small">{WEEKDAYS_SHORT[parseISO(iso).getUTCDay()]} {parseISO(iso).getUTCDate()} {MONTHS_SHORT[parseISO(iso).getUTCMonth()]}</div>
              </div>
              <div>
                <div className="class-name">{c.name}</div>
                <div className="muted small">{c.duration}</div>
              </div>
              <div className="muted">{c.teacher}</div>
              <div><span className="pill">{c.level}</span></div>
              <a href={`/book?class=${encodeURIComponent(iso + "_" + c.time)}`} className="btn btn-dark btn-sm class-book">Book</a>
            </div>
          ))}
        </div>
      </section>

      {firstPlotOpen() && (
      <section className="band band-blush">
        <div className="container">
          <div className="center section-head-center">
            <div className="eyebrow">Opening deal · {firstPlotWindow}</div>
            <h2 className="h2">First Plot</h2>
            <p className="muted deal-text deal-text-center">
              Your first chapter at Plot Twist. New members only, one per person.
            </p>
          </div>
          <div className="grid grid-2 grid-narrow">
            {firstPlot.map((p) => <PackageCard key={p.id} pkg={p} compact />)}
          </div>
          <div className="center band-link">
            <Link href="/packages" className="text-link">See all packages</Link>
          </div>
        </div>
      </section>
      )}

      <section className="container section">
        <div className="section-head">
          <h2 className="h2">Find your class</h2>
          <Link href="/class-guide" className="text-link">Read the class guide</Link>
        </div>
        <div className="grid grid-4">
          {classTypes.slice(0, 4).map((t) => (
            <div className="card card-sand" key={t.name}>
              <h3 className="card-title">{t.name}</h3>
              <p className="muted grow">{t.desc}</p>
              <div className="small strong deep">{t.intensity}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container section-tight">
        <div className="section-head">
          <h2 className="h2">Meet your teachers</h2>
          <Link href="/teachers" className="text-link">All teachers</Link>
        </div>
        <div className="grid grid-4">
          {teachers.slice(0, 4).map((t) => <TeacherCard key={t.id} teacher={t} />)}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
