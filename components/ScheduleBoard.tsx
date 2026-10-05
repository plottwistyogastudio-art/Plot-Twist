"use client";

import { useEffect, useState } from "react";
import { OPENING_DATE, WEEKS_AHEAD, getClasses, typeFilters, type SiteConfig } from "@/data/schedule";
import {
  WEEKDAYS_SHORT,
  MONTHS_SHORT,
  addDays,
  formatFullDay,
  formatRange,
  parseISO,
  startOfWeek,
  toISO,
  today,
} from "@/lib/dates";

const opening = parseISO(OPENING_DATE);
const firstWeek = startOfWeek(opening); // Monday of the opening week

export default function ScheduleBoard({ config }: { config: SiteConfig }) {
  const [week, setWeek] = useState(0); // 0 = opening week
  const [selected, setSelected] = useState<string>(OPENING_DATE);
  const [type, setType] = useState<(typeof typeFilters)[number]>("All");

  // After the page loads, jump to the visitor's current week/day (never before opening)
  useEffect(() => {
    const now = today();
    const start = now < opening ? opening : now;
    const w = Math.floor((startOfWeek(start).getTime() - firstWeek.getTime()) / (7 * 86400000));
    if (w >= 0 && w < WEEKS_AHEAD) {
      setWeek(w);
      setSelected(toISO(start));
    }
  }, []);

  const weekStart = addDays(firstWeek, week * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function goToWeek(next: number) {
    if (next < 0 || next >= WEEKS_AHEAD) return;
    const start = addDays(firstWeek, next * 7);
    // select the first open day of that week
    const firstOpen = Array.from({ length: 7 }, (_, i) => addDays(start, i)).find((d) => d >= opening)!;
    setWeek(next);
    setSelected(toISO(firstOpen));
  }

  const selectedDate = parseISO(selected);
  const beforeOpening = selectedDate < opening;
  const list = beforeOpening
    ? []
    : getClasses(selectedDate, config).filter((c) => type === "All" || c.type === type);

  return (
    <div>
      <div className="week-nav">
        <button
          type="button"
          className="week-arrow"
          onClick={() => goToWeek(week - 1)}
          disabled={week === 0}
          aria-label="Previous week"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="week-label" aria-live="polite">
          {formatRange(weekStart, addDays(weekStart, 6))}
        </div>
        <button
          type="button"
          className="week-arrow"
          onClick={() => goToWeek(week + 1)}
          disabled={week >= WEEKS_AHEAD - 1}
          aria-label="Next week"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="day-row" role="group" aria-label="Day">
        {weekDays.map((d) => {
          const iso = toISO(d);
          const closed = d < opening;
          const on = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              className={`chip chip-day ${on ? "is-on" : ""}`}
              aria-pressed={on}
              disabled={closed}
              onClick={() => setSelected(iso)}
            >
              <span className="chip-dow">{WEEKDAYS_SHORT[d.getUTCDay()]}</span>
              <span className="chip-date">{d.getUTCDate()}</span>
              {d.getUTCDate() === 1 || iso === toISO(weekStart) ? (
                <span className="chip-month">{MONTHS_SHORT[d.getUTCMonth()]}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="chip-row chip-row-sm" role="group" aria-label="Class type">
        <span className="chip-label">Class type</span>
        {typeFilters.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip chip-type ${type === t ? "is-on" : ""}`}
            aria-pressed={type === t}
            onClick={() => setType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <h2 className="day-heading">{formatFullDay(selectedDate)}</h2>

      <div className="class-list">
        {list.map((c) => (
          <div className="class-row" key={c.time + c.name}>
            <div>
              <div className="class-time">{c.time}</div>
              <div className="muted small">{c.duration}</div>
            </div>
            <div>
              <div className="class-name">{c.name}</div>
              <div className="muted small">{c.type}</div>
            </div>
            <div className="muted">{c.teacher}</div>
            <div>
              <span className="pill">{c.level}</span>
            </div>
            <a href={`/book?class=${encodeURIComponent(selected + "_" + c.time)}`} className="btn btn-primary btn-sm class-book">
              Book
            </a>
          </div>
        ))}
        {list.length === 0 && (
          <div className="empty">
            {beforeOpening
              ? "No classes on this day."
              : "No classes match this filter on this day. Try another day or class type."}
          </div>
        )}
      </div>
    </div>
  );
}
