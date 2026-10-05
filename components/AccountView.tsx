"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch, supabaseBrowser } from "@/lib/supabase";
import { findPackage, findClass, classStart } from "@/lib/booking-shared";
import { buildIcs, downloadFile } from "@/lib/ics";
import { formatFullDay, parseISO } from "@/lib/dates";
import { formatIDR } from "@/data/packages";
import { defaultConfig, type SiteConfig } from "@/data/schedule";

type Booking = { id: string; class_key: string; status: "booked" | "waitlist"; mat: "studio" | "own" | null };
type Pack = { id: string; package_id: string; remaining: number; total: number; expires_at: string | null };
type Me = { email: string; credits: number; packs: Pack[]; bookings: Booking[]; profile: { full_name?: string } | null };
type History = {
  packs: (Pack & { created_at: string })[];
  bookings: { id: string; class_key: string; status: string; checked_in_at: string | null; created_at: string }[];
  orders: { id: string; package_id: string; amount: number; status: string; created_at: string }[];
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
// A class counts as past two hours after it starts
const isPast = (key: string) => classStart(key).getTime() + 2 * 3600_000 < Date.now();

export default function AccountView() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [hist, setHist] = useState<History | null>(null);
  const [msg, setMsg] = useState("");
  // The live timetable (the admin can change class names and teachers)
  const [cfg, setCfg] = useState<SiteConfig>(defaultConfig);
  useEffect(() => {
    fetch("/api/schedule").then((r) => (r.ok ? r.json() : null)).then((j) => j?.config && setCfg(j.config)).catch(() => {});
  }, []);
  const className = (key: string) => findClass(key, cfg)?.session.name ?? "Class";

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getSession();
    if (!data.session) return setMe(null);
    const r = await authFetch("/api/me");
    setMe(r.ok ? await r.json() : null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadHistory = useCallback(async () => {
    const r = await authFetch("/api/me/history");
    if (r.ok) setHist(await r.json());
  }, []);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  async function cancel(b: Booking) {
    const sure = window.confirm(b.status === "waitlist" ? "Leave the waitlist?" : "Cancel this booking? Your credit is returned only if it is more than 12 hours before class.");
    if (!sure) return;
    const r = await authFetch(`/api/bookings/${b.id}`, { method: "DELETE" });
    const j = await r.json();
    setMsg(!j.ok ? j.message : j.refunded ? "Cancelled. Your credit was returned." : "Cancelled.");
    load();
  }

  async function setMat(b: Booking, mat: "studio" | "own") {
    await authFetch(`/api/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ mat }) });
    load();
  }

  async function exportData() {
    const r = await authFetch("/api/me/export");
    if (r.ok) downloadFile("my-plot-twist-data.json", JSON.stringify(await r.json(), null, 2), "application/json");
    else setMsg("Could not download your data. Please try again.");
  }

  async function deleteAccount() {
    const sure = window.confirm("Delete your account? Your bookings are cancelled and any unused credits are lost. This cannot be undone.");
    if (!sure) return;
    const r = await authFetch("/api/me", { method: "DELETE", body: JSON.stringify({ confirm: true }) });
    if (r.ok) {
      await supabaseBrowser().auth.signOut();
      setMe(null);
      setMsg("");
    } else setMsg((await r.json().catch(() => ({}))).error ?? "Something went wrong.");
  }

  if (me === undefined) return <p className="muted">Loading…</p>;
  if (me === null)
    return (
      <div className="flow">
        <h1 className="h1 h1-page">My bookings</h1>
        <p className="lead">Log in to see your bookings and credits.</p>
        <div className="flow-actions">
          <Link href="/login?next=/account" className="btn btn-primary">Log in</Link>
          <Link href="/login?mode=signup&next=/account" className="btn btn-outline">Sign up</Link>
        </div>
      </div>
    );

  const upcoming = me.bookings.filter((b) => !isPast(b.class_key));

  return (
    <div className="flow">
      <div className="eyebrow">{me.profile?.full_name ?? me.email}</div>
      <h1 className="h1 h1-page">My bookings</h1>
      <div className="flow-card">
        <div className="card-title">{me.credits} {me.credits === 1 ? "class" : "classes"} left</div>
        {me.packs.map((p) => (
          <div key={p.id} className="muted small">
            {packName(p.package_id)}: {p.remaining} of {p.total} left · {p.expires_at ? `until ${fmtDate(p.expires_at)}` : "validity starts at your first booking"}
          </div>
        ))}
        <Link href="/packages" className="text-link">Buy a package</Link>
      </div>

      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "upcoming"} className={tab === "upcoming" ? "is-on" : ""} onClick={() => setTab("upcoming")}>Upcoming</button>
        <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "is-on" : ""} onClick={() => setTab("history")}>History</button>
      </div>
      {msg && <p className="flow-note" role="status">{msg}</p>}

      {tab === "upcoming" && (
        <>
          {upcoming.length === 0 && <p className="muted">Nothing booked yet. <Link href="/schedule" className="text-link">See the schedule</Link></p>}
          {upcoming.map((b) => {
            const [iso, time] = b.class_key.split("_");
            return (
              <div key={b.id} className="flow-card">
                <div className="flow-row">
                  <div>
                    <div className="card-title">{className(b.class_key)}</div>
                    <div className="muted small">{formatFullDay(parseISO(iso))} · {time} · {b.status === "waitlist" ? "On the waitlist" : "Booked"}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => cancel(b)}>{b.status === "waitlist" ? "Leave" : "Cancel"}</button>
                </div>
                <div className="flow-sep admin-actions">
                  <label className="small muted">Mat:{" "}
                    <select className="mat-select" value={b.mat ?? ""} onChange={(e) => setMat(b, e.target.value as "studio" | "own")}>
                      <option value="" disabled>Not chosen</option>
                      <option value="studio">Studio mat</option>
                      <option value="own">My own mat</option>
                    </select>
                  </label>
                  {b.status === "booked" && findClass(b.class_key, cfg) && (
                    <button className="text-link forgot" onClick={() => downloadFile("plot-twist-class.ics", buildIcs(b.class_key, findClass(b.class_key, cfg)!.session), "text/calendar")}>Add to calendar</button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {tab === "history" && <HistoryView hist={hist} className={className} />}

      <details className="data-details">
        <summary>Account settings</summary>
        <p className="muted small">
          Your data is covered by our <Link href="/privacy" className="text-link">Privacy Policy</Link>. You can download a copy of it, or delete your account.
        </p>
        <div className="data-links">
          <button onClick={exportData}>Download my data</button>
          <button onClick={deleteAccount}>Delete my account</button>
        </div>
      </details>
      <button className="text-link" onClick={async () => { await supabaseBrowser().auth.signOut(); setMe(null); }}>Log out</button>
    </div>
  );
}

const packName = (id: string) => findPackage(id)?.name ?? (id === "manual" ? "Added by studio" : id);

function HistoryView({ hist, className }: { hist: History | null; className: (key: string) => string }) {
  if (!hist) return <p className="muted">Loading…</p>;
  const now = Date.now();
  const packStatus = (p: Pack) =>
    p.remaining === 0 ? "Used up" : p.expires_at && new Date(p.expires_at).getTime() < now ? "Expired" : "Active";
  const past = hist.bookings.filter((b) => b.status === "cancelled" || isPast(b.class_key));
  const bookingLabel = (b: History["bookings"][number]) =>
    b.status === "cancelled" ? "Cancelled" : b.status === "waitlist" ? "Waitlist, no spot" : b.checked_in_at ? "Attended" : "Booked";

  return (
    <>
      <h2 className="h3">Packages</h2>
      {hist.packs.length === 0 && <p className="muted">No packages yet.</p>}
      {hist.packs.map((p) => (
        <div key={p.id} className="flow-card flow-row">
          <div>
            <div className="card-title">{packName(p.package_id)}</div>
            <div className="muted small">
              Bought {fmtDate(p.created_at)} · {p.total - p.remaining} of {p.total} used{p.expires_at ? ` · until ${fmtDate(p.expires_at)}` : ""}
            </div>
          </div>
          <span className={`chip ${packStatus(p) === "Active" ? "chip-pink" : ""}`}>{packStatus(p)}</span>
        </div>
      ))}

      <h2 className="h3">Classes</h2>
      {past.length === 0 && <p className="muted">No past classes yet.</p>}
      {past.map((b) => {
        const [iso, time] = b.class_key.split("_");
        return (
          <div key={b.id} className="flow-card flow-row">
            <div>
              <div className="card-title">{className(b.class_key)}</div>
              <div className="muted small">{formatFullDay(parseISO(iso))} · {time}</div>
            </div>
            <span className="chip">{bookingLabel(b)}</span>
          </div>
        );
      })}

      <h2 className="h3">Payments</h2>
      {hist.orders.length === 0 && <p className="muted">No payments yet.</p>}
      {hist.orders.map((o) => (
        <div key={o.id} className="flow-card flow-row">
          <div>
            <div className="card-title">{packName(o.package_id)}</div>
            <div className="muted small">{fmtDate(o.created_at)} · {o.status === "paid" ? "Paid" : o.status === "pending" ? "Waiting for payment" : "Expired"}</div>
          </div>
          <div className="price-sm">{formatIDR(o.amount)}</div>
        </div>
      ))}
    </>
  );
}
