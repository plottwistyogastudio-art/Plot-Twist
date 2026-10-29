"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch, supabaseBrowser } from "@/lib/supabase";
import { packLabel, findClass, classStart } from "@/lib/booking-shared";
import { buildIcs, downloadFile } from "@/lib/ics";
import { formatFullDay, parseISO } from "@/lib/dates";
import { formatIDR } from "@/data/packages";
import { REFERRAL_DISCOUNT_PCT, REFERRAL_FRIENDS_PER_REWARD, REFERRAL_REWARD_CLASSES, REFERRAL_REWARD_VALID_DAYS } from "@/data/referral";
import { defaultConfig, type SiteConfig } from "@/data/schedule";

type Booking = { id: string; class_key: string; status: "booked" | "waitlist"; mat: "studio" | "own" | null };
type Pack = { id: string; package_id: string; remaining: number; total: number; expires_at: string | null };
type Referral = { hasPaid?: boolean; code: string | null; qualified: number; rewards: number; untilNext: number; referredBy: boolean };
type Profile = { full_name?: string | null; whatsapp?: string | null; marketing_opt_in?: boolean | null };
type Me = { email: string; credits: number; packs: Pack[]; bookings: Booking[]; profile: Profile | null; referral?: Referral | null };
type History = {
  packs: (Pack & { created_at: string })[];
  bookings: { id: string; class_key: string; status: string; checked_in_at: string | null; created_at: string }[];
  orders: { id: string; package_id: string; amount: number; status: string; created_at: string }[];
};
type Tab = "bookings" | "packages" | "history" | "profile";
const TABS: { id: Tab; label: string }[] = [
  { id: "bookings", label: "Bookings" }, { id: "packages", label: "Packages" },
  { id: "history", label: "History" }, { id: "profile", label: "Profile" },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
// A class counts as past two hours after it starts
const isPast = (key: string) => classStart(key).getTime() + 2 * 3600_000 < Date.now();

export default function AccountView() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("bookings");
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
  useEffect(() => { if (me) loadHistory(); }, [me?.email, loadHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open a tab from the link (/account#profile)
  useEffect(() => {
    const h = window.location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);
  const go = (t: Tab) => { setTab(t); setMsg(""); history.replaceState(null, "", `#${t}`); };

  async function cancel(b: Booking) {
    const sure = window.confirm(b.status === "waitlist" ? "Leave the waitlist?" : "Cancel this booking? Your credit is returned only if it is more than 12 hours before class.");
    if (!sure) return;
    const r = await authFetch(`/api/bookings/${b.id}`, { method: "DELETE" });
    const j = await r.json();
    setMsg(!j.ok ? j.message : j.refunded ? "Cancelled. Your credit was returned." : "Cancelled.");
    load(); loadHistory();
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
        <h1 className="h1 h1-page">My account</h1>
        <p className="lead">Log in to see your bookings, packages and details.</p>
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
      <h1 className="h1 h1-page">My account</h1>

      <div className="acc-stats">
        <button type="button" className="acc-stat" onClick={() => go("packages")}>
          <span className="acc-stat-v">{me.credits}</span>
          <span className="muted small">{me.credits === 1 ? "class" : "classes"} left</span>
        </button>
        <button type="button" className="acc-stat" onClick={() => go("bookings")}>
          <span className="acc-stat-v">{upcoming.length}</span>
          <span className="muted small">upcoming</span>
        </button>
      </div>

      <div className="seg seg-4" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => go(t.id)}>{t.label}</button>
        ))}
      </div>
      {msg && <p className="flow-note" role="status">{msg}</p>}

      {tab === "bookings" && (
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
          {upcoming.length > 0 && <Link href="/schedule" className="text-link">Book another class</Link>}
        </>
      )}

      {tab === "packages" && <PackagesView me={me} hist={hist} />}
      {tab === "history" && <HistoryView hist={hist} className={className} />}

      {tab === "profile" && (
        <>
          <ProfileForm me={me} onSaved={load} />
          <PasswordForm />
          {me.referral?.code && <ReferralCard r={me.referral} />}
          {me.referral && !me.referral.code && (
            <div className="flow-card">
              <div className="eyebrow">Invite a friend</div>
              <div className="card-title">Unlock your referral code</div>
              <p className="muted small">Your personal code appears here after your first package. Invite {REFERRAL_FRIENDS_PER_REWARD} new members and get {REFERRAL_REWARD_CLASSES} free {REFERRAL_REWARD_CLASSES === 1 ? "class" : "classes"}.</p>
            </div>
          )}
          <details className="data-details">
            <summary>Your data</summary>
            <p className="muted small">
              Your data is covered by our <Link href="/privacy" className="text-link">Privacy Policy</Link>. You can download a copy of it, or delete your account.
            </p>
            <div className="data-links">
              <button onClick={exportData}>Download my data</button>
              <button onClick={deleteAccount}>Delete my account</button>
            </div>
          </details>
        </>
      )}
      <button className="text-link" onClick={async () => { await supabaseBrowser().auth.signOut(); setMe(null); }}>Log out</button>
    </div>
  );
}

