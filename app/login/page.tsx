import type { Metadata } from "next";
import { Suspense } from "react";
import LoginView from "@/components/LoginView";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <section className="container page flow-page">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <LoginView />
      </Suspense>
    </section>
  );
}
