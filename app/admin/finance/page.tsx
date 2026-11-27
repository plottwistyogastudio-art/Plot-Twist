import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import FinanceView from "@/components/admin/FinanceView";

export const metadata: Metadata = { title: "Finance", robots: { index: false } };

export default function FinancePage() {
  return <AdminShell><FinanceView /></AdminShell>;
}
