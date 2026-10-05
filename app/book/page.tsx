import type { Metadata } from "next";
import { Suspense } from "react";
import BookingFlow from "@/components/BookingFlow";

export const metadata: Metadata = { title: "Book" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ class?: string; package?: string }> }) {
  const q = await searchParams;
  return (
    <section className="container page flow-page">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <BookingFlow classKey={q.class} packageId={q.package} />
      </Suspense>
    </section>
  );
}
