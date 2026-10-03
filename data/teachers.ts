export type Teacher = {
  initial: string;
  name: string;
  styles: string;
  bio: string;
  tone: "blush" | "sand";
  // photo: "/teachers/anna.jpg",  // add a photo in /public/teachers and uncomment
};

// TODO: replace placeholders with real teachers.
export const teachers: Teacher[] = [
  { initial: "A", name: "[Teacher name]", styles: "Vinyasa · Slow Flow", tone: "blush", bio: "[One or two sentences about this teacher's background and teaching style.]" },
  { initial: "B", name: "[Teacher name]", styles: "Hatha · Foundations", tone: "sand", bio: "[One or two sentences about this teacher's background and teaching style.]" },
  { initial: "C", name: "[Teacher name]", styles: "Power Vinyasa", tone: "blush", bio: "[One or two sentences about this teacher's background and teaching style.]" },
  { initial: "D", name: "[Teacher name]", styles: "Yin & Restore", tone: "sand", bio: "[One or two sentences about this teacher's background and teaching style.]" },
  { initial: "E", name: "[Teacher name]", styles: "Vinyasa", tone: "sand", bio: "[One or two sentences about this teacher's background and teaching style.]" },
  { initial: "F", name: "[Teacher name]", styles: "Slow Flow · Yin", tone: "blush", bio: "[One or two sentences about this teacher's background and teaching style.]" },
  { initial: "G", name: "[Teacher name]", styles: "Hatha", tone: "sand", bio: "[One or two sentences about this teacher's background and teaching style.]" },
  { initial: "H", name: "[Teacher name]", styles: "Private sessions", tone: "blush", bio: "[One or two sentences about this teacher's background and teaching style.]" },
];
