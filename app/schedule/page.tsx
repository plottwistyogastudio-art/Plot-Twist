import type { Metadata } from "next";
import Link from "next/link";
import ScheduleBoard from "@/components/ScheduleBoard";
import { getConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Schedule", description: "See this week's yoga classes at Plot Twist in Lippo Karawaci and book your spot." };

// Always fresh, so changes made in the admin page show up right away
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const config = await getConfig();
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
