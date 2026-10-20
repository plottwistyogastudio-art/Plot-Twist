// Server only: monthly coach fee report.
// Fee rules, manual headcounts and manual fees live in site_config (key "coach_fees"); attendance comes from bookings.
import { supabaseAdmin } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { OPENING_DATE } from "@/data/schedule";
import { packages } from "@/data/packages";
import { WEEKDAYS } from "@/lib/dates";

export type Rate = {
  mode: "flat" | "percent";
  base: number;     // flat: fee per class
  perHead: number;  // flat: extra per person
  percent: number;  // percent: % of the drop-in price, for each person
};
export type FeeSettings = {
  dropIn: number;                    // drop-in price that percentages are taken from
  rates: Record<string, Rate>;       // teacher id -> how this coach is paid
  headcounts: Record<string, number>; // "YYYY-MM-DD_HH:MM" -> number of people (when the app's count is wrong, e.g. manual bookings)
  overrides: Record<string, number>;  // "YYYY-MM-DD_HH:MM" -> fee for that one class (replaces the rule)
};
export type Basis = "checked" | "booked";

const KEY = /^\d{4}-\d{2}-\d{2}_([01]\d|2[0-3]):[0-5]\d$/;
const MAX = 100_000_000;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DEFAULT_DROP_IN = packages.find((p) => p.id === "drop-in")?.price ?? 120000;
export const NO_RATE: Rate = { mode: "flat", base: 0, perHead: 0, percent: 0 };

export function money(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= MAX ? n : null;
}
export function percentage(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Math.round(Number(v) * 10) / 10;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}
export function count(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 200 ? n : null;
}

export function cleanRate(v: Partial<Rate> | undefined): Rate {
  return {
    mode: v?.mode === "percent" ? "percent" : "flat",
    base: money(v?.base) ?? 0,
    perHead: money(v?.perHead) ?? 0,
    percent: percentage(v?.percent) ?? 0,
  };
}

function clean(raw: unknown): FeeSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<FeeSettings>;
  const rates: Record<string, Rate> = {};
  for (const [id, v] of Object.entries(r.rates ?? {}).slice(0, 80)) {
    if (id && id.length <= 40) rates[id] = cleanRate(v as Partial<Rate>);
  }
  const overrides: Record<string, number> = {};
  for (const [key, v] of Object.entries(r.overrides ?? {}).slice(0, 3000)) {
    const n = money(v);
    if (KEY.test(key) && n !== null) overrides[key] = n;
  }
  const headcounts: Record<string, number> = {};
  for (const [key, v] of Object.entries(r.headcounts ?? {}).slice(0, 3000)) {
    const n = count(v);
    if (KEY.test(key) && n !== null) headcounts[key] = n;
  }
  return { dropIn: money(r.dropIn) || DEFAULT_DROP_IN, rates, headcounts, overrides };
}

export async function getFeeSettings(): Promise<FeeSettings> {
  try {
    const { data } = await supabaseAdmin().from("site_config").select("value").eq("key", "coach_fees").maybeSingle();
    return clean(data?.value);
  } catch {
    return clean(null);
  }
}

export async function saveFeeSettings(s: FeeSettings, email: string | null) {
  return supabaseAdmin()
    .from("site_config")
    .upsert({ key: "coach_fees", value: clean(s), updated_at: new Date().toISOString(), updated_by: email });
}

export type FeeClass = {
  key: string; date: string; weekday: string; time: string; name: string; type: string;
  booked: number;     // spots booked in the app
  attended: number;   // people ticked off in the roster
  people: number;     // the number the fee is based on
  peopleEdited: boolean;
  fee: number; manual: boolean; substitute: boolean;
};
export type CoachFees = {
  id: string; name: string; rate: Rate;
  classes: FeeClass[];
  totals: { classes: number; booked: number; people: number; fee: number };
};
export type FeeReport = {
  month: string; basis: Basis; dropIn: number;
  coaches: CoachFees[];
  totals: { classes: number; booked: number; people: number; fee: number; coaches: number };
  cancelled: number;   // classes cancelled this month (not paid)
  upcoming: number;    // classes later this month that have not started yet (not counted)
  noCheckins: number;  // past classes with bookings but nobody checked in (and no number typed in)
};

const nextMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

async function monthBookings(ym: string) {
  const db = supabaseAdmin();
  const next = nextMonth(ym);
  const out: { class_key: string; checked_in_at: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("bookings").select("class_key,checked_in_at")
      .eq("status", "booked").gte("class_key", `${ym}-01`).lt("class_key", `${next}-01`)
      .order("id").range(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export function feeFor(rate: Rate, people: number, dropIn: number) {
  return rate.mode === "percent"
    ? Math.round((rate.percent / 100) * dropIn * people)
    : rate.base + rate.perHead * people;
}

export async function buildReport(ym: string, basis: Basis): Promise<FeeReport> {
  const [cfg, settings, rows] = await Promise.all([getConfig(), getFeeSettings(), monthBookings(ym)]);

  const booked = new Map<string, number>();
  const attended = new Map<string, number>();
  for (const r of rows) {
    booked.set(r.class_key, (booked.get(r.class_key) ?? 0) + 1);
    if (r.checked_in_at) attended.set(r.class_key, (attended.get(r.class_key) ?? 0) + 1);
  }

  const [y, m] = ym.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const now = Date.now();
  const byTeacher = new Map<string, FeeClass[]>();
  let cancelled = 0, upcoming = 0, noCheckins = 0;

  for (let d = 1; d <= days; d++) {
    const iso = `${ym}-${String(d).padStart(2, "0")}`;
    if (iso < OPENING_DATE || cfg.closedDates.includes(iso)) continue;
    const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
    const slots = [...(cfg.week[dow] ?? []), ...(cfg.extraClasses[iso] ?? [])];
    for (const s of slots) {
      const key = `${iso}_${s.time}`;
      if ((cfg.cancelledClasses ?? []).includes(key)) { cancelled++; continue; }
      if (Date.parse(`${iso}T${s.time}:00+07:00`) > now) { upcoming++; continue; }
      const sub = cfg.substitutes[key];
      const teacherId = sub || s.teacherId || "";
      const b = booked.get(key) ?? 0;
      const a = attended.get(key) ?? 0;
      const edited = key in settings.headcounts;
      if (!edited && b > 0 && a === 0) noCheckins++;
      const people = edited ? settings.headcounts[key] : basis === "booked" ? b : a;
      const rate = settings.rates[teacherId] ?? NO_RATE;
      const manual = key in settings.overrides;
      const fee = manual ? settings.overrides[key] : feeFor(rate, people, settings.dropIn);
      const list = byTeacher.get(teacherId) ?? [];
      list.push({ key, date: iso, weekday: WEEKDAYS[dow], time: s.time, name: s.name, type: s.type, booked: b, attended: a, people, peopleEdited: edited, fee, manual, substitute: !!sub && sub !== s.teacherId });
      byTeacher.set(teacherId, list);
    }
  }

  const sum = (list: FeeClass[]) => ({
    classes: list.length,
    booked: list.reduce((n, c) => n + c.booked, 0),
    people: list.reduce((n, c) => n + c.people, 0),
    fee: list.reduce((n, c) => n + c.fee, 0),
  });

  const coaches: CoachFees[] = cfg.teachers.map((t) => {
    const classes = (byTeacher.get(t.id) ?? []).sort((a, b) => a.key.localeCompare(b.key));
    return { id: t.id, name: t.name, rate: settings.rates[t.id] ?? NO_RATE, classes, totals: sum(classes) };
  });
  const orphan = byTeacher.get("");
  if (orphan?.length) {
    coaches.push({ id: "", name: "No teacher assigned", rate: NO_RATE, classes: orphan.sort((a, b) => a.key.localeCompare(b.key)), totals: sum(orphan) });
  }
  coaches.sort((a, b) => b.totals.classes - a.totals.classes || a.name.localeCompare(b.name));

  const all = coaches.flatMap((c) => c.classes);
  return {
    month: ym, basis, dropIn: settings.dropIn, coaches,
    totals: { ...sum(all), coaches: coaches.filter((c) => c.totals.classes > 0).length },
    cancelled, upcoming, noCheckins,
  };
}
