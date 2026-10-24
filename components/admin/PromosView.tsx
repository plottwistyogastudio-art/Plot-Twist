"use client";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { formatIDR } from "@/data/packages";

type Promo = {
  code: string; kind: "percent" | "amount"; value: number; package_ids: string[];
  expires_at: string | null; max_uses: number | null; one_per_person: boolean; new_members_only: boolean;
  active: boolean; note: string | null; paid: number; pending: number; given: number;
};
type PkgInfo = { id: string; name: string; price: number };
type Form = {
  editing: boolean; code: string; kind: "percent" | "amount"; value: string; packageIds: string[];
  expires: string; maxUses: string; onePerPerson: boolean; newMembersOnly: boolean; note: string;
};

const REGULAR = ["drop-in", "pack-5", "pack-10"];
const blank = (): Form => ({ editing: false, code: "", kind: "percent", value: "", packageIds: REGULAR, expires: "", maxUses: "", onePerPerson: true, newMembersOnly: false, note: "" });
const jakartaDate = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 10);
const off = (p: Pick<Promo, "kind" | "value">) => (p.kind === "percent" ? `${p.value}% off` : `${formatIDR(p.value)} off`);

export default function PromosView() {
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [pkgs, setPkgs] = useState<PkgInfo[]>([]);
  const [f, setF] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await authFetch("/api/admin/promos");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error ?? "Could not load."); setPromos([]); return; }
    setPromos(j.promos); setPkgs(j.packages);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: object, ok: string) {
    const r = await authFetch("/api/admin/promos", { method: "POST", body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? ok : j.error ?? "Something went wrong.");
    if (r.ok) { setF(null); load(); }
  }

  const save = () => f && post({ action: f.editing ? "update" : "create", ...f }, f.editing ? "Code updated." : "Code created.");
  const edit = (p: Promo) => setF({
    editing: true, code: p.code, kind: p.kind, value: String(p.value), packageIds: p.package_ids,
    expires: p.expires_at ? jakartaDate(p.expires_at) : "", maxUses: p.max_uses === null ? "" : String(p.max_uses),
    onePerPerson: p.one_per_person, newMembersOnly: p.new_members_only, note: p.note ?? "",
  });
  const togglePkg = (id: string) => f && setF({ ...f, packageIds: f.packageIds.includes(id) ? f.packageIds.filter((x) => x !== id) : [...f.packageIds, id] });
  const nameOf = (id: string) => pkgs.find((p) => p.id === id)?.name ?? id;
  const expired = (p: Promo) => !!p.expires_at && Date.parse(p.expires_at) < Date.now();

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Promo codes</h1>
        <div className="admin-actions"><button className="btn btn-primary btn-sm" onClick={() => setF(blank())}>New code</button></div>
      </div>
      {msg && <p className="flow-note" role="status">{msg}</p>}

      {f && (
        <div className="admin-panel promo-form">
          <b>{f.editing ? `Edit ${f.code}` : "New promo code"}</b>
          <div className="promo-grid">
            <label>Code
              <input className="admin-input" value={f.code} disabled={f.editing} placeholder="WELCOME20"
                onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} />
            </label>
            <label>Discount type
              <select className="admin-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Form["kind"] })}>
                <option value="percent">Percent (%)</option>
                <option value="amount">Fixed amount (IDR)</option>
              </select>
            </label>
            <label>{f.kind === "percent" ? "Percent off" : "IDR off"}
              <input className="admin-input" inputMode="numeric" value={f.value} placeholder={f.kind === "percent" ? "20" : "50000"}
                onChange={(e) => setF({ ...f, value: e.target.value.replace(/[^\d]/g, "") })} />
            </label>
            <label>Last day (optional)
              <input className="admin-input" type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} />
            </label>
            <label>Max total uses (optional)
              <input className="admin-input" inputMode="numeric" value={f.maxUses} placeholder="Unlimited"
                onChange={(e) => setF({ ...f, maxUses: e.target.value.replace(/[^\d]/g, "") })} />
            </label>
            <label>Note for yourself (optional)
              <input className="admin-input" value={f.note} placeholder="e.g. Instagram giveaway" onChange={(e) => setF({ ...f, note: e.target.value })} />
            </label>
          </div>
          <div className="promo-checks">
            <span className="chip-label">Works on</span>
            {pkgs.map((p) => (
              <label key={p.id} className="promo-check"><input type="checkbox" checked={f.packageIds.includes(p.id)} onChange={() => togglePkg(p.id)} /> {p.name}</label>
            ))}
          </div>
          <div className="promo-checks">
            <label className="promo-check"><input type="checkbox" checked={f.onePerPerson} onChange={(e) => setF({ ...f, onePerPerson: e.target.checked })} /> One use per person</label>
            <label className="promo-check"><input type="checkbox" checked={f.newMembersOnly} onChange={(e) => setF({ ...f, newMembersOnly: e.target.checked })} /> New members only (no paid order yet)</label>
          </div>
          <p className="muted small">Referral discounts and promo codes never combine: the member gets whichever is bigger. A class order is never charged less than IDR 10.000.</p>
          <div className="admin-actions">
            <button className="btn btn-primary btn-sm" onClick={save}>{f.editing ? "Save changes" : "Create code"}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setF(null)}>Cancel</button>
          </div>
        </div>
      )}

      {promos === null && <p className="muted">Loading…</p>}
      {promos?.length === 0 && !f && <p className="muted">No promo codes yet. Press “New code”.</p>}
      {promos?.map((p) => (
        <div key={p.code} className="admin-panel promo-card">
          <div className="admin-between">
            <span><b className="promo-code">{p.code}</b> <span className="chip">{off(p)}</span>{" "}
              {!p.active ? <span className="chip">Off</span> : expired(p) ? <span className="chip">Expired</span> : <span className="chip chip-dark">Active</span>}</span>
            <span className="muted small">Used {p.paid}{p.max_uses !== null ? ` / ${p.max_uses}` : ""} · {p.pending} waiting for payment · {formatIDR(p.given)} given</span>
          </div>
          <div className="muted small">
            {p.package_ids.map(nameOf).join(", ")}
            {p.expires_at ? ` · until ${jakartaDate(p.expires_at)}` : " · no end date"}
            {p.one_per_person ? " · once per person" : ""}{p.new_members_only ? " · new members only" : ""}
            {p.note ? ` · ${p.note}` : ""}
          </div>
          <div className="admin-actions">
            <button className="btn btn-outline btn-sm" onClick={() => edit(p)}>Edit</button>
            <button className="btn btn-outline btn-sm" onClick={() => post({ action: "active", code: p.code, active: !p.active }, p.active ? "Code switched off." : "Code switched on.")}>{p.active ? "Switch off" : "Switch on"}</button>
            <button className="btn btn-outline btn-sm" onClick={() => { if (window.confirm(`Delete ${p.code}?`)) post({ action: "delete", code: p.code }, "Code deleted."); }}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
