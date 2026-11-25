import "server-only";
import { db } from "../db";
import { accountBalances, totalBalance } from "./accounts";
import {
  addDays, financialMonth, MONTHS_SHORT_PT, shiftFinancialMonth, startOfDay, WEEKDAYS_SHORT_PT,
  monthKey, monthKeyLabel, type DateRange,
} from "@/lib/dates";
import { percentChange } from "@/lib/money";

export interface SeriesPoint {
  label: string;
  income: number;
  expense: number;
  balance: number | null;
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percent: number;
  count: number;
}

interface Bucket extends DateRange {
  label: string;
}

export async function periodTotals(userId: string, range: DateRange) {
  const rows = await db.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: range.start, lt: range.end }, type: { in: ["INCOME", "EXPENSE"] } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const income = rows.find((r) => r.type === "INCOME")?._sum.amount ?? 0;
  const expense = rows.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0;
  const count = rows.reduce((s, r) => s + r._count._all, 0);
  return { income, expense, net: income - expense, count };
}

/** Receitas, despesas e saldo acumulado das contas por intervalo. */
export async function flowSeries(userId: string, buckets: Bucket[], now = new Date()): Promise<SeriesPoint[]> {
  if (!buckets.length) return [];
  const first = buckets[0].start;
  const last = buckets[buckets.length - 1].end;
  const [txs, accounts] = await Promise.all([
    db.transaction.findMany({
      where: { userId, date: { gte: first, lt: last } },
      select: { type: true, amount: true, date: true, accountId: true, toAccountId: true },
    }),
    db.account.findMany({ where: { userId, includeInTotal: true, archived: false }, select: { id: true } }),
  ]);
  const included = new Set(accounts.map((a) => a.id));
  let running = await totalBalance(userId, first);
  const endOfToday = addDays(startOfDay(now), 1);

  return buckets.map((b) => {
    let income = 0;
    let expense = 0;
    for (const t of txs) {
      if (t.date < b.start || t.date >= b.end) continue;
      const from = t.accountId && included.has(t.accountId);
      const to = t.toAccountId && included.has(t.toAccountId);
      if (t.type === "INCOME") {
        income += t.amount;
        if (from) running += t.amount;
      } else if (t.type === "EXPENSE") {
        expense += t.amount;
        if (from) running -= t.amount;
      } else {
        if (from && !to) running -= t.amount;
        if (to && !from) running += t.amount;
      }
    }
    return { label: b.label, income, expense, balance: b.start < endOfToday ? running : null };
  });
}

export function dailyBuckets(range: DateRange, labelFn?: (d: Date) => string): Bucket[] {
  const out: Bucket[] = [];
  for (let d = new Date(range.start); d < range.end; d = addDays(d, 1)) {
    out.push({ start: d, end: addDays(d, 1), label: labelFn ? labelFn(d) : `${d.getDate()}/${d.getMonth() + 1}` });
  }
  return out;
}

export function monthlyBuckets(count: number, startDay: number, endRef = new Date()): Bucket[] {
  const cur = financialMonth(endRef, startDay);
  return Array.from({ length: count }, (_, i) => {
    const r = shiftFinancialMonth(cur, i - (count - 1), startDay);
    const key = monthKey(new Date(r.start.getFullYear(), r.start.getMonth(), 15));
    return { ...r, label: monthKeyLabel(key, true) };
  });
}

