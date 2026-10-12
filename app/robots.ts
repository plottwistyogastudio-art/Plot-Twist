import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

const base = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/login", "/reset-password", "/book"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
