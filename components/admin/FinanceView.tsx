"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { MONTHS, WEEKDAYS_SHORT, parseISO } from "@/lib/dates";

const CATEGORIES = ["Rent", "Salaries", "Utilities", "Marketing", "Supplies", "Equipment", "Payment fees", "Other"];
type Day = { date: string; orders: number; income: number; coachFees: number; other: number };
type MonthRow = { month: string; orders: number; income: number; coachFees: number; other: number };
type Expense = { id: string; date: string; category: string; note: string; amount: number };
type Report = {
  month: string; basis: "checked" | "booked";
  totals: { orders: number; income: number; coachFees: number; other: number; net: number };
  days: Day[]; byPackage: { name: string; orders: number; income: number }[]; byCategory: { category: string; amount: number }[];
  expenses: Expense[]; months: MonthRow[]; noCheckins: number;
};

const FIRST_MONTH = "2026-10";
const jakartaMonth = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
const jakartaToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const shift = (ym: string, by: number) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7); };
const label = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const idr = (n: number) => (n < 0 ? "-" : "") + "IDR " + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const dayLabel = (iso: string) => `${WEEKDAYS_SHORT[parseISO(iso).getUTCDay()]} ${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export default function FinanceView() {
  const [month, setMonth] = useState(jakartaMonth());
  const [basis, setBasis] = useState<"checked" | "booked">("checked");
  const [data, setData] = useState<Report | null>(null);
  const [msg, setMsg] = useState("");
  const [date, setDate] = useState(jakartaToday());
  const [category, setCategory] = useState("Rent");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await authFetch(`/api/admin/finance?month=${month}&basis=${basis}`);
    if (!r.ok) return setMsg("Could not load the finances.");
    setData(await r.json());
  }, [month, basis]);
  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => { setDate(month === jakartaMonth() ? jakartaToday() : `${month}-01`); }, [month]);

  async function post(body: object, ok: string) {
    setBusy(true);
    const r = await authFetch("/api/admin/finance", { method: "POST", body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? ok : j.error ?? "Something went wrong.");
    if (r.ok) load();
    return r.ok;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await post({ action: "add", date, category, note, amount }, "Expense added.")) { setNote(""); setAmount(""); }
  }
  const remove = (x: Expense) => {
    if (window.confirm(`Delete ${x.category} ${idr(x.amount)} on ${dayLabel(x.date)}?`)) post({ action: "delete", id: x.id }, "Expense deleted.");
  };

  function downloadCsv() {
    if (!data) return;
    const lines = [["Date", "Orders", "Income (IDR)", "Coach fees (IDR)", "Other expenses (IDR)", "Net (IDR)"].map(esc).join(",")];
    for (const d of data.days) lines.push([d.date, d.orders, d.income, d.coachFees, d.other, d.income - d.coachFees - d.other].map(esc).join(","));
    const t = data.totals;
    lines.push(["TOTAL", t.orders, t.income, t.coachFees, t.other, t.net].map(esc).join(","));
    lines.push("", ["Other expenses"].map(esc).join(","), ["Date", "Category", "Note", "Amount (IDR)"].map(esc).join(","));
    for (const x of data.expenses) lines.push([x.date, x.category, x.note, x.amount].map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `finance-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Finance</h1>
        <div className="admin-actions">
          <button className="btn btn-outline btn-sm" disabled={month <= FIRST_MONTH} onClick={() => setMonth(shift(month, -1))} aria-label="Previous month">←</button>
          <b className="fee-month">{label(month)}</b>
          <button className="btn btn-outline btn-sm" disabled={month >= jakartaMonth()} onClick={() => setMonth(shift(month, 1))} aria-label="Next month">→</button>
          <button className="btn btn-outline btn-sm" onClick={downloadCsv} disabled={!data}>Download month</button>
        </div>
      </div>
      {msg && <p className="flow-note" role="status">{msg}</p>}
      {!data && <p className="muted">Loading…</p>}

      {data && (
        <>
          <div className="admin-stats">
            <Stat label="Income" value={idr(data.totals.income)} sub={`${data.totals.orders} ${data.totals.orders === 1 ? "order" : "orders"}`} />
            <Stat label="Coach fees" value={idr(data.totals.coachFees)} />
            <Stat label="Other expenses" value={idr(data.totals.other)} />
            <Stat label="Net" value={idr(data.totals.net)} sub="income minus all costs" />
          </div>
          <p className="muted small">
            Income is every paid order (QRIS and orders you marked as paid), counted on the day it was paid, Jakarta time. Coach fees come from the{" "}
            <a className="text-link" href="/admin/fees">Coach fees</a> page and are counted on the day of the class, based on{" "}
            <button className={`chip chip-type ${basis === "checked" ? "is-on" : ""}`} onClick={() => setBasis("checked")}>checked in</button>{" "}
            <button className={`chip chip-type ${basis === "booked" ? "is-on" : ""}`} onClick={() => setBasis("booked")}>booked</button>.
            Payment gateway fees are not taken off automatically; add them as an expense if you want them in.
          </p>
          {data.noCheckins > 0 && basis === "checked" && (
            <div className="admin-note is-warn"><b>{data.noCheckins} past {data.noCheckins === 1 ? "class has" : "classes have"} bookings but no check-ins.</b> <span className="small">Their per-person coach fee counts as 0 until people are ticked off in the roster.</span></div>
          )}

          <section className="admin-panel">
            <h2 className="h3">Day by day</h2>
            {data.days.length === 0 ? <p className="muted">Nothing recorded in {label(month)} yet.</p> : (
              <div className="fin-scroll">
                <table className="fin-table">
                  <thead><tr><th>Day</th><th>Orders</th><th>Income</th><th>Coach fees</th><th>Other</th><th>Net</th></tr></thead>
                  <tbody>
                    {data.days.map((d) => (
                      <tr key={d.date}>
                        <td>{dayLabel(d.date)}</td><td>{d.orders || "–"}</td><td>{d.income ? idr(d.income) : "–"}</td>
                        <td>{d.coachFees ? idr(d.coachFees) : "–"}</td><td>{d.other ? idr(d.other) : "–"}</td>
                        <td className={d.income - d.coachFees - d.other < 0 ? "fin-neg" : ""}>{idr(d.income - d.coachFees - d.other)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th>Total</th><th>{data.totals.orders}</th><th>{idr(data.totals.income)}</th><th>{idr(data.totals.coachFees)}</th><th>{idr(data.totals.other)}</th><th className={data.totals.net < 0 ? "fin-neg" : ""}>{idr(data.totals.net)}</th></tr></tfoot>
                </table>
              </div>
            )}
          </section>

          <div className="admin-cols">
            <section className="admin-panel grow">
              <h2 className="h3">Other expenses · {label(month)}</h2>
              <form onSubmit={add} className="fin-form">
                <label className="small muted">Date<input type="date" className="admin-input" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
                <label className="small muted">Category
                  <select className="admin-input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <label className="small muted fin-note">Note (optional)<input className="admin-input" value={note} maxLength={120} placeholder="For example November rent" onChange={(e) => setNote(e.target.value)} /></label>
                <label className="small muted">Amount (IDR)<input className="admin-input" inputMode="numeric" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} required /></label>
                <button className="btn btn-primary btn-sm" disabled={busy || !amount}>Add</button>
              </form>
              {data.expenses.length === 0 && <p className="muted">No other expenses recorded this month.</p>}
              {data.expenses.map((x) => (
                <div className="admin-row" key={x.id}>
                  <div className="muted small admin-date">{dayLabel(x.date)}</div>
                  <div className="grow"><b>{x.category}</b>{x.note && <div className="muted small">{x.note}</div>}</div>
                  <div>{idr(x.amount)}</div>
                  <button className="text-link" onClick={() => remove(x)}>Delete</button>
                </div>
              ))}
            </section>

            <aside className="admin-panel admin-aside">
              <h2 className="h3">Income by package</h2>
              {data.byPackage.length === 0 && <p className="muted small">No paid orders yet.</p>}
              {data.byPackage.map((p) => (
                <div className="fin-line" key={p.name}><span>{p.name} <span className="muted small">× {p.orders}</span></span><b>{idr(p.income)}</b></div>
              ))}
              <h2 className="h3 admin-gap">Expenses by category</h2>
              {data.totals.coachFees > 0 && <div className="fin-line"><span>Coach fees</span><b>{idr(data.totals.coachFees)}</b></div>}
              {data.byCategory.map((c) => <div className="fin-line" key={c.category}><span>{c.category}</span><b>{idr(c.amount)}</b></div>)}
              {data.totals.coachFees === 0 && data.byCategory.length === 0 && <p className="muted small">No expenses yet.</p>}
            </aside>
          </div>

          <section className="admin-panel">
            <h2 className="h3">Month by month</h2>
            <div className="fin-scroll">
              <table className="fin-table">
                <thead><tr><th>Month</th><th>Orders</th><th>Income</th><th>Coach fees</th><th>Other</th><th>Net</th></tr></thead>
                <tbody>
                  {data.months.map((m) => {
                    const net = m.income - m.coachFees - m.other;
                    return (
                      <tr key={m.month} className={m.month === month ? "is-on" : ""} onClick={() => setMonth(m.month)} style={{ cursor: "pointer" }}>
                        <td>{label(m.month)}</td><td>{m.orders || "–"}</td><td>{idr(m.income)}</td><td>{idr(m.coachFees)}</td><td>{idr(m.other)}</td>
                        <td className={net < 0 ? "fin-neg" : ""}>{idr(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="admin-stat">
      <div className="muted small">{label}</div>
      <div className="admin-stat-v fin-v">{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}
