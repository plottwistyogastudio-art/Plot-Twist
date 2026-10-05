import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

// Public: the timetable and teachers (nothing private in here)
export async function GET() {
  return NextResponse.json({ config: await getConfig() }, { headers: { "cache-control": "no-store" } });
}
