import type { Metadata } from "next";
import ResetPasswordView from "@/components/ResetPasswordView";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <section className="container page flow-page">
      <ResetPasswordView />
    </section>
  );
}
