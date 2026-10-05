import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import RosterView from "@/components/admin/RosterView";

export const metadata: Metadata = { title: "Roster", robots: { index: false } };

export default async function RosterPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <AdminShell><RosterView classKey={decodeURIComponent(key)} /></AdminShell>;
}
