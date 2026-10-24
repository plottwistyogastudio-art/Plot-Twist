import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import PromosView from "@/components/admin/PromosView";

export const metadata: Metadata = { title: "Promo codes", robots: { index: false } };

export default function PromosPage() {
  return <AdminShell><PromosView /></AdminShell>;
}
