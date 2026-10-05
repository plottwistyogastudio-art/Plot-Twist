// Safe to import in the browser (no database code)
import { firstPlot, packages } from "@/data/packages";
export const findPackage = (id: string) => [...packages, ...firstPlot].find((p) => p.id === id);

// Hours before class when cancelling still returns the credit (also used in lib/booking.ts)
export const CANCEL_HOURS = 12;

import { getClasses, type ClassSession } from "@/data/schedule";
import { parseISO } from "@/lib/dates";

export function findClass(key: string): { iso: string; session: ClassSession } | null {
  const [iso, time] = key.split("_");
  if (!iso || !time || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const session = getClasses(parseISO(iso)).find((c) => c.time === time);
  return session ? { iso, session } : null;
}

// Studio is in Jakarta (UTC+7)
export const classStart = (key: string) => {
  const [iso, time] = key.split("_");
  return new Date(`${iso}T${time}:00+07:00`);
};
