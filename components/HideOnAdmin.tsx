"use client";

import { usePathname } from "next/navigation";

// The public header and footer are not shown inside /admin
export default function HideOnAdmin({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/admin") ? null : <>{children}</>;
}
