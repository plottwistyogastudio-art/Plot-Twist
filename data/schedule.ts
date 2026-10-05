import { toISO } from "@/lib/dates";
import { defaultTeachers, type TeacherRec } from "@/data/teachers";

export const CLASS_TYPES = ["Vinyasa", "Slow Flow", "Hatha", "Yin"] as const;
export type ClassTypeName = (typeof CLASS_TYPES)[number];

// One class as shown on the website (teacher name already filled in)
export type ClassSession = {
  time: string;
  name: string;
  type: ClassTypeName;
  duration: string;
  level: string;
  teacher: string;
};

// One class as stored (points at a teacher by id, so renaming a teacher updates every class)
export type SlotRec = {
  time: string;
  name: string;
  type: ClassTypeName;
  duration: string;
  level: string;
  teacherId: string;
};

// Everything the admin can edit. Saved in the database (table site_config).
export type SiteConfig = {
  teachers: TeacherRec[];
  week: SlotRec[][];                       // 7 days, index 0 = Sunday ... 6 = Saturday
  closedDates: string[];                   // "YYYY-MM-DD": no classes that day
  extraClasses: Record<string, SlotRec[]>; // one-off classes on a date
  substitutes: Record<string, string>;     // "YYYY-MM-DD_HH:MM" -> teacher id (cover for one class)
};

const s = (time: string, name: string, type: ClassTypeName, duration: string, level: string): SlotRec =>
  ({ time, name, type, duration, level, teacherId: "" });

const weekday = (): SlotRec[] => [
  s("07:00", "Vinyasa Flow", "Vinyasa", "60 min", "All levels"),
  s("09:30", "Slow Flow", "Slow Flow", "60 min", "Beginner friendly"),
  s("12:00", "Hatha Foundations", "Hatha", "60 min", "Beginner"),
  s("17:30", "Power Vinyasa", "Vinyasa", "60 min", "Intermediate"),
  s("19:00", "Yin & Restore", "Yin", "75 min", "All levels"),
];
const weekend = (): SlotRec[] => [
  s("09:00", "Vinyasa Flow", "Vinyasa", "60 min", "All levels"),
  s("10:30", "Slow Flow", "Slow Flow", "60 min", "Beginner friendly"),
  s("17:00", "Yin & Restore", "Yin", "75 min", "All levels"),
];

// Used until a schedule is saved in the admin page (or if the database is unreachable).
export const defaultConfig: SiteConfig = {
  teachers: defaultTeachers,
  week: [weekend(), weekday(), weekday(), weekday(), weekday(), weekday(), weekend()],
  closedDates: [],
  extraClasses: {},
  substitutes: {},
};

// ---- Opening + how far ahead visitors can browse ----
export const OPENING_DATE = "2026-10-15"; // no classes before this day
export const CLASS_CAPACITY = 12; // mats per class
export const WEEKS_AHEAD = 8; // weeks shown from the opening week

export const TEACHER_TBA = "Teacher TBA";

export function getClasses(date: Date, cfg: SiteConfig = defaultConfig): ClassSession[] {
  const iso = toISO(date);
  if (cfg.closedDates.includes(iso)) return [];
  const slots = [...(cfg.week[date.getUTCDay()] ?? []), ...(cfg.extraClasses[iso] ?? [])];
  return slots
    .map(({ teacherId, ...c }) => {
      const id = cfg.substitutes[`${iso}_${c.time}`] || teacherId;
      return { ...c, teacher: cfg.teachers.find((t) => t.id === id)?.name ?? TEACHER_TBA };
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

export const typeFilters = ["All", ...CLASS_TYPES] as const;
