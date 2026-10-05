import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ScheduleAdminView from "@/components/admin/ScheduleAdminView";

export const metadata: Metadata = { title: "Schedule", robots: { index: false } };

export default function AdminSchedulePage() {
  return <AdminShell><ScheduleAdminView /></AdminShell>;
}
