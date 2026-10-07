import type { SiteConfig, SlotRec, ClassTypeName } from "@/data/schedule";
import type { TeacherRec } from "@/data/teachers";

// The launch timetable. Slots with no teacher yet are left out (add them in Admin → Schedule when ready). Teacher = first name (matched to the Teachers list).
// Day order: 0 = Sunday ... 6 = Saturday.
type Row = [time: string, name: string, type: ClassTypeName, mins: number, level: string, teacher: string];

const ALL = "All levels";
const BEG = "Beginner";
const BF = "All levels";
const INT = "Intermediate";

export const launchWeek: Row[][] = [
  // Sunday
  [
    ["07:15", "Slow Sunday", "Slow Flow", 60, BF, "Inge"],
    ["08:30", "The Foundation", "Hatha", 60, BEG, "Inge"],
    ["17:00", "Yin & Restore", "Yin", 75, ALL, "Betty"],
  ],
  // Monday
  [
    ["18:30", "Candlelight Vinyasa", "Vinyasa", 60, ALL, "Inge"],
  ],
  // Tuesday
  [
    ["07:15", "Sunrise Vinyasa", "Vinyasa", 60, ALL, "Shava"],
    ["08:30", "The Foundation", "Hatha", 60, BEG, "Betty"],
  ],
  // Wednesday
  [
    ["16:00", "Prenatal Yoga", "Prenatal", 60, ALL, "Hrozenska"],
    ["17:00", "Power Vinyasa", "Vinyasa", 60, INT, "Hrozenska"],
    ["18:30", "Gentle Flow", "Slow Flow", 60, BF, "Irma"],
  ],
  // Thursday
  [
    ["07:15", "Vinyasa 101", "Vinyasa", 60, BEG, "Firyal"],
    ["08:30", "Power Vinyasa", "Vinyasa", 60, INT, "Firyal"],
    ["17:00", "Basic Vinyasa", "Vinyasa", 60, BEG, "Shava"],
    ["18:30", "Slow Flow", "Slow Flow", 60, BF, "Inge"],
  ],
  // Friday
  [
    ["07:15", "Hatha Flow", "Hatha", 60, ALL, "Shava"],
    ["08:30", "The Foundation", "Hatha", 60, BEG, "Hrozenska"],
    ["16:00", "Mat Pilates", "Mat Pilates", 60, ALL, "Hrozenska"],
    ["17:00", "Friday Slow Flow", "Slow Flow", 60, BF, "Betty"],
  ],
  // Saturday
  [
    ["07:15", "Slow Morning Stretch", "Slow Flow", 60, BF, "Irma"],
    ["08:30", "Vinyasa 101", "Vinyasa", 60, BEG, "Firyal"],
    ["11:30", "Prenatal Yoga", "Prenatal", 60, ALL, "Betty"],
    ["17:00", "Basic Vinyasa", "Vinyasa", 60, BEG, "Inge"],
    ["18:30", "Hatha Flow", "Hatha", 60, ALL, "Shava"],
  ],
];

const SOON = "Bio coming soon.";
// Teachers the timetable needs (used if they are not in the Teachers list yet).
export const launchTeachers: TeacherRec[] = [
  { id: "firyal", name: "Firyal Nabilla", styles: "Hatha · Vinyasa", bio: SOON },
  { id: "inge", name: "Inge", styles: "Hatha · Vinyasa", bio: SOON },
  { id: "shava", name: "Shava", styles: "Hatha · Vinyasa · Hatha-Vinyasa", bio: SOON },
  { id: "hrozenska", name: "Hrozenska", styles: "Hatha · Vinyasa · Prenatal · Mat Pilates", bio: SOON },
  { id: "irma", name: "Irma", styles: "Hatha · Vinyasa · Gentle · Basic · Yin · Yin Yang · Wheel", bio: SOON },
  { id: "betty", name: "Betty", styles: "Hatha · Hatha-Vinyasa · Vinyasa · Yin · Prenatal", bio: SOON },
];

// Puts the launch timetable into a config. Existing teachers (matched by first name)
// are kept as they are, missing ones are added. Closed dates, one-off classes and
// substitutes are left alone.
export function applyLaunchTimetable(cfg: SiteConfig): SiteConfig {
  const n = structuredClone(cfg);
  const first = (s: string) => s.trim().split(/\s+/)[0].toLowerCase();
  const idFor = (name: string) => {
    let t = n.teachers.find((x) => first(x.name) === name.toLowerCase());
    if (!t) {
      const base = launchTeachers.find((x) => first(x.name) === name.toLowerCase())!;
      t = structuredClone(base);
      // the default sample list has "[Teacher name]" placeholders: reuse those slots first
      const spare = n.teachers.findIndex((x) => x.name.startsWith("["));
      if (spare >= 0) n.teachers[spare] = { ...t, id: n.teachers[spare].id };
      else n.teachers.push(t);
      t = spare >= 0 ? n.teachers[spare] : t;
    }
    return t.id;
  };
  n.week = launchWeek.map((day) =>
    day.map(([time, name, type, mins, level, teacher]): SlotRec => ({
      time, name, type, duration: `${mins} min`, level, teacherId: idFor(teacher),
    })),
  );
  return n;
}
