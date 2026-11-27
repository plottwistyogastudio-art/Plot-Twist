// Server only: studio finances (income from paid orders, coach fees, other expenses).
// Other expenses live in site_config (key "expenses"), so no database change is needed.
import { supabaseAdmin } from "@/lib/supabase";
import { buildReport, money, MONTH_RE, type Basis } from "@/lib/coachFees";
import { findPackage } from "@/lib/booking-shared";

export const FIRST_MONTH = "2026-10"; // studio opened 15 Oct 2026
export const CATEGORIES = ["Rent", "Salaries", "Utilities", "Marketing", "Supplies", "Equipment", "Payment fees", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Expense = { id: string; date: string; category: Category; note: string; amount: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const jakartaDate = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 10);
export const jakartaMonthNow = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);

function cleanExpenses(raw: unknown): Expense[] {
  const list = Array.isArray((raw as { items?: unknown })?.items) ? ((raw as { items: unknown[] }).items) : [];
  const out: Expense[] = [];
  for (const r of list.slice(0, 5000) as Partial<Expense>[]) {
    const amount = money(r?.amount);
    if (!r?.id || !DATE_RE.test(String(r.date)) || !amount || !CATEGORIES.includes(r.category as Category)) continue;
    out.push({ id: String(r.id).slice(0, 40), date: String(r.date), category: r.category as Category, note: String(r.note ?? "").slice(0, 120), amount });
  }
  return out;
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const { data } = await supabaseAdmin().from("site_config").select("value").eq("key", "expenses").maybeSingle();
    return cleanExpenses(data?.value);
  } catch {
    return [];
  }
}

export async function saveExpenses(items: Expense[], email: string | null) {
  return supabaseAdmin().from("site_config").upsert({ key: "expenses", value: { items: cleanExpenses({ items }) }, updated_at: new Date().toISOString(), updated_by: email });
}

export function validateExpense(b: Record<string, unknown>): { expense?: Omit<Expense, "id">; error?: string } {
  const date = String(b.date ?? "");
  const amount = money(b.amount);
  if (!DATE_RE.test(date)) return { error: "Pick a date." };
  if (!amount) return { error: "Enter the amount in IDR." };
  if (!CATEGORIES.includes(b.category as Category)) return { error: "Pick a category." };
  return { expense: { date, category: b.category as Category, note: String(b.note ?? "").trim().slice(0, 120), amount } };
}

type PaidOrder = { amount: number; package_id: string; paid_at: string };
async function paidOrders(): Promise<PaidOrder[]> {
  const db = supabaseAdmin();
  const out: PaidOrder[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("orders").select("amount,package_id,paid_at")
      .eq("status", "paid").not("paid_at", "is", null).gte("paid_at", `${FIRST_MONTH}-01T00:00:00+07:00`)
      .order("paid_at").order("id").range(from, from + 999);
    if (error || !data) break;
    out.push(...(data as PaidOrder[]));
    if (data.length < 1000) break;
  }
  return out;
}

export type DayRow = { date: string; orders: number; income: number; coachFees: number; other: number };
export type MonthRow = { month: string; orders: number; income: number; coachFees: number; other: number };
export type FinanceReport = {
  month: string; basis: Basis;
  totals: { orders: number; income: number; coachFees: number; other: number; net: number };
  days: DayRow[];
  byPackage: { name: string; orders: number; income: number }[];
  byCategory: { category: string; amount: number }[];
  expenses: Expense[];
  months: MonthRow[];
  noCheckins: number;
};

export async function buildFinance(month: string, basis: Basis): Promise<FinanceReport> {
  if (!MONTH_RE.test(month)) throw new Error("Bad month");
  const [orders, expenses] = await Promise.all([paidOrders(), getExpenses()]);

  // every month from the opening month until now (or the selected month, if later)
  const last = month > jakartaMonthNow() ? month : jakartaMonthNow();
  const monthList: string[] = [];
  for (let m = FIRST_MONTH; m <= last; ) {
    monthList.push(m);
    const [y, mm] = m.split("-").map(Number);
    m = mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, "0")}`;
  }
  const reports = await Promise.all(monthList.map((m) => buildReport(m, basis)));
  const feeByMonth = new Map(reports.map((r) => [r.month, r.totals.fee]));
  const thisReport = reports[monthList.indexOf(month)] ?? (await buildReport(month, basis));

  const months: MonthRow[] = monthList.map((m) => ({ month: m, orders: 0, income: 0, coachFees: feeByMonth.get(m) ?? 0, other: 0 }));
  const monthRow = (m: string) => months.find((x) => x.month === m);

  const days = new Map<string, DayRow>();
  const dayRow = (d: string) => {
    let r = days.get(d);
    if (!r) { r = { date: d, orders: 0, income: 0, coachFees: 0, other: 0 }; days.set(d, r); }
    return r;
  };
  const pkg = new Map<string, { name: string; orders: number; income: number }>();

  for (const o of orders) {
    const d = jakartaDate(o.paid_at);
    const mr = monthRow(d.slice(0, 7));
    if (mr) { mr.orders++; mr.income += o.amount; }
    if (d.slice(0, 7) !== month) continue;
    const r = dayRow(d); r.orders++; r.income += o.amount;
    const name = findPackage(o.package_id)?.name ?? o.package_id;
    const p = pkg.get(name) ?? { name, orders: 0, income: 0 };
    p.orders++; p.income += o.amount; pkg.set(name, p);
  }
  for (const e of expenses) {
    const mr = monthRow(e.date.slice(0, 7));
    if (mr) mr.other += e.amount;
    if (e.date.slice(0, 7) === month) dayRow(e.date).other += e.amount;
  }
  for (const c of thisReport.coaches) for (const k of c.classes) dayRow(k.date).coachFees += k.fee;

  const dayList = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const monthExpenses = expenses.filter((e) => e.date.slice(0, 7) === month).sort((a, b) => b.date.localeCompare(a.date));
  const cat = new Map<string, number>();
  for (const e of monthExpenses) cat.set(e.category, (cat.get(e.category) ?? 0) + e.amount);

  const sum = (f: (d: DayRow) => number) => dayList.reduce((n, d) => n + f(d), 0);
  const t = { orders: sum((d) => d.orders), income: sum((d) => d.income), coachFees: sum((d) => d.coachFees), other: sum((d) => d.other) };
  return {
    month, basis,
    totals: { ...t, net: t.income - t.coachFees - t.other },
    days: dayList,
    byPackage: [...pkg.values()].sort((a, b) => b.income - a.income),
    byCategory: [...cat.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    expenses: monthExpenses,
    months,
    noCheckins: thisReport.noCheckins,
  };
}
