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
  slug: string;         // used in the web address, e.g. /teachers/inge
  initial: string;
  tone: "blush" | "sand";
};

// Used until real teachers are saved in the admin page.
export const defaultTeachers: TeacherRec[] = [
  {
    id: "firyal",
    name: "Firyal Nabilla",
    title: "CYT 200H",
    styles: "Hatha · Vinyasa",
    bio: "Firyal, or Riri, is a graphic designer turned yoga teacher, bringing her love for creativity into the way she moves and teaches. Her classes blend creativity, intentional movement, breath, and thoughtfully curated music. Expect playful yet purposeful sequences that invite curiosity, challenge, and self-exploration. Her intention is to create space for students to move freely, find their rhythm, and leave feeling good.",
    quote: "Make space for exploration and enjoy the play!",
    story: "I started practicing yoga in 2021 as a way to balance my fast-paced, cardio-heavy lifestyle and reconnect with my body. I eventually came back to yoga more consistently in 2024, drawn to how it gave me space to slow down, be more mindful, and reconnect with myself.",
    qualifications: "CYT 200H, Dini Yoga School, 2026",
  },
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Web address name: first name ("inge"). If two teachers share a first name, the full name is used.
export function teacherSlugs(list: TeacherRec[]): Map<string, string> {
  const firsts = list.map((t) => slugify(t.name.replace(/^[^A-Za-z0-9]+/, "").split(/\s+/)[0] ?? ""));
  const out = new Map<string, string>();
  const used = new Set<string>();
  list.forEach((t, i) => {
    let s = firsts[i];
    if (!s || firsts.filter((f) => f === s).length > 1) s = slugify(t.name) || t.id;
    if (used.has(s)) s = t.id;
    used.add(s);
    out.set(t.id, s);
  });
  return out;
}

export function teacherCards(list: TeacherRec[]): Teacher[] {
  const slugs = teacherSlugs(list);
  return list.map((t, i) => ({
    ...t,
    slug: slugs.get(t.id) ?? t.id,
    initial: (t.name.replace(/^[^A-Za-z0-9]+/, "")[0] ?? "?").toUpperCase(),
    tone: i % 2 === 0 ? "blush" : "sand",
  }));
}
