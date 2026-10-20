import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import { MONTH_RE, buildReport, getFeeSettings, money, saveFeeSettings, type Basis } from "@/lib/coachFees";

const jakartaMonth = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const q = new URL(req.url).searchParams;
  const month = q.get("month") ?? jakartaMonth();
  if (!MONTH_RE.test(month)) return NextResponse.json({ error: "Bad month" }, { status: 400 });
  const basis: Basis = q.get("basis") === "booked" ? "booked" : "checked";
  return NextResponse.json(await buildReport(month, basis));
}

// { action: "rate", teacherId, base, perHead }  or  { action: "override", key, amount | null }
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return forbidden();
  const body = await req.json().catch(() => null);
  const settings = await getFeeSettings();

  if (body?.action === "rate") {
    const teacherId = String(body.teacherId ?? "");
    const cfg = await getConfig();
    const base = money(body.base);
    const perHead = money(body.perHead);
    if (!cfg.teachers.some((t) => t.id === teacherId)) return NextResponse.json({ error: "Unknown coach." }, { status: 400 });
    if (base === null || perHead === null) return NextResponse.json({ error: "Enter the amounts as whole numbers in IDR (0 is fine)." }, { status: 400 });
    settings.rates[teacherId] = { base, perHead };
  } else if (body?.action === "override") {
    const key = String(body.key ?? "");
    if (!/^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/.test(key)) return NextResponse.json({ error: "Bad class." }, { status: 400 });
    if (body.amount === null || body.amount === "") {
      delete settings.overrides[key];
    } else {
      const amount = money(body.amount);
      if (amount === null) return NextResponse.json({ error: "Enter the fee as a whole number in IDR." }, { status: 400 });
      settings.overrides[key] = amount;
    }
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { error } = await saveFeeSettings(settings, admin.email ?? null);
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
