"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { formatIDR } from "@/data/packages";

type Order = { id: string; member: string; pkg: string; classKey: string | null; amount: number; status: string; createdAt: string };

export default function OrdersView() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await authFetch("/api/admin/orders");
    if (r.ok) setOrders((await r.json()).orders);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function markPaid(o: Order) {
    if (!window.confirm(`Mark ${o.pkg} for ${o.member} as paid? Only do this if you have seen the money.`)) return;
    const r = await authFetch(`/api/admin/orders/${o.id}`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Marked as paid." : j.message ?? "Something went wrong.");
    load();
  }

  return (
    <>
      <div className="admin-head"><h1 className="admin-title">Orders</h1></div>
      {msg && <p className="flow-note" role="status">{msg}</p>}
      <div className="admin-panel">
        {!orders && <p className="muted">Loading…</p>}
        {orders?.length === 0 && <p className="muted">No orders yet.</p>}
        {orders?.map((o) => (
          <div className="admin-row" key={o.id}>
            <div className="muted small admin-date">{new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
            <div className="grow"><b>{o.member}</b><div className="muted small">{o.pkg}{o.classKey ? ` · for class ${o.classKey.replace("_", " ")}` : ""}</div></div>
            <div>{formatIDR(o.amount)}</div>
            <div><span className={`chip ${o.status === "pending" ? "chip-pink" : ""}`}>{o.status === "paid" ? "Paid" : o.status === "pending" ? "Pending" : "Expired"}</span></div>
            {o.status === "pending" ? <button className="btn btn-outline btn-sm" onClick={() => markPaid(o)}>Mark as paid</button> : <span className="admin-spacer" />}
          </div>
        ))}
      </div>
    </>
  );
}
