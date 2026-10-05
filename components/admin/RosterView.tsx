"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { formatFullDay, parseISO } from "@/lib/dates";

type Person = { mat: "studio" | "own" | null; id: string; userId: string; status: string; checkedIn: boolean; name: string; whatsapp: string; email: string; pack: string };
type Data = { key: string; name: string; time: string; duration: string; teacher: string; iso: string; capacity: number; booked: Person[]; waitlist: Person[] };
type Member = { id: string; full_name: string | null; email: string | null; whatsapp: string | null; summary: string };

export default function RosterView({ classKey }: { classKey: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    const r = await authFetch(`/api/admin/classes/${encodeURIComponent(classKey)}`);
    if (r.ok) setD(await r.json());
  }, [classKey]);
  useEffect(() => { load(); }, [load]);

  async function act(url: string, init: RequestInit) {
    const r = await authFetch(url, init);
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "" : j.message ?? "Something went wrong.");
    load();
  }
  const cancel = (p: Person) =>
    window.confirm(`Cancel ${p.name}? Their credit goes back.`) && act(`/api/admin/bookings/${p.id}`, { method: "DELETE" });
  const copyNumbers = async () => {
    await navigator.clipboard.writeText(d!.booked.map((p) => p.whatsapp).filter(Boolean).join(", "));
    setMsg("WhatsApp numbers copied.");
  };

  if (!d) return <p className="muted">Loading…</p>;
  const full = d.booked.length >= d.capacity;
  const checked = d.booked.filter((p) => p.checkedIn).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin" className="muted small">← Today</Link>
          <h1 className="admin-title">{d.name} · {d.time}</h1>
          <div className="muted">{formatFullDay(parseISO(d.iso))} · {d.duration} · {d.teacher}</div>
        </div>
        <div className="admin-actions">
          <span className={`chip ${full ? "chip-dark" : ""}`}>{full ? "Full · " : ""}{d.booked.length} of {d.capacity}</span>
          <span className="chip chip-pink">Studio mats: {d.booked.filter((p) => p.mat === "studio").length}</span>
          <button className="btn btn-outline btn-sm" onClick={() => setAdding(!adding)}>Add person</button>
          <button className="btn btn-primary btn-sm" onClick={copyNumbers}>Copy WhatsApp numbers</button>
        </div>
      </div>
      {msg && <p className="flow-note" role="status">{msg}</p>}
      {adding && <AddPerson classKey={classKey} onDone={(m) => { setMsg(m); setAdding(false); load(); }} />}

      <div className="admin-panel">
        <div className="admin-between"><h2 className="h3">Booked · {d.booked.length}</h2><span className="muted small">Tick people as they arrive. {checked} of {d.booked.length} checked in.</span></div>
        {d.booked.length === 0 && <p className="muted">Nobody yet.</p>}
        {d.booked.map((p) => (
          <div className="admin-row" key={p.id}>
            <button className={`tick ${p.checkedIn ? "is-on" : ""}`} aria-label={`Check in ${p.name}`} aria-pressed={p.checkedIn}
              onClick={() => act(`/api/admin/bookings/${p.id}`, { method: "PATCH", body: JSON.stringify({ action: p.checkedIn ? "uncheckin" : "checkin" }) })}>{p.checkedIn ? "✓" : ""}</button>
            <div className="grow"><b>{p.name}</b><div className="muted small">{p.whatsapp}</div></div>
            <span className={`chip ${p.mat === "studio" ? "chip-pink" : ""}`}>{p.mat === "studio" ? "Studio mat" : p.mat === "own" ? "Own mat" : "Mat ?"}</span>
            <div className="admin-pack">{p.pack}</div>
            <button className="text-link" onClick={() => cancel(p)}>Cancel</button>
          </div>
        ))}

        <h2 className="h3 admin-gap">Waitlist · {d.waitlist.length}</h2>
        {d.waitlist.length === 0 && <p className="muted">Nobody on the waitlist.</p>}
        {d.waitlist.map((p, i) => (
          <div className="admin-row" key={p.id}>
            <div className="admin-time">#{i + 1}</div>
            <div className="grow"><b>{p.name}</b><div className="muted small">{p.whatsapp}</div></div>
            <div className="admin-pack">{p.pack}</div>
            <button className="btn btn-outline btn-sm" onClick={() => act(`/api/admin/bookings/${p.id}`, { method: "PATCH", body: JSON.stringify({ action: "promote" }) })}>Move up</button>
            <button className="text-link" onClick={() => cancel(p)}>Remove</button>
          </div>
        ))}
      </div>
    </>
  );
}

function AddPerson({ classKey, onDone }: { classKey: string; onDone: (msg: string) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Member[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setList([]);
    const t = setTimeout(async () => {
      const r = await authFetch(`/api/admin/members?q=${encodeURIComponent(q)}`);
      if (r.ok) setList((await r.json()).members);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  async function add(m: Member) {
    const r = await authFetch("/api/admin/bookings", { method: "POST", body: JSON.stringify({ classKey, memberId: m.id }) });
    const j = await r.json();
    onDone(r.ok ? `${m.full_name ?? m.email} added${j.status === "waitlist" ? " to the waitlist" : ""}.` : j.message);
  }
  return (
    <div className="admin-panel">
      <label className="field">Find a member<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or WhatsApp" autoFocus /></label>
      {list.map((m) => (
        <div className="admin-row" key={m.id}>
          <div className="grow"><b>{m.full_name ?? m.email}</b><div className="muted small">{m.summary}</div></div>
          <button className="btn btn-primary btn-sm" onClick={() => add(m)}>Add</button>
        </div>
      ))}
      <p className="muted small">Uses the member&apos;s own credit. If they have none, add one on their member page first.</p>
    </div>
  );
}
