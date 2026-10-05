import Image from "next/image";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import PackageCard from "@/components/PackageCard";
import TeacherCard from "@/components/TeacherCard";
import { classTypes } from "@/data/classTypes";
import { firstPlot, firstPlotOpen, firstPlotWindow } from "@/data/packages";
import { weekdayClasses } from "@/data/schedule";
import { site } from "@/data/site";
import { teachers } from "@/data/teachers";

// Rebuilt at most once an hour, so First Plot disappears by itself after its end date
export const revalidate = 3600;

export default function HomePage() {
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
          <Image src="/logo.png" alt="Plot Twist" width={420} height={267} priority />
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
            <div>{site.hours}</div>
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
          {weekdayClasses.slice(0, 4).map((c) => (
            <div className="class-row" key={c.time + c.name}>
              <div className="class-time">{c.time}</div>
              <div>
                <div className="class-name">{c.name}</div>
                <div className="muted small">{c.duration}</div>
              </div>
              <div className="muted">{c.teacher}</div>
              <div><span className="pill">{c.level}</span></div>
              <a href="/schedule" className="btn btn-dark btn-sm class-book">Book</a>
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
          {teachers.slice(0, 4).map((t) => <TeacherCard key={t.initial} teacher={t} />)}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
