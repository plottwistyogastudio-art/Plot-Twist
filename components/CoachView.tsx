"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch, supabaseBrowser } from "@/lib/supabase";
import { MONTHS } from "@/lib/dates";

type Rate = { mode: "flat" | "percent"; base: number; perHead: number; threshold: number; percent: number };
type Cls = { key: string; date: string; weekday: string; time: string; name: string; type: string; cover: boolean; theme: string; photo: string };
type Me =
  | { state: "none"; email: string; teachers: { id: string; name: string }[] }
  | { state: "pending"; email: string; teacher: { id: string; name: string } }
  | {
      state: "approved"; email: string; teacher: { id: string; name: string };
      fee: { month: string; rate: Rate | null; dropIn: number; totals: { classes: number; people: number; fee: number }; classes: { key: string; date: string; time: string; name: string; people: number; fee: number }[]; upcomingNote: number };
      classes: Cls[];
    };

const idr = (n: number) => "IDR " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const label = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const short = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
const rateText = (r: Rate) => `${idr(r.base)} per class, plus ${idr(r.perHead)} for each person above ${r.threshold}`;

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/jpeg", 0.88));
}

export default function CoachView() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await authFetch("/api/coach/me");
    if (r.ok) setMe(await r.json()); else setMsg("Could not load your page. Please refresh.");
  }, []);
  useEffect(() => {
    supabaseBrowser().auth.getSession().then(({ data }) => { setSignedIn(!!data.session); if (data.session) load(); });
  }, [load]);

  if (signedIn === null) return <p className="muted">Loading…</p>;
  if (!signedIn)
    return (
      <div className="flow">
        <h1 className="h1 h1-page">Coach page</h1>
        <p className="muted">For Plot Twist coaches. Create an account (or log in) to see your fees and fill in your class themes and photos.</p>
        <div className="flow-actions">
          <Link href="/login?mode=signup&next=/coach" className="btn btn-primary btn-block">Create account</Link>
          <Link href="/login?next=/coach" className="btn btn-outline btn-block">Log in</Link>
        </div>
      </div>
    );
  if (!me) return <p className="muted">{msg || "Loading…"}</p>;

  if (me.state === "none") return <Claim me={me} onDone={load} />;
  if (me.state === "pending")
    return (
      <div className="flow">
        <h1 className="h1 h1-page">Almost there</h1>
        <p className="muted">You asked to be <b>{me.teacher.name}</b>. The studio needs to approve this first. Check back soon, then refresh this page.</p>
        <button className="btn btn-outline btn-block" onClick={load}>Refresh</button>
      </div>
    );
  return <Portal me={me} reload={load} />;
}

