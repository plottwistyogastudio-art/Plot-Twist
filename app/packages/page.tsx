import type { Metadata } from "next";
import PackageCard from "@/components/PackageCard";
import { firstPlot, firstPlotWindow, packages } from "@/data/packages";
import { site } from "@/data/site";

export const metadata: Metadata = { title: "Packages" };

const faqs = [
  { q: "What is First Plot?", a: "Our opening deal for new members: a 3-class or 5-class package at a special price. You can buy one First Plot package per person, and only during the opening window." },
  { q: "How do I book a class?", a: "Choose a class on the schedule and tap Book. You will need an active package or a drop-in purchase to reserve your spot." },
  { q: "Can I cancel or reschedule?", a: "Yes. Cancel up to [cancellation window] before class to keep your credit. Late cancellations and no-shows may use a class." },
  { q: "Do packages expire?", a: "Each package is valid for a set period from your first booking. The validity is shown on every package." },
  { q: "Can I share a package?", a: "Packages are personal and cannot be shared, but you are welcome to bring a friend with a drop-in." },
];

export default function PackagesPage() {
  return (
    <>
      <section className="container page">
        <div className="eyebrow">Packages</div>
        <h1 className="h1 h1-page">
          Find your <em>rhythm</em>
        </h1>
        <p className="lead">
          Start with our opening deal, or choose a regular package. Every package works for any class on the schedule.
        </p>

        <div className="deal">
          <div className="eyebrow">Opening deal · {firstPlotWindow}</div>
          <h2 className="h2 deal-title">First Plot</h2>
          <p className="muted deal-text">
            Your first chapter at Plot Twist. New members only, one First Plot package per person.
          </p>
          <div className="grid grid-2 deal-grid">
            {firstPlot.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        </div>

        <h2 className="h3 regular-title">Regular packages</h2>
        <div className="grid grid-3">
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>

        <div className="note-band note-outline">
          <div>
            <h2 className="h3">Private sessions</h2>
            <p className="muted">
              One-on-one practice with a teacher of your choice, tailored to your goals. Great for beginners and for going deeper.
            </p>
          </div>
          <a href={site.whatsappUrl} className="btn btn-outline">Enquire on WhatsApp</a>
        </div>
      </section>

      <section className="container section-tight faq-layout">
        <div>
          <h2 className="h2">Good to know</h2>
          <p className="muted faq-intro">Questions about booking, cancelling or using your package.</p>
        </div>
        <div className="faq">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>
                <span>{f.q}</span>
                <span className="faq-icon" aria-hidden="true" />
              </summary>
              <p className="muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
