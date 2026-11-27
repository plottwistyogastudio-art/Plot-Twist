import { NextResponse } from "next/server";
import { requireAdmin, forbidden } from "@/lib/admin";
import { MONTH_RE, type Basis } from "@/lib/coachFees";
import { buildFinance, getExpenses, jakartaMonthNow, saveExpenses, validateExpense } from "@/lib/finance";

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return forbidden();
  const q = new URL(req.url).searchParams;
  const month = q.get("month") ?? jakartaMonthNow();
  if (!MONTH_RE.test(month)) return bad("Bad month");
  const basis: Basis = q.get("basis") === "booked" ? "booked" : "checked";
  return NextResponse.json(await buildFinance(month, basis));
}

// { action: "add", date, category, note, amount }   add an expense (rent, marketing, ...)
// { action: "delete", id }
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return forbidden();
  const body = await req.json().catch(() => null);
  const items = await getExpenses();

  if (body?.action === "add") {
    const v = validateExpense(body);
    if (!v.expense) return bad(v.error ?? "Check the form.");
    items.push({ id: crypto.randomUUID(), ...v.expense });
  } else if (body?.action === "delete") {
    const i = items.findIndex((e) => e.id === String(body.id ?? ""));
    if (i < 0) return bad("Expense not found.");
    items.splice(i, 1);
  } else {
    return bad("Unknown action.");
  }

  const { error } = await saveExpenses(items, admin.email ?? null);
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
