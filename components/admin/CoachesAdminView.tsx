"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase";
import { MONTHS } from "@/lib/dates";

type Cls = { key: string; date: string; weekday: string; time: string; name: string; type: string; cover: boolean; theme: string; photo: string };
type Coach = { id: string; name: string; email: string; linked: boolean; userId: string; classes: Cls[] };
type Pending = { userId: string; email: string; teacherId: string; teacher: string; at: string };
const short = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;

export default function CoachesAdminView() {
  const [data, setData] = useState<{ pending: Pending[]; coaches: Coach[] } | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await authFetch("/api/admin/coaches");
    if (r.ok) setData(await r.json()); else setMsg("Could not load.");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body: object, ok: string, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return;
    const r = await authFetch("/api/admin/coaches", { method: "POST", body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? ok : j.error ?? "Something went wrong.");
    load();
  }
  const link = typeof window !== "undefined" ? `${window.location.origin}/coach` : "/coach";
  const copy = async () => { try { await navigator.clipboard.writeText(link); setMsg("Link copied."); } catch { setMsg(link); } };

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Coach themes</h1>
        <div className="admin-actions"><button className="btn btn-outline btn-sm" onClick={copy}>Copy coach link</button></div>
      </div>
      <p className="muted small">Send coaches this link: <b>{link}</b>. They create an account, pick their name, and you approve them here. Then they see their own fee and fill in a theme and photo for each class in the next 30 days.</p>
      {msg && <p className="flow-note" role="status">{msg}</p>}
      {!data && <p className="muted">Loading…</p>}
      {data && (
        <>
          {data.pending.length > 0 && (
            <section className="admin-panel">
              <h2 className="h3">Waiting for approval · {data.pending.length}</h2>
              {data.pending.map((p) => (
                <div className="admin-row" key={p.userId}>
                  <div className="grow"><b>{p.teacher}</b><div className="muted small">{p.email}</div></div>
                  <button className="btn btn-primary btn-sm" onClick={() => act({ action: "approve", userId: p.userId }, `${p.teacher} approved.`)}>Approve</button>
                  <button className="text-link" onClick={() => act({ action: "reject", userId: p.userId }, "Request removed.", `Reject ${p.email} as ${p.teacher}?`)}>Reject</button>
                </div>
              ))}
            </section>
          )}

          {data.coaches.map((c) => {
            const done = c.classes.filter((x) => x.theme && x.photo).length;
            return (
              <section className="admin-panel" key={c.id}>
                <div className="admin-between">
                  <div>
                    <b className="fee-name">{c.name}</b>
                    <div className="muted small">{c.linked ? `Account: ${c.email}` : "No account yet"}</div>
                  </div>
                  <div className="admin-actions">
                    <span className={`chip ${c.classes.length && done < c.classes.length ? "chip-pink" : ""}`}>{done} of {c.classes.length} done</span>
                    {c.linked && <button className="text-link" onClick={() => act({ action: "unlink", userId: c.userId }, "Account unlinked.", `Unlink ${c.email} from ${c.name}?`)}>Unlink</button>}
                  </div>
                </div>
                {c.classes.length === 0 && <p className="muted small">No classes in the next 30 days.</p>}
                {c.classes.map((x) => (
                  <div className="admin-row" key={x.key}>
                    <div className="muted small admin-date">{x.weekday.slice(0, 3)} {short(x.date)} {x.time}</div>
                    <div className="grow"><b>{x.theme || <span className="muted">Theme needed</span>}</b><div className="muted small">{x.name}{x.cover ? " (cover)" : ""}</div></div>
                    {x.photo ? <a href={x.photo} target="_blank" rel="noreferrer" aria-label="Open photo"><span className="photo-thumb" style={{ backgroundImage: `url(${x.photo})` }} /></a> : <span className="chip chip-pink">Photo needed</span>}
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
