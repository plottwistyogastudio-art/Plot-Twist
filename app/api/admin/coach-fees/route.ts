import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import { MONTH_RE, buildReport, cleanRate, count, getFeeSettings, money, percentage, saveFeeSettings, type Basis } from "@/lib/coachFees";

const jakartaMonth = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
const KEY = /^\d{4}-\d{2}-\d{2}_([01]\d|2[0-3]):[0-5]\d$/;
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const q = new URL(req.url).searchParams;
  const month = q.get("month") ?? jakartaMonth();
  if (!MONTH_RE.test(month)) return bad("Bad month");
  const basis: Basis = q.get("basis") === "booked" ? "booked" : "checked";
  return NextResponse.json(await buildReport(month, basis));
}

// { action: "rate", teacherId, mode: "flat"|"percent", base, perHead, percent }
// { action: "dropin", amount }
// { action: "people", key, count | null }      number of people for one class (null = use the app's count)
// { action: "override", key, amount | null }   fee for one class (null = use the coach's rate)
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return forbidden();
  const body = await req.json().catch(() => null);
  const settings = await getFeeSettings();

  if (body?.action === "rate") {
    const teacherId = String(body.teacherId ?? "");
    const cfg = await getConfig();
    if (!cfg.teachers.some((t) => t.id === teacherId)) return bad("Unknown coach.");
    const base = money(body.base ?? 0);
    const perHead = money(body.perHead ?? 0);
    const percent = percentage(body.percent ?? 0);
    if (base === null || perHead === null) return bad("Enter the amounts as whole numbers in IDR (0 is fine).");
    if (percent === null) return bad("The percentage must be between 0 and 100.");
    settings.rates[teacherId] = cleanRate({ mode: body.mode, base, perHead, percent });
  } else if (body?.action === "dropin") {
    const amount = money(body.amount);
    if (!amount) return bad("Enter the drop-in price in IDR.");
    settings.dropIn = amount;
  } else if (body?.action === "people") {
    const key = String(body.key ?? "");
    if (!KEY.test(key)) return bad("Bad class.");
    if (body.count === null || body.count === "") {
      delete settings.headcounts[key];
    } else {
      const n = count(body.count);
      if (n === null) return bad("Enter a whole number of people (0 to 200).");
      settings.headcounts[key] = n;
    }
  } else if (body?.action === "override") {
    const key = String(body.key ?? "");
    if (!KEY.test(key)) return bad("Bad class.");
    if (body.amount === null || body.amount === "") {
      delete settings.overrides[key];
    } else {
      const amount = money(body.amount);
      if (amount === null) return bad("Enter the fee as a whole number in IDR.");
      settings.overrides[key] = amount;
    }
  } else {
    return bad("Unknown action.");
  }

  const { error } = await saveFeeSettings(settings, admin.email ?? null);
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
