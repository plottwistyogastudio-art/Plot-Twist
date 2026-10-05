// Teachers as stored in the database (edited in Admin → Schedule → Teachers)
export type TeacherRec = {
  id: string;
  name: string;
  styles: string;       // e.g. "Vinyasa"
  bio: string;          // short bio (cards + top of the profile page)
  title?: string;       // e.g. "CYT 200H"
  quote?: string;       // teaching philosophy
  story?: string;       // longer story, in her own words
  qualifications?: string; // one per line
  photo?: string;       // e.g. "/teachers/riri.jpg" (file in /public/teachers)
};

// What the public teacher card needs
export type Teacher = TeacherRec & {
  initial: string;
  tone: "blush" | "sand";
};

const bio = "[One or two sentences about this teacher's background and teaching style.]";

// Used until real teachers are saved in the admin page.
export const defaultTeachers: TeacherRec[] = [
  {
    id: "firyal",
    name: "Firyal Nabilla",
    title: "CYT 200H",
    styles: "Vinyasa",
    bio: "Firyal, or Riri, is a graphic designer turned yoga teacher, bringing her love for creativity into the way she moves and teaches. Her classes blend creativity, intentional movement, breath, and thoughtfully curated music. Expect playful yet purposeful sequences that invite curiosity, challenge, and self-exploration. Her intention is to create space for students to move freely, find their rhythm, and leave feeling good.",
    quote: "Make space for exploration and enjoy the play!",
    story: "I started practicing yoga in 2021 as a way to balance my fast-paced, cardio-heavy lifestyle and reconnect with my body. I eventually came back to yoga more consistently in 2024, drawn to how it gave me space to slow down, be more mindful, and reconnect with myself.",
    qualifications: "CYT 200H, Dini Yoga School, 2026",
  },
  { id: "t2", name: "[Teacher name]", styles: "Hatha · Foundations", bio },
  { id: "t3", name: "[Teacher name]", styles: "Power Vinyasa", bio },
  { id: "t4", name: "[Teacher name]", styles: "Yin & Restore", bio },
  { id: "t5", name: "[Teacher name]", styles: "Vinyasa", bio },
  { id: "t6", name: "[Teacher name]", styles: "Slow Flow · Yin", bio },
  { id: "t7", name: "[Teacher name]", styles: "Hatha", bio },
  { id: "t8", name: "[Teacher name]", styles: "Private sessions", bio },
];

export function teacherCards(list: TeacherRec[]): Teacher[] {
  return list.map((t, i) => ({
    ...t,
    initial: (t.name.replace(/^[^A-Za-z0-9]+/, "")[0] ?? "?").toUpperCase(),
    tone: i % 2 === 0 ? "blush" : "sand",
  }));
}
