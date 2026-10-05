import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { bookClass } from "@/lib/booking";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { classKey } = await req.json();
  const result = await bookClass(user.id, String(classKey));
  const status = result.status === "error" ? 400 : result.status === "needs_payment" ? 402 : 200;
  return NextResponse.json(result, { status });
}
