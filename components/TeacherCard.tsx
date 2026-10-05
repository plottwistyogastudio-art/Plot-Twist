import Link from "next/link";
import type { Teacher } from "@/data/teachers";

export default function TeacherCard({ teacher, full = false }: { teacher: Teacher; full?: boolean }) {
  const href = `/teachers/${teacher.id}`;
  return (
    <article>
      <Link href={href} className="teacher-link" aria-label={`${teacher.name}, view profile`}>
        <div
          className={`teacher-photo tone-${teacher.tone} ${teacher.photo ? "has-photo" : ""}`}
          style={teacher.photo ? { backgroundImage: `url(${teacher.photo})` } : undefined}
          aria-hidden="true"
        >
          {teacher.photo ? "" : teacher.initial}
        </div>
        <h3 className="teacher-name">{teacher.name}</h3>
      </Link>
      {teacher.title && <div className="muted small">{teacher.title}</div>}
      <div className={full ? "teacher-styles" : "muted small"}>{teacher.styles}</div>
      {full && (
        <>
          <p className="muted teacher-bio teacher-bio-clamp">{teacher.bio}</p>
          <Link href={href} className="text-link small">
            Read profile
          </Link>
        </>
      )}
    </article>
  );
}
