import Link from "next/link";
import type { Teacher } from "@/data/teachers";

export default function TeacherCard({ teacher, full = false }: { teacher: Teacher; full?: boolean }) {
  return (
    <article>
      <div className={`teacher-photo tone-${teacher.tone}`} aria-hidden="true">
        {teacher.initial}
      </div>
      <h3 className="teacher-name">{teacher.name}</h3>
      <div className={full ? "teacher-styles" : "muted small"}>{teacher.styles}</div>
      {full && (
        <>
          <p className="muted teacher-bio">{teacher.bio}</p>
          <Link href="/schedule" className="text-link small">
            See their classes
          </Link>
        </>
      )}
    </article>
  );
}
