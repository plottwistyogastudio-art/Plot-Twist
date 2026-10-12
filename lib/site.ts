// The public address of the website, used in links we send (WhatsApp, email, payment return page, sitemap).
// If NEXT_PUBLIC_SITE_URL is missing or still points at a development address (localhost,
// GitHub Codespaces, a Vercel preview), we use the real domain instead.
export const PRODUCTION_SITE = "https://plottwist.id";

export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (!/^https:\/\//.test(raw)) return PRODUCTION_SITE;
  if (/localhost|127\.0\.0\.1|github\.dev|githubpreview|\.vercel\.app/i.test(raw)) return PRODUCTION_SITE;
  return raw;
}
