"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { formatFullDay, parseISO } from "@/lib/dates";
import { formatIDR } from "@/data/packages";
import { packLabel } from "@/lib/booking-shared";

type Member = { id: string; full_name: string | null; email: string | null; whatsapp: string | null; summary: string };
type Pack = { id: string; package_id: string; total: number; remaining: number; expires_at: string | null; valid_days: number | null };
type Detail = {
  profile: { id: string; full_name: string | null; email: string | null; whatsapp: string | null; created_at: string; marketing_opt_in: boolean };
  packs: Pack[];
  bookings: { id: string; class_key: string; status: string; created_at: string }[];
  orders: { id: string; package_id: string; amount: number; status: string; created_at: string }[];
  adjustments: { id: string; delta: number; reason: string; admin_email: string | null; created_at: string }[];
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function MembersView() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Member[]>([]);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await authFetch(`/api/admin/members?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        const m = (await r.json()).members as Member[];
        setList(m);
        setSel((s) => s ?? m[0]?.id ?? null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="admin-split">
      <div className="admin-panel admin-list">
        <h1 className="admin-title small-title">Members</h1>
        <label className="field"><span className="sr-only">Search</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or WhatsApp" /></label>
        {list.map((m) => (
          <button key={m.id} className={`admin-member ${sel === m.id ? "is-on" : ""}`} onClick={() => setSel(m.id)}>
            <b>{m.full_name ?? m.email ?? "Member"}</b>
            <span className="muted small">{m.summary}</span>
          </button>
        ))}
        {list.length === 0 && <p className="muted">No members found.</p>}
      </div>
      <div className="admin-detail">{sel ? <MemberDetail id={sel} key={sel} /> : <p className="muted">Pick a member.</p>}</div>
    </div>
  );
}

function MemberDetail({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [n, setN] = useState(1);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await authFetch(`/api/admin/members/${id}`);
    if (r.ok) setD(await r.json());
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function apply(sign: 1 | -1) {
    const r = await authFetch(`/api/admin/members/${id}/credits`, { method: "POST", body: JSON.stringify({ delta: sign * n, reason }) });
    const j = await r.json();
    setMsg(r.ok ? "Saved." : j.message);
    if (r.ok) { setReason(""); setN(1); load(); }
  }

  if (!d) return <p className="muted">Loading…</p>;
  const now = Date.now();
  const active = d.packs.filter((p) => p.remaining > 0 && (!p.expires_at || new Date(p.expires_at).getTime() > now));
  const total = active.reduce((s, p) => s + p.remaining, 0);
  const wa = (d.profile.whatsapp ?? "").replace(/\D/g, "");

  type Ev = { at: string; text: string; right: string };
  const events: Ev[] = [
    ...d.bookings.map((b) => { const [iso, t] = b.class_key.split("_"); return { at: b.created_at, text: `${b.status === "cancelled" ? "Cancelled" : b.status === "waitlist" ? "Waitlist" : "Booked"} · ${formatFullDay(parseISO(iso))} ${t}`, right: "" }; }),
    ...d.orders.map((o) => ({ at: o.created_at, text: `${o.status === "paid" ? "Paid" : "Order (" + o.status + ")"} · ${packLabel(o.package_id)}`, right: formatIDR(o.amount) })),
    ...d.adjustments.map((a) => ({ at: a.created_at, text: `Credits ${a.delta > 0 ? "+" : ""}${a.delta} · ${a.reason}`, right: a.admin_email ?? "" })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">{d.profile.full_name ?? d.profile.email}</h1>
          <div className="muted">{d.profile.email} · {d.profile.whatsapp} · Joined {fmtDate(d.profile.created_at)}{d.profile.marketing_opt_in ? " · OK to send news" : ""}</div>
        </div>
        {wa && <a className="btn btn-outline btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noopener">Message on WhatsApp</a>}
      </div>
      <div className="admin-cols">
        <div className="admin-stat grow">
          <div className="eyebrow muted">Credits</div>
          <div className="admin-stat-v">{total} left</div>
          {active.length === 0 && <div className="muted small">No active packages.</div>}
          {active.map((p) => (
            <div key={p.id} className="muted small">
              {packLabel(p.package_id)}: {p.remaining} of {p.total}
              {p.expires_at ? ` · until ${fmtDate(p.expires_at)}` : " · starts at first booking"}
            </div>
          ))}
        </div>
        <div className="admin-panel admin-adjust">
          <b>Adjust credits</b>
          <div className="admin-row">
            <input type="number" min={1} max={50} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value)))} aria-label="Number of credits" className="admin-num" />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason" className="grow admin-input" />
          </div>
          <div className="admin-row">
            <button className="btn btn-primary btn-sm" onClick={() => apply(1)}>Add</button>
            <button className="btn btn-outline btn-sm" onClick={() => apply(-1)}>Remove</button>
            <span className="muted small">{msg || "Saved in the history below."}</span>
          </div>
        </div>
      </div>
      <div className="admin-panel">
        <h2 className="h3">History</h2>
        {events.length === 0 && <p className="muted">Nothing yet.</p>}
        {events.map((e, i) => (
          <div className="admin-row" key={i}>
            <div className="grow">{e.text}</div>
            <div className="muted small">{fmtDate(e.at)}</div>
            <div className="admin-pack">{e.right}</div>
          </div>
        ))}
      </div>
    </>
  );
}
