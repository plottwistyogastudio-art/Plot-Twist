import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HideOnAdmin from "@/components/HideOnAdmin";
import WhatsAppButton from "@/components/WhatsAppButton";
import ReferralCapture from "@/components/ReferralCapture";
import { site } from "@/data/site";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
});
const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${site.name} | Yoga in Lippo Karawaci`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} | Yoga in Lippo Karawaci`,
    description: site.description,
    locale: "en_ID",
  },
  twitter: { card: "summary_large_image" },
};

// Helps Google show the studio with its address
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "YogaStudio",
  name: site.name,
  description: site.description,
  url: siteUrl,
  address: { "@type": "PostalAddress", streetAddress: site.addressLines[0], addressLocality: "Lippo Karawaci", addressCountry: "ID" },
  sameAs: [site.instagramUrl],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ReferralCapture />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <HideOnAdmin><Header /></HideOnAdmin>
        <main>{children}</main>
        <HideOnAdmin><Footer /></HideOnAdmin>
        <WhatsAppButton />
      </body>
    </html>
  );
}
