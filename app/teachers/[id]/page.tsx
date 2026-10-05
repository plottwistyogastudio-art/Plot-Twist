import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBand from "@/components/CtaBand";
import { teacherCards } from "@/data/teachers";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

async function find(id: string) {
  return teacherCards((await getConfig()).teachers).find((t) => t.id === id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = await find((await params).id);
  if (!t) return { title: "Teacher" };
  return { title: t.name, description: t.bio.slice(0, 160) };
}

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await find((await params).id);
  if (!t) {
    notFound();
    return null;
  }
  const quals = (t.qualifications ?? "").split("\n").map((q) => q.trim()).filter(Boolean);
  const first = t.name.split(" ")[0];

  return (
    <>
      <section className="container page">
        <Link href="/teachers" className="text-link small">← All teachers</Link>
        <div className="profile">
          <div
            className={`profile-photo teacher-photo tone-${t.tone} ${t.photo ? "has-photo" : ""}`}
            style={t.photo ? { backgroundImage: `url(${t.photo})` } : undefined}
            aria-hidden="true"
          >
            {t.photo ? "" : t.initial}
          </div>
          <div className="profile-body">
            <div className="eyebrow">Teacher</div>
            <h1 className="h1 h1-page">{t.name}</h1>
            <div className="profile-meta">
              {t.title && <span className="pill">{t.title}</span>}
              {t.styles && <span className="teacher-styles">{t.styles}</span>}
            </div>
            {t.quote && <blockquote className="profile-quote">&ldquo;{t.quote}&rdquo;</blockquote>}
            <p className="lead">{t.bio}</p>

            {t.story && (
              <>
                <h2 className="h3 profile-h">In {first}&rsquo;s words</h2>
                <p className="profile-story">{t.story}</p>
              </>
            )}

            {quals.length > 0 && (
              <>
                <h2 className="h3 profile-h">Qualifications</h2>
                <ul className="profile-list">
                  {quals.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </>
            )}

            <Link href="/schedule" className="btn btn-primary profile-cta">See the schedule</Link>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to practise together?"
        text="Pick a class, book your spot and arrive ten minutes early. We'll take care of the rest."
        button="Book a class"
        href="/schedule"
      />
    </>
  );
}
