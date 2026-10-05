import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import MembersView from "@/components/admin/MembersView";

export const metadata: Metadata = { title: "Members", robots: { index: false } };

export default function MembersPage() {
  return <AdminShell><MembersView /></AdminShell>;
}
