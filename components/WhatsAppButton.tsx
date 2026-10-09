"use client";

import { usePathname } from "next/navigation";
import { site } from "@/data/site";

// Floating chat button (Twisty, round). Hidden until a WhatsApp number is set in data/site.ts, and inside /admin.
export default function WhatsAppButton() {
  const path = usePathname();
  if (site.whatsappUrl === "#" || path.startsWith("/admin")) return null;
  return (
    <a href={site.whatsappUrl} className="wa-float" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/twisty-round.png" alt="" width={64} height={64} />
    </a>
  );
}
