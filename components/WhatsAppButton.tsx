"use client";

import { usePathname } from "next/navigation";
import { site } from "@/data/site";

// Floating chat button. Hidden until a WhatsApp number is set in data/site.ts, and inside /admin.
export default function WhatsAppButton() {
  const path = usePathname();
  if (site.whatsappUrl === "#" || path.startsWith("/admin")) return null;
  return (
    <a href={site.whatsappUrl} className="wa-float" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.2 15.03l-.3-.18-3.1.82.83-3.02-.2-.31A8.1 8.1 0 0 1 12.04 3.8zM8.7 7.4c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.07 3.3 5.1 4.5 2.52 1 3.03.8 3.58.75.55-.05 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35s-1.77-.87-2.04-.97c-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57z" />
      </svg>
    </a>
  );
}
