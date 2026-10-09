"use client";

import { useEffect } from "react";
import { REFERRAL_STORAGE_KEY, normaliseCode } from "@/data/referral";

// Remembers a ?ref=CODE from a friend's link until the visitor signs up and checks out.
export default function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) localStorage.setItem(REFERRAL_STORAGE_KEY, normaliseCode(ref).slice(0, 20));
    } catch { /* storage blocked: the code can still be typed at checkout */ }
  }, []);
  return null;
}
