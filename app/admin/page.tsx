import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import TodayView from "@/components/admin/TodayView";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return <AdminShell><TodayView /></AdminShell>;
}
