import type { Metadata } from "next";
import CtaBand from "@/components/CtaBand";
import { classTypes } from "@/data/classTypes";

export const metadata: Metadata = { title: "Class Guide" };

const steps = [
  { n: "1", title: "Pick a class", desc: "Browse the schedule and choose a class that fits your level and mood." },
  { n: "2", title: "Book your spot", desc: "Reserve online with a package or a drop-in." },
  { n: "3", title: "Arrive early", desc: "Come 10 minutes before class to check in and set up your mat." },
  { n: "4", title: "Enjoy the twist", desc: "Move at your own pace. Your teacher will guide you through every step." },
];

export default function ClassGuidePage() {
  return (
    <>
      <section className="container page">
        <div className="eyebrow">Class guide</div>
        <h1 className="h1 h1-page">
          Which class is <em>for you?</em>
        </h1>
        <p className="lead">
          A quick guide to what we teach, how each class feels and what to expect when you walk in.
        </p>

        <div className="grid grid-3 guide-grid">
          {classTypes.map((t) => (
            <article className="card card-sand" key={t.name}>
              <h2 className="card-title">{t.name}</h2>
              <p className="muted grow">{t.desc}</p>
              <div className="pill-row">
                <span className="pill">{t.level}</span>
                <span className="pill pill-plain">{t.intensity}</span>
              </div>
              <div className="small muted">
                <strong className="ink">Good for:</strong> {t.goodFor}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container section-tight">
        <h2 className="h2 steps-title">Your first visit</h2>
        <div className="grid grid-4">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.title}</div>
              <p className="muted small">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section-tight">
        <div className="grid grid-2">
          <div className="panel panel-blush">
            <h2 className="h3">What to bring</h2>
            <ul>
              <li>Comfortable clothes you can move in</li>
              <li>A water bottle</li>
              <li>A small towel</li>
              <li>Your own mat if you prefer it ([mat rental info])</li>
            </ul>
          </div>
          <div className="panel panel-sand">
            <h2 className="h3">Studio etiquette</h2>
            <ul>
              <li>Arrive 10 minutes early to settle in</li>
              <li>Shoes off at the door, phones on silent</li>
              <li>Tell your teacher about injuries before class</li>
              <li>Late arrivals: [late arrival policy]</li>
            </ul>
          </div>
        </div>
      </section>

      <CtaBand title="Found your class?" text="Reserve your mat and we will see you soon." button="View schedule" href="/schedule" />
    </>
  );
}
