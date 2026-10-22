"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { formatIDR } from "@/data/packages";
import { MONTHS } from "@/lib/dates";

type Rate = { mode: "flat" | "percent"; base: number; perHead: number; threshold: number; percent: number };
type FeeClass = {
  key: string; date: string; weekday: string; time: string; name: string; type: string;
  booked: number; attended: number; people: number; peopleEdited: boolean;
  fee: number; manual: boolean; substitute: boolean;
};
type Coach = {
  id: string; name: string; rate: Rate;
  classes: FeeClass[];
  totals: { classes: number; booked: number; people: number; fee: number };
};
type Report = {
  month: string; basis: "checked" | "booked"; dropIn: number; coaches: Coach[];
  totals: { classes: number; booked: number; people: number; fee: number; coaches: number };
  cancelled: number; upcoming: number; noCheckins: number;
};
type Draft = { mode: "flat" | "percent"; base: string; perHead: string; threshold: string; percent: string };

const FIRST_MONTH = "2026-10"; // studio opened 15 Oct 2026
const jakartaMonth = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
function shift(ym: string, by: number) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}
const label = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const shortDate = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
const toDraft = (r: Rate): Draft => ({ mode: r.mode, base: String(r.base), perHead: String(r.perHead), threshold: String(r.threshold), percent: String(r.percent) });
const rateText = (r: Rate) =>
  r.mode === "percent" ? `${r.percent}% of drop-in per person` : `${formatIDR(r.base)} per class + ${formatIDR(r.perHead)} for each person above ${r.threshold}`;

