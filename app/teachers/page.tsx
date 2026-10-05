import type { Metadata } from "next";
import CtaBand from "@/components/CtaBand";
import TeacherCard from "@/components/TeacherCard";
import { teachers } from "@/data/teachers";

export const metadata: Metadata = { title: "Teachers", description: "Meet the teachers at Plot Twist Studio." };

export default function TeachersPage() {
  return (
    <>
      <section className="container page">
        <div className="eyebrow">Teachers</div>
        <h1 className="h1 h1-page">
          Meet the <em>people</em> behind the plot
        </h1>
        <p className="lead">
          Our teachers bring warmth, clear guidance and a little fun to every class. Find the style and voice that suits you.
        </p>
        <div className="grid grid-4 teachers-grid">
          {teachers.map((t) => (
            <TeacherCard key={t.initial} teacher={t} full />
          ))}
        </div>
      </section>

      <CtaBand
        title="Not sure who to practise with?"
        text="Start with the class guide, or book a private session and we will match you with the right teacher."
        button="Read the class guide"
        href="/class-guide"
      />
    </>
  );
}
