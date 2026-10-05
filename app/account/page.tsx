import type { Metadata } from "next";
import AccountView from "@/components/AccountView";

export const metadata: Metadata = { title: "My bookings" };

export default function AccountPage() {
  return (
    <section className="container page flow-page">
      <AccountView />
    </section>
  );
}
