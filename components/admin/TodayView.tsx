"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { addDays, formatFullDay, parseISO, toISO, today } from "@/lib/dates";
import { formatIDR } from "@/data/packages";

type Cls = { key: string; time: string; name: string; teacher: string; booked: number; waitlist: number; capacity: number };
type Data = { classes: Cls[]; stats: { classes: number; booked: number; mats: number; waitlist: number; salesWeek: number; ordersWeek: number }; attention: { pendingOrders: number; expiringMembers: number } };

export default function TodayView() {
  const [date, setDate] = useState(toISO(today()));
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    const r = await authFetch(`/api/admin/today?date=${date}`);
    if (r.ok) setData(await r.json());
  }, [date]);
  useEffect(() => { setData(null); load(); }, [load]);
  const shift = (n: number) => setDate(toISO(addDays(parseISO(date), n)));
  const isToday = date === toISO(today());

  return (
    <>
      <div className="admin-head">
        <div>
          <div className="eyebrow">{isToday ? "Today" : "Schedule"}</div>
          <h1 className="admin-title">{formatFullDay(parseISO(date))}</h1>
        </div>
        <div className="admin-actions">
          <button className="btn btn-outline btn-sm" onClick={() => shift(-1)} aria-label="Previous day">←</button>
          {!isToday && <button className="btn btn-outline btn-sm" onClick={() => setDate(toISO(today()))}>Today</button>}
          <button className="btn btn-outline btn-sm" onClick={() => shift(1)} aria-label="Next day">→</button>
        </div>
      </div>
      {!data ? <p className="muted">Loading…</p> : (
        <>
          <div className="admin-stats">
            <Stat label="Classes" value={String(data.stats.classes)} />
            <Stat label="Booked" value={String(data.stats.booked)} sub={`of ${data.stats.mats} mats`} />
            <Stat label="Waitlist" value={String(data.stats.waitlist)} />
            <Stat label="Sold this week" value={formatIDR(data.stats.salesWeek)} sub={`${data.stats.ordersWeek} orders`} />
          </div>
          <div className="admin-cols">
            <div className="admin-panel grow">
              <h2 className="h3">Classes</h2>
              {data.classes.length === 0 && <p className="muted">No classes on this day.</p>}
              {data.classes.map((c) => (
                <div className="admin-row" key={c.key}>
                  <div className="admin-time">{c.time}</div>
                  <div className="grow"><b>{c.name}</b><div className="muted small">{c.teacher}</div></div>
                  <div>{c.booked} of {c.capacity}</div>
                  <div>{c.booked >= c.capacity ? <span className="chip chip-dark">Full</span> : <span className="chip">{c.capacity - c.booked} spots</span>}</div>
                  <div>{c.waitlist > 0 ? <span className="chip chip-pink">{c.waitlist} waitlist</span> : null}</div>
                  <Link href={`/admin/classes/${encodeURIComponent(c.key)}`} className="btn btn-outline btn-sm">Roster</Link>
                </div>
              ))}
            </div>
            <div className="admin-panel admin-aside">
              <h2 className="h3">Needs attention</h2>
              <div className={`admin-note ${data.attention.pendingOrders ? "is-warn" : ""}`}>
                <b>Pending QRIS · {data.attention.pendingOrders} {data.attention.pendingOrders === 1 ? "order" : "orders"}</b>
                <div className="muted small">Created over 30 minutes ago, not paid yet.</div>
                <Link href="/admin/orders" className="text-link">Review orders</Link>
              </div>
              <div className="admin-note">
                <b>Packs ending within 7 days · {data.attention.expiringMembers} {data.attention.expiringMembers === 1 ? "member" : "members"}</b>
                <div className="muted small">A good moment to message them.</div>
                <Link href="/admin/members" className="text-link">See members</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="admin-stat"><div className="eyebrow muted">{label}</div><div className="admin-stat-v">{value}</div>{sub && <div className="muted small">{sub}</div>}</div>;
}
