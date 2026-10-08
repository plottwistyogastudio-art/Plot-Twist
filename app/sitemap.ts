import { teacherCards } from "@/data/teachers";
import type { MetadataRoute } from "next";
import { getConfig } from "@/lib/config";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const teachers = teacherCards((await getConfig()).teachers).map((t) => `/teachers/${t.slug}`);
  return ["", "/schedule", "/packages", "/teachers", ...teachers, "/class-guide", "/terms", "/privacy"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
