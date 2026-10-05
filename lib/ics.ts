import { classStart } from "@/lib/booking-shared";
import { site } from "@/data/site";

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// Builds a calendar file (.ics) for one class, to add to Apple / Google / Outlook calendars.
export function buildIcs(classKey: string, c: { name: string; duration: string; teacher: string }) {
  const start = classStart(classKey);
  const minutes = parseInt(c.duration, 10) || 60;
  const end = new Date(start.getTime() + minutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plot Twist Studio//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${classKey}-${Date.now()}@plottwist`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(`${c.name} at ${site.shortName}`)}`,
    `DESCRIPTION:${esc(`Teacher: ${c.teacher}. Please arrive 10 minutes early. Cancel up to 12 hours before class to keep your credit.`)}`,
    `LOCATION:${esc(`${site.name}, ${site.addressLines.join(", ")}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Yoga class in 2 hours",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
