"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/BookingFlow";

export default function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";
  const next = params.get("next");
  // Only allow redirects inside this site
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const dest = safe ?? (signup ? "/schedule" : "/account");
  return (
    <div className="flow">
      <h1 className="h1 h1-page">{signup ? "Create account" : "Log in"}</h1>
      <AuthForm startMode={signup ? "signup" : "signin"} onDone={() => router.push(dest)} />
    </div>
  );
}
