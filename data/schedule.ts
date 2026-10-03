import { isWeekend, toISO } from "@/lib/dates";

export type ClassSession = {
  time: string;
  name: string;
  type: "Vinyasa" | "Slow Flow" | "Hatha" | "Yin";
  duration: string;
  level: string;
  teacher: string;
};

// TODO: sample timetable. Replace with the real weekly timetable
// (or fetch it from your booking platform later).
const T = "Teacher Name";

// The repeating weekly timetable
export const weekdayClasses: ClassSession[] = [
  { time: "07:00", name: "Vinyasa Flow", type: "Vinyasa", duration: "60 min", level: "All levels", teacher: T },
  { time: "09:30", name: "Slow Flow", type: "Slow Flow", duration: "60 min", level: "Beginner friendly", teacher: T },
  { time: "12:00", name: "Hatha Foundations", type: "Hatha", duration: "60 min", level: "Beginner", teacher: T },
  { time: "17:30", name: "Power Vinyasa", type: "Vinyasa", duration: "60 min", level: "Intermediate", teacher: T },
  { time: "19:00", name: "Yin & Restore", type: "Yin", duration: "75 min", level: "All levels", teacher: T },
];

export const weekendClasses: ClassSession[] = [
  { time: "09:00", name: "Vinyasa Flow", type: "Vinyasa", duration: "60 min", level: "All levels", teacher: T },
  { time: "10:30", name: "Slow Flow", type: "Slow Flow", duration: "60 min", level: "Beginner friendly", teacher: T },
  { time: "17:00", name: "Yin & Restore", type: "Yin", duration: "75 min", level: "All levels", teacher: T },
];

// ---- Changes for specific dates (format: "YYYY-MM-DD") ----

// Days with no classes (public holidays, private events, ...)
export const closedDates: string[] = [
  // "2026-12-25",
];

// Extra one-off classes on a specific date (workshops, special sessions, ...)
export const extraClasses: Record<string, ClassSession[]> = {
  // "2026-11-14": [
  //   { time: "14:00", name: "Sound Bath", type: "Yin", duration: "90 min", level: "All levels", teacher: T },
  // ],
};

// ---- Opening + how far ahead visitors can browse ----
export const OPENING_DATE = "2026-10-15"; // no classes before this day
export const WEEKS_AHEAD = 8; // weeks shown from the opening week

export function getClasses(date: Date): ClassSession[] {
  const iso = toISO(date);
  if (closedDates.includes(iso)) return [];
  const base = isWeekend(date) ? weekendClasses : weekdayClasses;
  return [...base, ...(extraClasses[iso] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
}

export const typeFilters = ["All", "Vinyasa", "Slow Flow", "Hatha", "Yin"] as const;
