import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import CoachFeesView from "@/components/admin/CoachFeesView";

export const metadata: Metadata = { title: "Coach fees", robots: { index: false } };

export default function CoachFeesPage() {
  return <AdminShell><CoachFeesView /></AdminShell>;
}
