"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { formatIDR } from "@/data/packages";
import { MONTHS } from "@/lib/dates";

type FeeClass = {
  key: string; date: string; weekday: string; time: string; name: string; type: string;
  booked: number; attended: number; fee: number; manual: boolean; substitute: boolean;
};
type Coach = {
  id: string; name: string; rate: { base: number; perHead: number };
  classes: FeeClass[];
  totals: { classes: number; booked: number; attended: number; fee: number };
};
type Report = {
  month: string; basis: "checked" | "booked"; coaches: Coach[];
  totals: { classes: number; booked: number; attended: number; fee: number; coaches: number };
  cancelled: number; upcoming: number; noCheckins: number;
};

const FIRST_MONTH = "2026-10"; // studio opened 15 Oct 2026
const jakartaMonth = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
function shift(ym: string, by: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}
const label = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const shortDate = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;

export default function CoachFeesView() {
  const [month, setMonth] = useState(jakartaMonth());
  const [basis, setBasis] = useState<"checked" | "booked">("checked");
  const [data, setData] = useState<Report | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { base: string; perHead: string }>>({});
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const r = await authFetch(`/api/admin/coach-fees?month=${month}&basis=${basis}`);
    if (!r.ok) return setMsg("Could not load the report.");
    const j: Report = await r.json();
    setData(j);
    setDrafts(Object.fromEntries(j.coaches.filter((c) => c.id).map((c) => [c.id, { base: String(c.rate.base), perHead: String(c.rate.perHead) }])));
  }, [month, basis]);
  useEffect(() => { setData(null); load(); }, [load]);

  async function post(body: object, ok: string) {
    const r = await authFetch("/api/admin/coach-fees", { method: "POST", body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? ok : j.error ?? "Something went wrong.");
    if (r.ok) load();
  }

  const saveRate = (c: Coach) => {
    const d = drafts[c.id];
    if (!d) return;
    post({ action: "rate", teacherId: c.id, base: d.base || "0", perHead: d.perHead || "0" }, `Rate saved for ${c.name}.`);
  };

  function editFee(c: FeeClass) {
    const v = window.prompt(
      `Fee for ${c.name}, ${shortDate(c.date)} ${c.time} (IDR).\nLeave empty to go back to the coach's rate.`,
      c.manual ? String(c.fee) : "",
    );
    if (v === null) return;
    post({ action: "override", key: c.key, amount: v.trim() === "" ? null : v.replace(/[^\d]/g, "") }, v.trim() === "" ? "Back to the coach's rate." : "Fee changed for this class.");
  }

  function downloadCsv() {
    if (!data) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Coach", "Date", "Day", "Time", "Class", "Booked", "Attended", "Fee (IDR)", "Note"].map(esc).join(",")];
    for (const c of data.coaches) {
      for (const k of c.classes) lines.push([c.name, k.date, k.weekday, k.time, k.name, k.booked, k.attended, k.fee, k.manual ? "manual fee" : k.substitute ? "cover" : ""].map(esc).join(","));
      if (c.classes.length) lines.push([`${c.name} TOTAL`, "", "", "", `${c.totals.classes} classes`, c.totals.booked, c.totals.attended, c.totals.fee, ""].map(esc).join(","));
    }
    lines.push(["ALL COACHES TOTAL", "", "", "", `${data.totals.classes} classes`, data.totals.booked, data.totals.attended, data.totals.fee, ""].map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coach-fees-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Coach fees</h1>
        <div className="admin-actions">
          <button className="btn btn-outline btn-sm" disabled={month <= FIRST_MONTH} onClick={() => setMonth(shift(month, -1))} aria-label="Previous month">←</button>
          <b className="fee-month">{label(month)}</b>
          <button className="btn btn-outline btn-sm" disabled={month >= jakartaMonth()} onClick={() => setMonth(shift(month, 1))} aria-label="Next month">→</button>
          <button className="btn btn-outline btn-sm" onClick={downloadCsv} disabled={!data}>Download CSV</button>
        </div>
      </div>

      {msg && <p className="flow-note" role="status">{msg}</p>}

      <div className="chip-row chip-row-sm fee-basis">
        <span className="chip-label">Count fee by</span>
        <button className={`chip chip-type ${basis === "checked" ? "is-on" : ""}`} onClick={() => setBasis("checked")}>Checked in</button>
        <button className={`chip chip-type ${basis === "booked" ? "is-on" : ""}`} onClick={() => setBasis("booked")}>Booked</button>
      </div>
      <p className="muted small">The per-person part of a fee uses {basis === "checked" ? "people you ticked off in the class roster" : "everyone who booked a spot (waitlist not counted)"}. A fixed fee per class ignores this.</p>

      {!data && <p className="muted">Loading…</p>}

      {data && (
        <>
          <div className="admin-stats">
            <div className="admin-stat"><div className="muted small">Classes taught</div><div className="admin-stat-v">{data.totals.classes}</div></div>
            <div className="admin-stat"><div className="muted small">Attended / booked</div><div className="admin-stat-v">{data.totals.attended} / {data.totals.booked}</div></div>
            <div className="admin-stat"><div className="muted small">Coaches</div><div className="admin-stat-v">{data.totals.coaches}</div></div>
            <div className="admin-stat"><div className="muted small">Total fees</div><div className="admin-stat-v">{formatIDR(data.totals.fee)}</div></div>
          </div>

          {data.noCheckins > 0 && (
            <div className="admin-note is-warn">
              <b>{data.noCheckins} past {data.noCheckins === 1 ? "class has" : "classes have"} bookings but no check-ins.</b>
              <span className="small">Tick people off in the class roster, or switch to “Booked” above, otherwise the per-person fee for those classes is 0.</span>
            </div>
          )}
          {(data.cancelled > 0 || data.upcoming > 0) && (
            <p className="muted small">
              {data.cancelled > 0 && `${data.cancelled} cancelled ${data.cancelled === 1 ? "class is" : "classes are"} not paid. `}
              {data.upcoming > 0 && `${data.upcoming} later ${data.upcoming === 1 ? "class has" : "classes have"} not started yet and will be counted once they have.`}
            </p>
          )}

          {data.coaches.map((c) => {
            const d = drafts[c.id];
            const dirty = !!d && (d.base !== String(c.rate.base) || d.perHead !== String(c.rate.perHead));
            const show = open[c.id] ?? c.totals.classes > 0;
            return (
              <section className="admin-panel fee-coach" key={c.id || "none"}>
                <div className="admin-between">
                  <div>
                    <b className="fee-name">{c.name}</b>
                    <div className="muted small">{c.totals.classes} {c.totals.classes === 1 ? "class" : "classes"} · {c.totals.attended} attended · {c.totals.booked} booked</div>
                  </div>
                  <div className="fee-total">{formatIDR(c.totals.fee)}</div>
                </div>

                {c.id && d && (
                  <div className="fee-rate">
                    <label className="small muted">Fee per class
                      <input className="admin-input" inputMode="numeric" value={d.base} onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...d, base: e.target.value.replace(/\D/g, "") } })} />
                    </label>
                    <label className="small muted">+ per person
                      <input className="admin-input" inputMode="numeric" value={d.perHead} onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...d, perHead: e.target.value.replace(/\D/g, "") } })} />
                    </label>
                    <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={() => saveRate(c)}>Save rate</button>
                    {c.rate.base === 0 && c.rate.perHead === 0 && <span className="chip chip-pink">No rate set</span>}
                  </div>
                )}

                {c.classes.length > 0 && (
                  <button className="text-link fee-toggle" onClick={() => setOpen({ ...open, [c.id]: !show })}>{show ? "Hide classes" : "Show classes"}</button>
                )}

                {show && c.classes.map((k) => (
                  <div className="admin-row fee-row" key={k.key}>
                    <div className="fee-date"><b>{shortDate(k.date)}</b><div className="muted small">{k.weekday}</div></div>
                    <div className="admin-time">{k.time}</div>
                    <div className="grow">{k.name}
                      <div className="muted small">{k.type}{k.substitute ? " · cover" : ""}</div>
                    </div>
                    <div className="fee-num"><b>{k.attended}</b><div className="muted small">of {k.booked} booked</div></div>
                    <div className="fee-amt">
                      {formatIDR(k.fee)}
                      {k.manual && <div className="muted small">manual</div>}
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => editFee(k)}>Edit</button>
                  </div>
                ))}
                {c.classes.length === 0 && <p className="muted small">No classes taught this month yet.</p>}
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
