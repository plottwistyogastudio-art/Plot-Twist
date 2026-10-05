import type { Metadata } from "next";
import Link from "next/link";
import ScheduleBoard from "@/components/ScheduleBoard";

export const metadata: Metadata = { title: "Schedule", description: "See this week's yoga classes at Plot Twist in Lippo Karawaci and book your spot." };

export default function SchedulePage() {
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

      <ScheduleBoard />

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