export async function categoryBreakdown(userId: string, range: DateRange, type: "EXPENSE" | "INCOME" = "EXPENSE"): Promise<CategorySlice[]> {
  const [groups, categories] = await Promise.all([
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type, date: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.category.findMany({ where: { userId }, select: { id: true, name: true, icon: true, color: true } }),
  ]);
  const total = groups.reduce((s, g) => s + (g._sum.amount ?? 0), 0);
  return groups
    .map((g) => {
      const c = categories.find((x) => x.id === g.categoryId);
      const amount = g._sum.amount ?? 0;
      return {
        categoryId: g.categoryId ?? "none",
        name: c?.name ?? "Sem categoria",
        icon: c?.icon ?? "📦",
        color: c?.color ?? "#94a3b8",
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
        count: g._count._all,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export async function dashboardData(userId: string, startDay: number, now = new Date()) {
  const range = financialMonth(now, startDay);
  const prev = shiftFinancialMonth(range, -1, startDay);

  const today = startOfDay(now);
  const weekRange = { start: addDays(today, -6), end: addDays(today, 1) };

  const [current, previous, balance, balancePrev, categories, week, month, year, recent, monthExpenses, accounts] = await Promise.all([
    periodTotals(userId, range),
    periodTotals(userId, prev),
    totalBalance(userId),
    totalBalance(userId, range.start),
    categoryBreakdown(userId, range),
    flowSeries(userId, dailyBuckets(weekRange, (d) => `${WEEKDAYS_SHORT_PT[d.getDay()]} ${d.getDate()}`), now),
    flowSeries(userId, dailyBuckets(range, (d) => `${d.getDate()} ${MONTHS_SHORT_PT[d.getMonth()]}`), now),
    flowSeries(userId, monthlyBuckets(12, startDay, now), now),
    db.transaction.findMany({
      where: { userId, date: { lt: addDays(today, 1) } },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        account: { select: { id: true, name: true, color: true } },
        toAccount: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    db.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: range.start, lt: range.end } },
      select: { id: true, description: true, amount: true, date: true, categoryId: true, installmentNumber: true, installmentTotal: true },
      orderBy: { amount: "desc" },
    }),
    accountBalances(userId),
  ]);

  const daysLeft = Math.max(1, Math.round((range.end.getTime() - today.getTime()) / 86_400_000));

  return {
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
    balance,
    balanceChange: percentChange(balance, balancePrev),
    income: current.income,
    incomeChange: percentChange(current.income, previous.income),
    expense: current.expense,
    expenseChange: percentChange(current.expense, previous.expense),
    available: current.net,
    availableChange: percentChange(current.net, previous.net),
    previous,
    daysLeft,
    series: { week, month, year },
    categories,
    monthExpenses: monthExpenses.map((t) => ({ ...t, date: t.date.toISOString() })),
    recent,
    accounts: accounts.filter((a) => !a.archived),
  };
}

export async function reportData(userId: string, range: DateRange, startDay: number, now = new Date()) {
  const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000);
  const buckets = days <= 62 ? dailyBuckets(range) : monthlyBucketsInRange(range, startDay);

  const [totals, byCategory, byIncomeCategory, series, comparison, patrimony, topExpenses, natures, methods] = await Promise.all([
    periodTotals(userId, range),
    categoryBreakdown(userId, range, "EXPENSE"),
    categoryBreakdown(userId, range, "INCOME"),
    flowSeries(userId, buckets, now),
    flowSeries(userId, monthlyBuckets(6, startDay, addDays(range.end, -1)), now),
    flowSeries(userId, monthlyBuckets(12, startDay, now), now),
    db.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: range.start, lt: range.end } },
      include: { category: { select: { id: true, name: true, icon: true, color: true } }, creditCard: { select: { id: true, name: true, color: true } }, account: { select: { id: true, name: true, color: true } }, toAccount: { select: { id: true, name: true, color: true } } },
      orderBy: { amount: "desc" },
      take: 10,
    }),
    db.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: range.start, lt: range.end } },
      select: { amount: true, category: { select: { nature: true } } },
    }),
    db.transaction.groupBy({
      by: ["paymentMethod"],
      where: { userId, type: "EXPENSE", date: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
    }),
  ]);

  const essential = natures.filter((n) => n.category?.nature !== "SUPERFLUOUS").reduce((s, n) => s + n.amount, 0);
  const superfluous = natures.filter((n) => n.category?.nature === "SUPERFLUOUS").reduce((s, n) => s + n.amount, 0);

  return {
    totals,
    byCategory,
    byIncomeCategory,
    series,
    comparison,
    patrimony: patrimony.map((p) => ({ label: p.label, balance: p.balance })),
    topExpenses,
    essential,
    superfluous,
    methods: methods.map((m) => ({ method: m.paymentMethod ?? "OTHER", amount: m._sum.amount ?? 0 })).sort((a, b) => b.amount - a.amount),
    granularity: days <= 62 ? ("day" as const) : ("month" as const),
  };
}

function monthlyBucketsInRange(range: DateRange, startDay: number): Bucket[] {
  const out: Bucket[] = [];
  let cur = financialMonth(range.start, startDay);
  while (cur.start < range.end && out.length < 36) {
    const start = cur.start < range.start ? range.start : cur.start;
    const end = cur.end > range.end ? range.end : cur.end;
    out.push({ start, end, label: monthKeyLabel(monthKey(new Date(cur.start.getFullYear(), cur.start.getMonth(), 15)), true) });
    cur = shiftFinancialMonth(cur, 1, startDay);
  }
  return out;
}
