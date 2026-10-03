// Date helpers. Everything works on calendar dates (no time of day),
// stored as UTC midnight so timezones never shift a date.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = WEEKDAYS.map((d) => d.slice(0, 3));

// "2026-11-07" -> Date
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Date -> "2026-11-07"
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

// Monday of the week containing d
export function startOfWeek(d: Date): Date {
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return addDays(d, -daysSinceMonday);
}

// Today's calendar date in the visitor's own timezone
export function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function isWeekend(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

// "7 November"
export function formatDay(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// "Saturday, 7 November"
export function formatFullDay(d: Date): string {
  return `${WEEKDAYS[d.getUTCDay()]}, ${formatDay(d)}`;
}

// "9 – 15 November 2026" or "2 Nov – 8 Nov 2026"
export function formatRange(start: Date, end: Date): string {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) {
    return `${start.getUTCDate()} – ${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  }
  const a = `${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]}${sameYear ? "" : " " + start.getUTCFullYear()}`;
  const b = `${end.getUTCDate()} ${MONTHS_SHORT[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  return `${a} – ${b}`;
}
