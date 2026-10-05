"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { nav } from "@/data/site";
import { supabaseBrowser } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // null = still checking, so the buttons do not flash
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    setOpen(false);
    await supabaseBrowser().auth.signOut();
    router.push("/");
  }

  const link = (href: string, label: string) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={active ? "nav-link is-active" : "nav-link"}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" aria-label="Plot Twist home" className="logo-link" onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="Plot Twist" width={88} height={56} priority />
        </Link>

        <nav className={`nav ${open ? "is-open" : ""}`} aria-label="Main">
          {nav.map((item) => link(item.href, item.label))}
          {signedIn === true && (
            <>
              {link("/account", "My bookings")}
              <button type="button" className="nav-link nav-plain" onClick={logout}>Log out</button>
            </>
          )}
          {signedIn === false && (
            <>
              <Link href="/login" className="nav-link" onClick={() => setOpen(false)}>Log in</Link>
              <Link href="/login?mode=signup" className="nav-link" onClick={() => setOpen(false)}>Sign up</Link>
            </>
          )}
          <a href="/schedule" className="btn btn-primary nav-book">
            Book now
          </a>
        </nav>

        <button
          type="button"
          className="menu-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </header>
  );
}
