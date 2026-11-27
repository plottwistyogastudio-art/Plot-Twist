import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import CoachesAdminView from "@/components/admin/CoachesAdminView";

export const metadata: Metadata = { title: "Coach themes", robots: { index: false } };

export default function CoachesPage() {
  return <AdminShell><CoachesAdminView /></AdminShell>;
}
