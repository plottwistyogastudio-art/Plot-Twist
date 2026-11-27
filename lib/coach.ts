// Server only: the coach portal (/coach). Coaches sign up, pick their name, an admin approves them,
// then they see their own fees and fill in a theme + photo for each class in the next 30 days.
// Everything lives in site_config, so no database change is needed:
//   "coach_links"            who is which coach
//   "coach_themes_<coachId>" that coach's themes (one key per coach, so two coaches never overwrite each other)
import { supabaseAdmin } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { OPENING_DATE } from "@/data/schedule";
import { WEEKDAYS } from "@/lib/dates";

export const THEME_DAYS = 30;
export const PHOTO_BUCKET = "teachers";
export type CoachLink = { userId: string; email: string; teacherId: string; status: "pending" | "approved"; at: string };
export type ThemeEntry = { theme: string; photo: string };
export type CoachClass = { key: string; date: string; weekday: string; time: string; name: string; type: string; cover: boolean };

const jakartaToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

async function readKey(key: string): Promise<unknown> {
  try {
    const { data } = await supabaseAdmin().from("site_config").select("value").eq("key", key).maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}
const writeKey = (key: string, value: unknown, email: string | null) =>
  supabaseAdmin().from("site_config").upsert({ key, value, updated_at: new Date().toISOString(), updated_by: email });

export async function getLinks(): Promise<CoachLink[]> {
  const raw = (await readKey("coach_links")) as { items?: Partial<CoachLink>[] } | null;
  const out: CoachLink[] = [];
  for (const l of (raw?.items ?? []).slice(0, 300)) {
    if (!l?.userId || !l.teacherId || (l.status !== "pending" && l.status !== "approved")) continue;
    out.push({ userId: String(l.userId), email: String(l.email ?? "").slice(0, 120), teacherId: String(l.teacherId).slice(0, 40), status: l.status, at: String(l.at ?? "") });
  }
  return out;
}
export const saveLinks = (items: CoachLink[], email: string | null) => writeKey("coach_links", { items }, email);

export async function getThemes(teacherId: string): Promise<Record<string, ThemeEntry>> {
  const raw = (await readKey(`coach_themes_${teacherId}`)) as { items?: Record<string, Partial<ThemeEntry>> } | null;
  const out: Record<string, ThemeEntry> = {};
  for (const [k, v] of Object.entries(raw?.items ?? {}).slice(0, 2000)) {
    if (/^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/.test(k)) out[k] = { theme: String(v?.theme ?? "").slice(0, 80), photo: String(v?.photo ?? "").slice(0, 400) };
  }
  return out;
}
export async function saveThemes(teacherId: string, items: Record<string, ThemeEntry>, email: string | null) {
  // keep only recent entries so the list never grows forever
  const cutoff = new Date(Date.now() + 7 * 3600_000 - 60 * 86400_000).toISOString().slice(0, 10);
  const kept = Object.fromEntries(Object.entries(items).filter(([k]) => k.slice(0, 10) >= cutoff));
  return writeKey(`coach_themes_${teacherId}`, { items: kept }, email);
}

// Classes a coach teaches from today for the next THEME_DAYS days (covers included, cancelled classes left out)
export async function upcomingClasses(teacherId: string): Promise<CoachClass[]> {
  const cfg = await getConfig();
  const start = jakartaToday();
  const out: CoachClass[] = [];
  for (let i = 0; i < THEME_DAYS; i++) {
    const iso = new Date(Date.parse(`${start}T00:00:00Z`) + i * 86400_000).toISOString().slice(0, 10);
    if (iso < OPENING_DATE || cfg.closedDates.includes(iso)) continue;
    const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
    for (const s of [...(cfg.week[dow] ?? []), ...(cfg.extraClasses[iso] ?? [])]) {
      const key = `${iso}_${s.time}`;
      if ((cfg.cancelledClasses ?? []).includes(key)) continue;
      const sub = cfg.substitutes[key];
      if ((sub || s.teacherId) !== teacherId) continue;
      out.push({ key, date: iso, weekday: WEEKDAYS[dow], time: s.time, name: s.name, type: s.type, cover: !!sub && sub !== s.teacherId });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

export function photoPrefix() {
  const base = supabaseAdmin().storage.from(PHOTO_BUCKET).getPublicUrl("x").data.publicUrl;
  return base.slice(0, -1) + "coach/";
}

export async function uploadPhoto(buf: Buffer, teacherId: string) {
  const db = supabaseAdmin();
  const path = `coach/${teacherId.replace(/[^\w-]/g, "")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  let { error } = await db.storage.from(PHOTO_BUCKET).upload(path, buf, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error && /not found/i.test(error.message)) {
    await db.storage.createBucket(PHOTO_BUCKET, { public: true });
    ({ error } = await db.storage.from(PHOTO_BUCKET).upload(path, buf, { contentType: "image/jpeg", cacheControl: "31536000" }));
  }
  return error ? null : db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// The signed-in user's approved coach link, or null
export async function approvedLink(userId: string) {
  return (await getLinks()).find((l) => l.userId === userId && l.status === "approved") ?? null;
}