export default function CoachFeesView() {
  const [month, setMonth] = useState(jakartaMonth());
  const [basis, setBasis] = useState<"checked" | "booked">("checked");
  const [data, setData] = useState<Report | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dropIn, setDropIn] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const r = await authFetch(`/api/admin/coach-fees?month=${month}&basis=${basis}`);
    if (!r.ok) return setMsg("Could not load the report.");
    const j: Report = await r.json();
    setData(j);
    setDropIn(String(j.dropIn));
    setDrafts(Object.fromEntries(j.coaches.filter((c) => c.id).map((c) => [c.id, toDraft(c.rate)])));
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
    post({ action: "rate", teacherId: c.id, mode: d.mode, base: d.base || "0", perHead: d.perHead || "0", threshold: d.threshold || "0", percent: d.percent || "0" }, `Rate saved for ${c.name}.`);
  };
  const setDraft = (id: string, patch: Partial<Draft>) => setDrafts({ ...drafts, [id]: { ...drafts[id], ...patch } });

  function editPeople(c: FeeClass) {
    const v = window.prompt(
      `How many people were in ${c.name}, ${shortDate(c.date)} ${c.time}?\n\nThe app counted ${c.attended} checked in and ${c.booked} booked. Type the real number (include manual bookings). Leave empty to use the app's count.`,
      c.peopleEdited ? String(c.people) : "",
    );
    if (v === null) return;
    const t = v.trim();
    post({ action: "people", key: c.key, count: t === "" ? null : t.replace(/[^\d]/g, "") }, t === "" ? "Back to the app's count." : "Number of people saved.");
  }

  function editFee(c: FeeClass) {
    const v = window.prompt(
      `Fee for ${c.name}, ${shortDate(c.date)} ${c.time} (IDR).\nLeave empty to go back to the coach's rate.`,
      c.manual ? String(c.fee) : "",
    );
    if (v === null) return;
    const t = v.trim();
    post({ action: "override", key: c.key, amount: t === "" ? null : t.replace(/[^\d]/g, "") }, t === "" ? "Back to the coach's rate." : "Fee changed for this class.");
  }

  function downloadCsv() {
    if (!data) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Coach", "Date", "Day", "Time", "Class", "Booked", "People (fee)", "Fee (IDR)", "Note"].map(esc).join(",")];
    for (const c of data.coaches) {
      for (const k of c.classes) {
        const note = [k.peopleEdited ? "people edited" : "", k.manual ? "manual fee" : "", k.substitute ? "cover" : ""].filter(Boolean).join(", ");
        lines.push([c.name, k.date, k.weekday, k.time, k.name, k.booked, k.people, k.fee, note].map(esc).join(","));
      }
      if (c.classes.length) lines.push([`${c.name} TOTAL`, "", "", "", `${c.totals.classes} classes`, c.totals.booked, c.totals.people, c.totals.fee, rateText(c.rate)].map(esc).join(","));
    }
    lines.push(["ALL COACHES TOTAL", "", "", "", `${data.totals.classes} classes`, data.totals.booked, data.totals.people, data.totals.fee, ""].map(esc).join(","));
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
        <span className="chip-label">Count people by</span>
        <button className={`chip chip-type ${basis === "checked" ? "is-on" : ""}`} onClick={() => setBasis("checked")}>Checked in</button>
        <button className={`chip chip-type ${basis === "booked" ? "is-on" : ""}`} onClick={() => setBasis("booked")}>Booked</button>
      </div>
      <p className="muted small">
        {basis === "checked" ? "People you ticked off in the class roster." : "Everyone who booked a spot (waitlist not counted)."} If the count is off, for example because of manual bookings, use “Edit people” on that class. A class with 0 people has no fee, unless you set one with “Edit fee”.
      </p>

      <div className="fee-rate fee-dropin">
        <label className="small muted">Drop-in price (percentages are taken from this)
          <input className="admin-input" inputMode="numeric" value={dropIn} onChange={(e) => setDropIn(e.target.value.replace(/\D/g, ""))} />
        </label>
        <button className="btn btn-outline btn-sm" disabled={!data || dropIn === String(data.dropIn) || !dropIn} onClick={() => post({ action: "dropin", amount: dropIn }, "Drop-in price saved.")}>Save</button>
      </div>

      {!data && <p className="muted">Loading…</p>}

      {data && (
        <>
          <div className="admin-stats">
            <div className="admin-stat"><div className="muted small">Classes taught</div><div className="admin-stat-v">{data.totals.classes}</div></div>
            <div className="admin-stat"><div className="muted small">People / booked</div><div className="admin-stat-v">{data.totals.people} / {data.totals.booked}</div></div>
            <div className="admin-stat"><div className="muted small">Coaches</div><div className="admin-stat-v">{data.totals.coaches}</div></div>
            <div className="admin-stat"><div className="muted small">Total fees</div><div className="admin-stat-v">{formatIDR(data.totals.fee)}</div></div>
          </div>

          {data.noCheckins > 0 && (
            <div className="admin-note is-warn">
              <b>{data.noCheckins} past {data.noCheckins === 1 ? "class has" : "classes have"} bookings but no check-ins.</b>
              <span className="small">Tick people off in the class roster, switch to “Booked” above, or type the number with “Edit people”. Until then the per-person part of those fees is 0.</span>
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
            const dirty = !!d && JSON.stringify(d) !== JSON.stringify(toDraft(c.rate));
            const show = open[c.id] ?? c.totals.classes > 0;
            const noRate = c.rate.mode === "flat" ? c.rate.base === 0 && c.rate.perHead === 0 : c.rate.percent === 0;
            return (
              <section className="admin-panel fee-coach" key={c.id || "none"}>
                <div className="admin-between">
                  <div>
                    <b className="fee-name">{c.name}</b>
                    <div className="muted small">{c.totals.classes} {c.totals.classes === 1 ? "class" : "classes"} · {c.totals.people} people · {c.totals.booked} booked</div>
                  </div>
                  <div className="fee-total">{formatIDR(c.totals.fee)}</div>
                </div>

                {c.id && d && (
                  <div className="fee-rate">
                    <div className="chip-row chip-row-sm fee-mode">
                      <button className={`chip chip-type ${d.mode === "flat" ? "is-on" : ""}`} onClick={() => setDraft(c.id, { mode: "flat" })}>Per class + per person</button>
                      <button className={`chip chip-type ${d.mode === "percent" ? "is-on" : ""}`} onClick={() => setDraft(c.id, { mode: "percent" })}>% of drop-in</button>
                    </div>
                    {d.mode === "flat" ? (
                      <>
                        <label className="small muted">Fee per class (IDR)
                          <input className="admin-input" inputMode="numeric" value={d.base} onChange={(e) => setDraft(c.id, { base: e.target.value.replace(/\D/g, "") })} />
                        </label>
                        <label className="small muted">Extra per person (IDR)
                          <input className="admin-input" inputMode="numeric" value={d.perHead} onChange={(e) => setDraft(c.id, { perHead: e.target.value.replace(/\D/g, "") })} />
                        </label>
                        <label className="small muted">…for each person above
                          <input className="admin-input fee-small" inputMode="numeric" value={d.threshold} onChange={(e) => setDraft(c.id, { threshold: e.target.value.replace(/\D/g, "") })} />
                        </label>
                        {Number(d.perHead) > 0 && (
                          <span className="small muted fee-example">
                            {Number(d.threshold) + 2} people = {formatIDR(Number(d.base || 0) + 2 * Number(d.perHead))}
                          </span>
                        )}
                      </>
                    ) : (
                      <label className="small muted">Percent of drop-in, per person
                        <input className="admin-input" inputMode="decimal" value={d.percent} onChange={(e) => setDraft(c.id, { percent: e.target.value.replace(/[^\d.]/g, "") })} />
                        <span className="small">{Number(d.percent) > 0 ? `= ${formatIDR(Math.round((Number(d.percent) / 100) * Number(dropIn || data.dropIn)))} per person` : ""}</span>
                      </label>
                    )}
                    <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={() => saveRate(c)}>Save rate</button>
                    {noRate && !dirty && <span className="chip chip-pink">No rate set</span>}
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
                    <div className="fee-num">
                      <b>{k.people}</b> {k.people === 1 ? "person" : "people"}
                      <div className="muted small">{k.peopleEdited ? `edited · app: ${k.attended} in, ${k.booked} booked` : `${k.attended} in · ${k.booked} booked`}</div>
                    </div>
                    <div className="fee-amt">
                      {formatIDR(k.fee)}
                      {k.manual && <div className="muted small">manual fee</div>}
                    </div>
                    <div className="fee-btns">
                      <button className="btn btn-outline btn-sm" onClick={() => editPeople(k)}>Edit people</button>
                      <button className="btn btn-outline btn-sm" onClick={() => editFee(k)}>Edit fee</button>
                    </div>
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