function ProfileForm({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const [name, setName] = useState(me.profile?.full_name ?? "");
  const [wa, setWa] = useState(me.profile?.whatsapp ?? "");
  const [marketing, setMarketing] = useState(!!me.profile?.marketing_opt_in);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setNote(null);
    const r = await authFetch("/api/me", { method: "PATCH", body: JSON.stringify({ fullName: name, whatsapp: wa, marketing }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setNote({ ok: true, text: "Saved." }); onSaved(); }
    else setNote({ ok: false, text: j.error ?? "Could not save. Please try again." });
  }

  return (
    <form className="flow-card acc-form" onSubmit={save}>
      <div className="card-title">My details</div>
      <label className="field">Full name<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
      <label className="field">WhatsApp number<input required type="tel" placeholder="+62 ..." value={wa} onChange={(e) => setWa(e.target.value)} autoComplete="tel" /></label>
      <p className="muted small acc-hint">Class reminders and updates are sent to this number.</p>
      <label className="field">Email<input value={me.email} disabled readOnly /></label>
      <p className="muted small acc-hint">To change your email, please message the studio.</p>
      <label className="check"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
        <span>Send me studio news and offers.</span></label>
      {note && <p className={note.ok ? "flow-note" : "flow-error"} role="status">{note.text}</p>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}

function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    if (pw !== pw2) return setNote({ ok: false, text: "The two passwords are not the same." });
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setNote({ ok: false, text: error.message });
    setPw(""); setPw2("");
    setNote({ ok: true, text: "Password changed." });
  }

  if (!open) return <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(true)}>Change password</button>;
  return (
    <form className="flow-card acc-form" onSubmit={save}>
      <div className="card-title">Change password</div>
      <label className="field">New password<input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
      <label className="field">Repeat the password<input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
      {note && <p className={note.ok ? "flow-note" : "flow-error"} role="status">{note.text}</p>}
      <div className="admin-actions">
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { setOpen(false); setNote(null); }}>Close</button>
      </div>
    </form>
  );
}

const packName = packLabel;

function packStatus(p: Pack) {
  return p.remaining === 0 ? "Used up" : p.expires_at && new Date(p.expires_at).getTime() < Date.now() ? "Expired" : "Active";
}

function PackagesView({ me, hist }: { me: Me; hist: History | null }) {
  const past = (hist?.packs ?? []).filter((p) => packStatus(p) !== "Active");
  return (
    <>
      <div className="flow-card">
        <div className="card-title">{me.credits} {me.credits === 1 ? "class" : "classes"} left</div>
        {me.packs.length === 0 && <div className="muted small">No active package. Buy one to start booking.</div>}
        <Link href="/packages" className="text-link">Buy a package</Link>
      </div>
      {me.packs.map((p) => (
        <div key={p.id} className="flow-card">
          <div className="flow-row">
            <div>
              <div className="card-title">{packName(p.package_id)}</div>
              <div className="muted small">{p.remaining} of {p.total} left · {p.expires_at ? `until ${fmtDate(p.expires_at)}` : "validity starts at your first booking"}</div>
            </div>
            <span className="chip chip-pink">Active</span>
          </div>
        </div>
      ))}
      {past.length > 0 && <h2 className="h3">Used and expired</h2>}
      {past.map((p) => (
        <div key={p.id} className="flow-card flow-row">
          <div>
            <div className="card-title">{packName(p.package_id)}</div>
            <div className="muted small">Bought {fmtDate(p.created_at)} · {p.total - p.remaining} of {p.total} used{p.expires_at ? ` · until ${fmtDate(p.expires_at)}` : ""}</div>
          </div>
          <span className="chip">{packStatus(p)}</span>
        </div>
      ))}
    </>
  );
}

function HistoryView({ hist, className }: { hist: History | null; className: (key: string) => string }) {
  if (!hist) return <p className="muted">Loading…</p>;
  const past = hist.bookings.filter((b) => b.status === "cancelled" || isPast(b.class_key));
  const bookingLabel = (b: History["bookings"][number]) =>
    b.status === "cancelled" ? "Cancelled" : b.status === "waitlist" ? "Waitlist, no spot" : b.checked_in_at ? "Attended" : "Booked";

  return (
    <>
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

function ReferralCard({ r }: { r: Referral }) {
  const [copied, setCopied] = useState("");
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/book?ref=${r.code}`;
  const text = `Join me at Plot Twist Studio! Use my code ${r.code} for ${REFERRAL_DISCOUNT_PCT}% off your first regular package: ${link}`;
  async function copy(what: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(what); setTimeout(() => setCopied(""), 2000); } catch { /* ignore */ }
  }
  const cls = REFERRAL_REWARD_CLASSES === 1 ? "free class" : "free classes";
  return (
    <div className="flow-card ref-card">
      <div className="eyebrow">Invite a friend</div>
      <div className="card-title">Your code: {r.code}</div>
      <p className="muted small">
        Your friend gets {REFERRAL_DISCOUNT_PCT}% off their first regular package (not combinable with First Plot). When {REFERRAL_FRIENDS_PER_REWARD} new members you invited have paid for their first package, you get {REFERRAL_REWARD_CLASSES} {cls} (valid {REFERRAL_REWARD_VALID_DAYS} days).
      </p>
      <p className="small"><b>{r.qualified}</b> {r.qualified === 1 ? "friend" : "friends"} joined · {r.rewards} {r.rewards === 1 ? "reward" : "rewards"} earned · {r.untilNext} more for the next one</p>
      <div className="admin-actions">
        <button className="btn btn-outline btn-sm" onClick={() => copy("code", r.code!)}>{copied === "code" ? "Copied" : "Copy code"}</button>
        <button className="btn btn-outline btn-sm" onClick={() => copy("link", link)}>{copied === "link" ? "Copied" : "Copy link"}</button>
        <a className="btn btn-primary btn-sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
      </div>
    </div>
  );
}