function Claim({ me, onDone }: { me: Extract<Me, { state: "none" }>; onDone: () => void }) {
  const [id, setId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await authFetch("/api/coach/claim", { method: "POST", body: JSON.stringify({ teacherId: id }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) onDone(); else setErr(j.error ?? "Something went wrong.");
  }
  return (
    <form className="flow" onSubmit={submit}>
      <h1 className="h1 h1-page">Who are you?</h1>
      <p className="muted">You are signed in as {me.email}. Pick your name. The studio approves it, then you can fill in your themes.</p>
      <label className="field">Your name
        <select value={id} onChange={(e) => setId(e.target.value)} required>
          <option value="">Choose…</option>
          {me.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {err && <p className="flow-error" role="alert">{err}</p>}
      <button className="btn btn-primary btn-block" disabled={!id || busy}>{busy ? "Please wait…" : "Send request"}</button>
      <p className="muted small">Not on the list? Ask the studio to add you as a teacher first.</p>
    </form>
  );
}

function Portal({ me, reload }: { me: Extract<Me, { state: "approved" }>; reload: () => void }) {
  const filled = me.classes.filter((c) => c.theme && c.photo).length;
  const f = me.fee;
  return (
    <div className="coach">
      <div className="eyebrow">Coach page</div>
      <h1 className="h1 h1-page">Hi {me.teacher.name.split(" ")[0]}</h1>

      <section className="admin-panel">
        <h2 className="h3">Your fee · {label(f.month)}</h2>
        {f.rate ? <p className="muted small">Your rate: {f.rate.mode === "percent" ? `${f.rate.percent}% of the drop-in price (IDR ${f.dropIn.toLocaleString("id-ID")}) per person` : rateText(f.rate)}. People are counted by who was checked in.</p> : <p className="muted small">Your rate has not been set yet. Ask the studio.</p>}
        <div className="admin-stats coach-stats">
          <div className="admin-stat"><div className="muted small">Classes taught</div><div className="admin-stat-v">{f.totals.classes}</div></div>
          <div className="admin-stat"><div className="muted small">People</div><div className="admin-stat-v">{f.totals.people}</div></div>
          <div className="admin-stat"><div className="muted small">Fee so far</div><div className="admin-stat-v fin-v">{idr(f.totals.fee)}</div></div>
        </div>
        {f.classes.length > 0 && (
          <details className="flow-sep">
            <summary className="small strong">See each class</summary>
            {f.classes.map((c) => (
              <div className="admin-row" key={c.key}>
                <div className="muted small admin-date">{short(c.date)} {c.time}</div>
                <div className="grow">{c.name}</div>
                <div className="muted small">{c.people} {c.people === 1 ? "person" : "people"}</div>
                <div>{idr(c.fee)}</div>
              </div>
            ))}
          </details>
        )}
        {f.upcomingNote > 0 && <p className="muted small">{f.upcomingNote} later {f.upcomingNote === 1 ? "class" : "classes"} this month will be added once taught.</p>}
      </section>

      <section className="admin-panel">
        <div className="admin-between">
          <h2 className="h3">Themes and photos · next 30 days</h2>
          <span className={`chip ${filled === me.classes.length ? "" : "chip-pink"}`}>{filled} of {me.classes.length} done</span>
        </div>
        <p className="muted small">Please fill in a <b>theme</b> and a <b>photo</b> for every class below. We use them for the daily &ldquo;Pick your theme&rdquo; posts. Use a clear, portrait (vertical) photo of yourself where the top part is kept.</p>
        {me.classes.length === 0 && <p className="muted">You have no classes in the next 30 days.</p>}
        {me.classes.map((c) => <Row key={c.key} c={c} onSaved={reload} />)}
      </section>
    </div>
  );
}

function Row({ c, onSaved }: { c: Cls; onSaved: () => void }) {
  const [theme, setTheme] = useState(c.theme);
  const [photo, setPhoto] = useState(c.photo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const dirty = theme !== c.theme || photo !== c.photo;
  const done = !!c.theme && !!c.photo;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const blob = await shrink(file);
      const r = await authFetch("/api/coach/photo", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
      const j = await r.json().catch(() => ({}));
      if (r.ok) setPhoto(j.url); else setMsg(j.error ?? "Upload failed.");
    } catch {
      setMsg("Could not read that image. Try a JPG or PNG.");
    }
    setBusy(false);
  }
  async function save() {
    setBusy(true); setMsg("");
    const r = await authFetch("/api/coach/themes", { method: "POST", body: JSON.stringify({ key: c.key, theme, photo }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setMsg("Saved."); onSaved(); } else setMsg(j.error ?? "Could not save.");
  }

  return (
    <div className="coach-row">
      <div className="coach-when">
        <b>{c.weekday.slice(0, 3)} {short(c.date)} · {c.time}</b>
        <div className="muted small">{c.name}{c.cover ? " (cover)" : ""} · {c.type}</div>
        <span className={`chip ${done ? "" : "chip-pink"}`}>{done ? "Done" : "Needed"}</span>
      </div>
      <label className="field coach-theme">Theme
        <input value={theme} maxLength={80} placeholder="For example Step to Straddle Headstand" onChange={(e) => setTheme(e.target.value)} />
      </label>
      <div className="photo-field">
        {photo ? <span className="photo-thumb" style={{ backgroundImage: `url(${photo})` }} /> : <span className="photo-thumb photo-empty">No photo</span>}
        <label className="btn btn-outline btn-sm">
          {busy ? "Please wait…" : photo ? "Change photo" : "Upload photo"}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <div className="coach-save">
        <button className="btn btn-primary btn-sm" disabled={busy || !dirty || !theme.trim() || !photo} onClick={save}>Save</button>
        {msg && <span className="muted small" role="status">{msg}</span>}
      </div>
    </div>
  );
}
