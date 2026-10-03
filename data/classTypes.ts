export type ClassType = {
  name: string;
  desc: string;
  level: string;
  intensity: string;
  goodFor: string;
};

export const classTypes: ClassType[] = [
  { name: "Vinyasa Flow", desc: "Breath-led movement linking poses into a flowing sequence. Expect to move, build heat and feel energised.", level: "All levels", intensity: "Medium to strong", goodFor: "building strength and getting your energy up" },
  { name: "Power Vinyasa", desc: "A faster, more challenging flow with longer holds and more strength work.", level: "Intermediate", intensity: "Strong", goodFor: "regular practitioners ready for more challenge" },
  { name: "Slow Flow", desc: "A gentler pace with time to settle into each shape and focus on your breath.", level: "Beginner friendly", intensity: "Light to medium", goodFor: "easing in, or a mindful midweek reset" },
  { name: "Hatha Foundations", desc: "Classic poses held with clear alignment cues. A great base for the rest of your practice.", level: "Beginner", intensity: "Light", goodFor: "first-timers and anyone who loves clear instruction" },
  { name: "Yin & Restore", desc: "Long, quiet holds that release deep tension. Props and a calm room do most of the work.", level: "All levels", intensity: "Gentle", goodFor: "unwinding after a long day or a hard workout" },
  { name: "Private Session", desc: "One-on-one time with a teacher, shaped around your body, goals and schedule.", level: "All levels", intensity: "Your pace", goodFor: "personal guidance and going deeper" },
];
