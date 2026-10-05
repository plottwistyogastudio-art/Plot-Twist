// Server only: loads and saves the schedule + teachers (table site_config).
import { supabaseAdmin } from "@/lib/supabase";
import { CLASS_TYPES, defaultConfig, type SiteConfig, type SlotRec } from "@/data/schedule";
import type { TeacherRec } from "@/data/teachers";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const KEY = /^\d{4}-\d{2}-\d{2}_([01]\d|2[0-3]):[0-5]\d$/;

type Result = { ok: true; config: SiteConfig } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// A photo is either a file in /public/teachers or one uploaded to our own Supabase storage bucket
const STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.local"}/storage/v1/object/public/teachers/`;
const okPhoto = (p: string) => /^\/teachers\/[\w.\-]+$/.test(p) || (p.startsWith(STORAGE_PREFIX) && /^[\w.\-]+$/.test(p.slice(STORAGE_PREFIX.length)));

function cleanSlots(raw: unknown, teacherIds: Set<string>, where: string): { slots?: SlotRec[]; error?: string } {
  if (!Array.isArray(raw)) return { error: `${where}: invalid list.` };
  const slots: SlotRec[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const time = str(r?.time, 5);
    const name = str(r?.name, 60);
    const mins = parseInt(str(r?.duration, 10), 10);
    if (!TIME.test(time)) return { error: `${where}: "${time}" is not a valid time (use HH:MM).` };
    if (!name) return { error: `${where}: every class needs a name (${time}).` };
    if (!CLASS_TYPES.includes(r.type as never)) return { error: `${where}: pick a class type for ${name}.` };
    if (!(mins >= 15 && mins <= 240)) return { error: `${where}: duration of ${name} must be 15–240 minutes.` };
    const teacherId = str(r?.teacherId, 40);
    slots.push({
      time, name, type: r.type as SlotRec["type"], duration: `${mins} min`, level: str(r?.level, 40),
      teacherId: teacherIds.has(teacherId) ? teacherId : "",
    });
  }
  slots.sort((a, b) => a.time.localeCompare(b.time));
  return { slots };
}

export function validateConfig(raw: unknown): Result {
  const r = raw as Partial<SiteConfig> | null;
  if (!r || typeof r !== "object") return fail("Invalid data.");

  // teachers
  if (!Array.isArray(r.teachers) || r.teachers.length > 40) return fail("Invalid teachers list.");
  const teachers: TeacherRec[] = [];
  const ids = new Set<string>();
  for (const t of r.teachers as Record<string, unknown>[]) {
    const id = str(t?.id, 40);
    const name = str(t?.name, 60);
    if (!id || ids.has(id)) return fail("Invalid teacher entry.");
    if (!name) return fail("Every teacher needs a name.");
    ids.add(id);
    const photo = str(t?.photo, 120);
    teachers.push({
      id, name, styles: str(t?.styles, 80), bio: str(t?.bio, 800),
      title: str(t?.title, 60), quote: str(t?.quote, 200), story: str(t?.story, 2000),
      qualifications: str(t?.qualifications, 800),
      photo: okPhoto(photo) ? photo : "",
    });
  }

  // weekly timetable
  if (!Array.isArray(r.week) || r.week.length !== 7) return fail("The weekly timetable must have 7 days.");
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const week: SlotRec[][] = [];
  for (let d = 0; d < 7; d++) {
    const out = cleanSlots(r.week[d], ids, dayNames[d]);
    if (out.error) return fail(out.error);
    week.push(out.slots!);
  }

  // closed dates
  if (!Array.isArray(r.closedDates) || r.closedDates.length > 300) return fail("Invalid closed dates.");
  const closedDates = [...new Set((r.closedDates as unknown[]).map((d) => str(d, 10)))];
  if (closedDates.some((d) => !ISO.test(d))) return fail("Invalid closed date.");
  closedDates.sort();

  // one-off classes
  const extraIn = r.extraClasses && typeof r.extraClasses === "object" ? Object.entries(r.extraClasses) : null;
  if (!extraIn || extraIn.length > 300) return fail("Invalid one-off classes.");
  const extraClasses: Record<string, SlotRec[]> = {};
  for (const [date, list] of extraIn) {
    if (!ISO.test(date)) return fail("Invalid one-off class date.");
    const out = cleanSlots(list, ids, date);
    if (out.error) return fail(out.error);
    if (out.slots!.length) extraClasses[date] = out.slots!;
  }

  // the same start time twice on one day would clash (booking keys are date + time)
  const check = (slots: SlotRec[], label: string) => {
    const seen = new Set<string>();
    for (const s of slots) {
      if (seen.has(s.time)) return `${label}: two classes start at ${s.time}.`;
      seen.add(s.time);
    }
    return null;
  };
  for (let d = 0; d < 7; d++) {
    const e = check(week[d], dayNames[d]);
    if (e) return fail(e);
  }
  for (const [date, list] of Object.entries(extraClasses)) {
    // an extra class may not share a time with a weekly class on that date
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const e = check([...week[dow], ...list], date);
    if (e) return fail(e);
  }

  // cover teachers
  const subIn = r.substitutes && typeof r.substitutes === "object" ? Object.entries(r.substitutes) : null;
  if (!subIn || subIn.length > 600) return fail("Invalid substitutes.");
  const substitutes: Record<string, string> = {};
  for (const [key, id] of subIn) {
    if (KEY.test(key) && typeof id === "string" && ids.has(id)) substitutes[key] = id;
  }

  return { ok: true, config: { teachers, week, closedDates, extraClasses, substitutes } };
}

// Current config (falls back to the built-in defaults if nothing is saved yet or the table is missing)
export async function getConfig(): Promise<SiteConfig> {
  try {
    const { data } = await supabaseAdmin().from("site_config").select("value").eq("key", "site").maybeSingle();
    if (data?.value) {
      const v = validateConfig(data.value);
      if (v.ok) return v.config;
    }
  } catch {
    /* use defaults */
  }
  return defaultConfig;
}

export async function saveConfig(config: SiteConfig, email: string | null) {
  return supabaseAdmin()
    .from("site_config")
    .upsert({ key: "site", value: config, updated_at: new Date().toISOString(), updated_by: email });
}
