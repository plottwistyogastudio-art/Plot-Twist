import type { Metadata } from "next";
import CoachView from "@/components/CoachView";

export const metadata: Metadata = { title: "Coach page", robots: { index: false } };

export default function CoachPage() {
  return (
    <section className="container page">
      <CoachView />
    </section>
  );
}
