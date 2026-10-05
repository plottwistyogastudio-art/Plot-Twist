"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch, supabaseBrowser } from "@/lib/supabase";

const items = [
  { href: "/admin", label: "Today" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/orders", label: "Orders" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState<"loading" | "signedout" | "denied" | "ok">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser().auth.getSession();
      if (!data.session) return setState("signedout");
      const r = await authFetch("/api/admin/me");
      if (!r.ok) return setState("denied");
      setEmail((await r.json()).email);
      setState("ok");
    })();
  }, []);

  if (state === "loading") return <div className="admin-center muted">Loading…</div>;
  if (state === "signedout")
    return (
      <div className="admin-center">
        <h1 className="h2">Studio admin</h1>
        <p className="muted">Sign in with your admin account.</p>
        <Link href="/login?next=/admin" className="btn btn-primary">Sign in</Link>
      </div>
    );
  if (state === "denied")
    return (
      <div className="admin-center">
        <h1 className="h2">No access</h1>
        <p className="muted">This account is not on the admin list.</p>
        <Link href="/" className="btn btn-outline">Back to the website</Link>
      </div>
    );

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-brand">Plot Twist<span>Studio admin</span></div>
        <nav>
          {items.map((i) => {
            const on = i.href === "/admin" ? path === "/admin" || path.startsWith("/admin/classes") : path.startsWith(i.href);
            return <Link key={i.href} href={i.href} className={on ? "is-on" : ""}>{i.label}</Link>;
          })}
        </nav>
        <div className="admin-foot">
          <div>{email}</div>
          <Link href="/">View website</Link>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
