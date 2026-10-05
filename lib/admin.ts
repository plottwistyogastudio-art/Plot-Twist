import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";

// Returns the signed-in user only if their email is listed in ADMIN_EMAILS.
export async function requireAdmin(req: Request) {
  const user = await getUser(req);
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !list.includes(user.email.toLowerCase())) return null;
  return user;
}

export const forbidden = () => NextResponse.json({ error: "Not allowed" }, { status: 403 });
