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
  { name: "Hatha for Beginners", desc: "A gentle, welcoming practice built on foundational postures, alignment, and breath. Zero experience needed.", level: "Beginner", intensity: "Light", goodFor: "first-timers and anyone who loves clear instruction" },
  { name: "Hatha Vinyasa", desc: "A dynamic, breath-led practice that blends the mindful alignment of Hatha with the fluid transitions of Vinyasa, to build strength, mobility, and balance.", level: "All levels", intensity: "Light to medium", goodFor: "building strength and mobility at a steady pace" },
  { name: "Power Yoga", desc: "A strong, energising flow that links breath and movement to build strength, stamina, and focus. Expect longer holds, steady heat, and a good sweat. Made for routine movers: best if you already exercise or practise regularly.", level: "For routine movers", intensity: "Medium to strong", goodFor: "building strength and stamina, or a workout that clears your head" },
  { name: "Yin & Restore", desc: "Long, quiet holds that release deep tension. Props and a calm room do most of the work.", level: "All levels", intensity: "Gentle", goodFor: "unwinding after a long day or a hard workout" },
  { name: "Restorative Yoga", desc: "A slow, deeply relaxing practice where your body is fully supported by props like bolsters, blocks and blankets. You stay in each shape for several minutes and do very little, so your nervous system can settle. No stretching goals, no effort.", level: "All levels", intensity: "Very gentle", goodFor: "recovering from a busy week, stress or poor sleep, and slowing down at the end of the day" },
  { name: "Prenatal Yoga", desc: "Gentle, supportive movement and breathing for pregnancy, taught by a certified prenatal yoga teacher.", level: "All levels", intensity: "Gentle", goodFor: "staying comfortable and connected during pregnancy (please check with your doctor or midwife first)" },
  { name: "Mat Pilates", desc: "Controlled, core-focused movement on the mat, with an emphasis on alignment and body awareness.", level: "All levels", intensity: "Light to medium", goodFor: "building core strength and body awareness" },
  { name: "Private Session", desc: "One-on-one time with a teacher, shaped around your body, goals and schedule.", level: "All levels", intensity: "Your pace", goodFor: "personal guidance and going deeper" },
];

// Short explanations shown under the schedule ("What do these mean?")
export const typeInfo: Record<string, string> = {
  Vinyasa: "Breath-led movement linking poses into a flowing sequence. You'll move, build heat and feel energised.",
  "Slow Flow": "A gentler flow with time to settle into each shape and focus on your breath.",
  Hatha: "Classic poses held with clear alignment cues, at a steady pace. A solid base for the rest of your practice.",
  "Hatha Vinyasa": "A dynamic, breath-led practice that blends the mindful alignment of Hatha with the fluid transitions of Vinyasa. All levels.",
  "Power Yoga": "A strong, energising flow that builds strength, stamina, and focus, with longer holds and a good sweat. For routine movers who already exercise or practise regularly.",
  Yin: "Long, quiet holds that release deep tension. Props and a calm room do most of the work.",
  Restorative: "A slow, deeply relaxing practice with the body fully supported by props. Long, still holds so you can rest, breathe and let go. All levels, very gentle.",
  Prenatal: "Gentle, supportive movement and breathing for pregnancy. Please check with your doctor or midwife first.",
  "Mat Pilates": "Controlled, core-focused movement on the mat, with attention to alignment and body awareness.",
};

export const levelInfo: Record<string, string> = {
  Beginner: "New to yoga, or coming back after a break. The basics are explained and the pace is easy.",
  "All levels": "Everyone is welcome. Your teacher offers options to make poses gentler or stronger.",
  Intermediate: "Best with some regular practice. Expect a faster pace, longer holds and more strength work.",
};
