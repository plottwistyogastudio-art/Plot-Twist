"use client";

import { useEffect, useState } from "react";
import { authFetch, SESSION_EXPIRED } from "@/lib/supabase";
import { CLASS_TYPES, type SiteConfig, type SlotRec } from "@/data/schedule";
import type { TeacherRec } from "@/data/teachers";
import { WEEKDAYS, WEEKDAYS_SHORT, formatFullDay, parseISO } from "@/lib/dates";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const blankSlot = (): SlotRec => ({ time: "09:00", name: "New class", type: "Vinyasa", duration: "60 min", level: "All levels", teacherId: "" });
type Conflict = { key: string; label: string; count: number };

export default function ScheduleAdminView() {
  const [cfg, setCfg] = useState<SiteConfig | null>(null);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState<"week" | "teachers" | "dates">("week");
  const [day, setDay] = useState(1);
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  useEffect(() => {
    (async () => {
      const r = await authFetch("/api/admin/config");
      if (!r.ok) return setMsg({ ok: false, text: "Could not load the schedule." });
      const c = (await r.json()).config as SiteConfig;
      setCfg(c);
      setSaved(JSON.stringify(c));
    })();
  }, []);

  const dirty = !!cfg && JSON.stringify(cfg) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const edit = (fn: (n: SiteConfig) => void) =>
    setCfg((c) => {
      if (!c) return c;
      const n = structuredClone(c);
      fn(n);
      return n;
    });

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    setConflicts([]);
    const r = await authFetch("/api/admin/config", { method: "PUT", body: JSON.stringify({ config: cfg }) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok) {
      setCfg(j.config);
      setSaved(JSON.stringify(j.config));
      setMsg({ ok: true, text: "Saved. The website is updated." });
    } else {
      setMsg({ ok: false, text: r.status === 401 || r.status === 403 ? SESSION_EXPIRED : j.error ?? "Could not save." });
      setConflicts(j.conflicts ?? []);
    }
  }

  if (!cfg) return <p className="muted">{msg ? msg.text : "Loading…"}</p>;

  const teacherName = (id: string) => cfg.teachers.find((t) => t.id === id)?.name ?? "Teacher TBA";

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Schedule</h1>
          <p className="muted">Weekly classes, teachers and special dates. Changes appear on the website as soon as you save.</p>
        </div>
      </div>

      <div className="save-bar">
        <div className="seg seg-3" role="tablist">
          {([["week", "Weekly classes"], ["teachers", "Teachers"], ["dates", "Special dates"]] as const).map(([k, label]) => (
            <button key={k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <div className="admin-actions">
          {dirty && <button className="btn btn-outline btn-sm" onClick={() => { setCfg(JSON.parse(saved)); setMsg(null); setConflicts([]); }}>Discard</button>}
          <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
        </div>
      </div>

      {msg && (
        <div className={`admin-note ${msg.ok ? "" : "is-warn"}`}>
          <b>{msg.text}</b>
          {conflicts.map((c) => (
            <span key={c.key} className="small">{c.label}: {c.count} {c.count === 1 ? "member" : "members"} booked</span>
          ))}
        </div>
      )}

      {tab === "week" && (
        <div className="admin-panel">
          <div className="sched-days">
            {ORDER.map((d) => (
              <button key={d} className={d === day ? "is-on" : ""} onClick={() => setDay(d)}>
                {WEEKDAYS_SHORT[d]} <span>{cfg.week[d].length}</span>
              </button>
            ))}
          </div>
          <div className="admin-between admin-gap">
            <h2 className="card-title">{WEEKDAYS[day]}</h2>
            <label className="small muted">
              Copy this day to{" "}
              <select
                className="admin-input"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  const targets = v === "weekdays" ? [1, 2, 3, 4, 5] : v === "weekend" ? [0, 6] : v === "all" ? [0, 1, 2, 3, 4, 5, 6] : [];
                  const others = targets.filter((t) => t !== day);
                  if (!others.length) return;
                  if (!window.confirm(`This replaces all classes on: ${others.map((t) => WEEKDAYS_SHORT[t]).join(", ")}. Continue?`)) return;
                  edit((n) => { others.forEach((t) => { n.week[t] = structuredClone(n.week[day]); }); });
                }}
              >
                <option value="">Choose…</option>
                <option value="weekdays">Monday – Friday</option>
                <option value="weekend">Saturday + Sunday</option>
                <option value="all">All days</option>
              </select>
            </label>
          </div>
          {cfg.week[day].map((s, i) => (
            <SlotRow
              key={i}
              slot={s}
              teachers={cfg.teachers}
              onChange={(p) => edit((n) => { Object.assign(n.week[day][i], p); })}
              onRemove={() => edit((n) => { n.week[day].splice(i, 1); })}
            />
          ))}
          {cfg.week[day].length === 0 && <p className="muted">No classes on {WEEKDAYS[day]}.</p>}
          <div className="admin-gap">
            <button className="btn btn-outline btn-sm" onClick={() => edit((n) => { n.week[day].push(blankSlot()); })}>+ Add class</button>
          </div>
        </div>
      )}

      {tab === "teachers" && (
        <div className="admin-panel">
          {cfg.teachers.map((t, i) => {
            const used = cfg.week.flat().filter((s) => s.teacherId === t.id).length;
            return (
              <div key={t.id} className="teacher-edit">
                <div className="teacher-edit-fields">
                  <input className="admin-input" value={t.name} placeholder="Name" aria-label="Teacher name" onChange={(e) => edit((n) => { n.teachers[i].name = e.target.value; })} />
                  <div className="teacher-edit-two">
                    <input className="admin-input" value={t.title ?? ""} placeholder="Certification, e.g. CYT 200H" aria-label="Certification" onChange={(e) => edit((n) => { n.teachers[i].title = e.target.value; })} />
                    <input className="admin-input" value={t.styles} placeholder="Styles, e.g. Vinyasa · Slow Flow" aria-label="Styles" onChange={(e) => edit((n) => { n.teachers[i].styles = e.target.value; })} />
                  </div>
                  <textarea className="admin-input" value={t.bio} placeholder="Short bio (shown on the teacher cards)" aria-label="Short bio" rows={4} onChange={(e) => edit((n) => { n.teachers[i].bio = e.target.value; })} />
                  <input className="admin-input" value={t.quote ?? ""} placeholder="Teaching philosophy / quote" aria-label="Quote" onChange={(e) => edit((n) => { n.teachers[i].quote = e.target.value; })} />
                  <textarea className="admin-input" value={t.story ?? ""} placeholder="Her story, in her own words (optional)" aria-label="Story" rows={4} onChange={(e) => edit((n) => { n.teachers[i].story = e.target.value; })} />
                  <textarea className="admin-input" value={t.qualifications ?? ""} placeholder={"Qualifications, one per line\nCYT 200H, Dini Yoga School, 2026"} aria-label="Qualifications" rows={3} onChange={(e) => edit((n) => { n.teachers[i].qualifications = e.target.value; })} />
                  <PhotoField
                    photo={t.photo ?? ""}
                    onChange={(url) => edit((n) => { n.teachers[i].photo = url; })}
                    onError={(text) => setMsg({ ok: false, text })}
                  />
                </div>
                <div className="teacher-edit-side">
                  <span className="muted small">{used === 0 ? "Not in the weekly timetable" : `${used} weekly ${used === 1 ? "class" : "classes"}`}</span>
                  <div className="admin-actions">
                    <button className="text-link small" disabled={i === 0} onClick={() => edit((n) => { [n.teachers[i - 1], n.teachers[i]] = [n.teachers[i], n.teachers[i - 1]]; })}>Move up</button>
                    <button className="text-link small" disabled={i === cfg.teachers.length - 1} onClick={() => edit((n) => { [n.teachers[i + 1], n.teachers[i]] = [n.teachers[i], n.teachers[i + 1]]; })}>Move down</button>
                    <button className="text-link small" onClick={() => {
                      const msgText = used ? `${t.name || "This teacher"} teaches ${used} weekly ${used === 1 ? "class" : "classes"}. Those will show "Teacher TBA". Remove anyway?` : `Remove ${t.name || "this teacher"}?`;
                      if (!window.confirm(msgText)) return;
                      edit((n) => {
                        n.teachers = n.teachers.filter((x) => x.id !== t.id);
                        n.week.forEach((d) => d.forEach((s) => { if (s.teacherId === t.id) s.teacherId = ""; }));
                        Object.values(n.extraClasses).forEach((l) => l.forEach((s) => { if (s.teacherId === t.id) s.teacherId = ""; }));
                        n.substitutes = Object.fromEntries(Object.entries(n.substitutes).filter(([, v]) => v !== t.id));
                      });
                    }}>Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="admin-gap">
            <button className="btn btn-outline btn-sm" onClick={() => edit((n) => { n.teachers.push({ id: `t${Date.now().toString(36)}`, name: "", styles: "", bio: "" } as TeacherRec); })}>+ Add teacher</button>
          </div>
          <p className="muted small admin-gap">Renaming a teacher here updates every class they teach. The first four appear on the home page. Photos: use a portrait photo (the top of the picture is kept). Remember to press Save changes after uploading.</p>
        </div>
      )}

      {tab === "dates" && <DatesTab cfg={cfg} edit={edit} date={date} setDate={setDate} teacherName={teacherName} />}
    </>
  );
}

// Shrinks the picture in the browser first (max 1200 px), so uploads are small and fast
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/jpeg", 0.85));
}

function PhotoField({ photo, onChange, onError }: { photo: string; onChange: (url: string) => void; onError: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await shrink(file);
      const r = await authFetch("/api/admin/upload", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
      const j = await r.json().catch(() => ({}));
      if (r.ok) onChange(j.url);
      else onError(r.status === 401 || r.status === 403 ? SESSION_EXPIRED : j.error ?? "Upload failed.");
    } catch {
      onError("Could not read that image. Try a JPG or PNG.");
    }
    setBusy(false);
  }
  return (
    <div className="photo-field">
      {photo ? <span className="photo-thumb" style={{ backgroundImage: `url(${photo})` }} /> : <span className="photo-thumb photo-empty">No photo</span>}
      <label className="btn btn-outline btn-sm">
        {busy ? "Uploading…" : photo ? "Change photo" : "Upload photo"}
        <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {photo && <button type="button" className="text-link small" onClick={() => onChange("")}>Remove photo</button>}
    </div>
  );
}

function SlotRow({ slot, teachers, onChange, onRemove }: {
  slot: SlotRec; teachers: TeacherRec[]; onChange: (p: Partial<SlotRec>) => void; onRemove: () => void;
}) {
  return (
    <div className="slot-row">
      <input type="time" className="admin-input" value={slot.time} aria-label="Start time" onChange={(e) => onChange({ time: e.target.value })} />
      <input className="admin-input slot-name" value={slot.name} placeholder="Class name" aria-label="Class name" onChange={(e) => onChange({ name: e.target.value })} />
      <select className="admin-input" value={slot.type} aria-label="Class type" onChange={(e) => onChange({ type: e.target.value as SlotRec["type"] })}>
        {CLASS_TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>
      <label className="slot-dur">
        <input type="number" min={15} max={240} step={5} className="admin-input" value={parseInt(slot.duration, 10) || ""} aria-label="Minutes" onChange={(e) => onChange({ duration: `${e.target.value} min` })} />
        <span className="muted small">min</span>
      </label>
      <input className="admin-input" value={slot.level} placeholder="Level" aria-label="Level" onChange={(e) => onChange({ level: e.target.value })} />
      <select className="admin-input" value={slot.teacherId} aria-label="Teacher" onChange={(e) => onChange({ teacherId: e.target.value })}>
        <option value="">Teacher TBA</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name || "(no name)"}</option>)}
      </select>
      <button className="text-link small" onClick={onRemove}>Remove</button>
    </div>
  );
}

function DatesTab({ cfg, edit, date, setDate, teacherName }: {
  cfg: SiteConfig; edit: (fn: (n: SiteConfig) => void) => void; date: string; setDate: (d: string) => void; teacherName: (id: string) => string;
}) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const dow = valid ? parseISO(date).getUTCDay() : 0;
  const closed = valid && cfg.closedDates.includes(date);
  const regular = valid ? cfg.week[dow] : [];
  const extras = (valid && cfg.extraClasses[date]) || [];

  const exceptionDates = [...new Set([
    ...cfg.closedDates,
    ...Object.keys(cfg.extraClasses).filter((d) => cfg.extraClasses[d].length),
    ...Object.keys(cfg.substitutes).map((k) => k.slice(0, 10)),
  ])].sort();

  return (
    <div className="admin-cols">
      <div className="admin-panel grow">
        <label className="field">
          <span>Pick a date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {!valid && <p className="muted admin-gap">Pick a date to close the studio, swap a teacher for one class, or add a one-off class such as a workshop.</p>}

        {valid && (
          <>
            <div className="admin-between admin-gap">
              <h2 className="card-title">{formatFullDay(parseISO(date))}</h2>
              {closed ? (
                <button className="btn btn-outline btn-sm" onClick={() => edit((n) => { n.closedDates = n.closedDates.filter((d) => d !== date); })}>Reopen this day</button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={() => edit((n) => { n.closedDates.push(date); })}>Close this day</button>
              )}
            </div>

            {closed ? (
              <p className="muted">The studio is closed on this date. No classes are shown or bookable.</p>
            ) : (
              <>
                {regular.map((s) => {
                  const key = `${date}_${s.time}`;
                  return (
                    <div key={key} className="admin-row">
                      <div className="admin-time">{s.time}</div>
                      <div className="grow">
                        <b>{s.name}</b>
                        <div className="muted small">Usually {teacherName(s.teacherId)}</div>
                      </div>
                      <select
                        className="admin-input"
                        aria-label={`Teacher for ${s.name}`}
                        value={cfg.substitutes[key] ?? ""}
                        onChange={(e) => edit((n) => { if (e.target.value) n.substitutes[key] = e.target.value; else delete n.substitutes[key]; })}
                      >
                        <option value="">Regular teacher</option>
                        {cfg.teachers.map((t) => <option key={t.id} value={t.id}>Cover: {t.name || "(no name)"}</option>)}
                      </select>
                    </div>
                  );
                })}
                {regular.length === 0 && extras.length === 0 && <p className="muted">No regular classes on this day.</p>}

                {extras.length > 0 && <h3 className="card-title admin-gap">One-off classes</h3>}
                {extras.map((s, i) => (
                  <SlotRow
                    key={i}
                    slot={s}
                    teachers={cfg.teachers}
                    onChange={(p) => edit((n) => { Object.assign(n.extraClasses[date][i], p); })}
                    onRemove={() => edit((n) => { n.extraClasses[date].splice(i, 1); if (!n.extraClasses[date].length) delete n.extraClasses[date]; })}
                  />
                ))}
                <div className="admin-gap">
                  <button className="btn btn-outline btn-sm" onClick={() => edit((n) => { (n.extraClasses[date] ??= []).push({ ...blankSlot(), time: "14:00", name: "Special class" }); })}>+ Add one-off class</button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="admin-panel admin-aside">
        <h3 className="card-title">Dates with changes</h3>
        {exceptionDates.length === 0 && <p className="muted small">None yet.</p>}
        {exceptionDates.map((d) => {
          const cover = Object.keys(cfg.substitutes).filter((k) => k.startsWith(d)).length;
          const extra = cfg.extraClasses[d]?.length ?? 0;
          return (
            <button key={d} className={`admin-member ${d === date ? "is-on" : ""}`} onClick={() => setDate(d)}>
              <b>{formatFullDay(parseISO(d))}</b>
              <span className="muted small">
                {[cfg.closedDates.includes(d) && "Closed", extra > 0 && `${extra} one-off`, cover > 0 && `${cover} cover`].filter(Boolean).join(" · ")}
              </span>
            </button>
          );
        })}
        <p className="muted small admin-gap">Closing a day or removing a class that already has bookings is blocked. Cancel those bookings from the class roster first.</p>
      </div>
    </div>
  );
}
