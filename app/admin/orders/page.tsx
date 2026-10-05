import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import OrdersView from "@/components/admin/OrdersView";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default function OrdersPage() {
  return <AdminShell><OrdersView /></AdminShell>;
}
