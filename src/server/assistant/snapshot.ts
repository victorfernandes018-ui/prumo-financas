import "server-only";
import { db } from "../db";
import type { SafeUser } from "../auth/session";
import { accountBalances } from "../services/accounts";
import { categoryBreakdown, periodTotals } from "../services/analytics";
import { budgetsWithSpending } from "../services/budgets";
import { cardsOverview } from "../services/cards";
import { recurringWithStatus } from "../services/recurring";
import { financialMonth, shiftFinancialMonth, startOfDay } from "@/lib/dates";
import type { FinancialSnapshot } from "./types";

/** Monta o retrato financeiro que serve de "fonte da verdade" para o assistente. */
export async function buildSnapshot(user: SafeUser, now = new Date()): Promise<FinancialSnapshot> {
  const range = financialMonth(now, user.monthStartDay);
  const prev = shiftFinancialMonth(range, -1, user.monthStartDay);
  const [accounts, month, previousMonth, cats, prevCats, top, budgets, goals, cards, bills, creditSpent] = await Promise.all([
    accountBalances(user.id),
    periodTotals(user.id, range),
    periodTotals(user.id, prev),
    categoryBreakdown(user.id, range),
    categoryBreakdown(user.id, prev),
    db.transaction.findMany({
      where: { userId: user.id, type: "EXPENSE", date: { gte: range.start, lt: range.end } },
      include: { category: { select: { name: true } } },
      orderBy: { amount: "desc" },
      take: 8,
    }),
    budgetsWithSpending(user.id, user.monthStartDay, now),
    db.goal.findMany({ where: { userId: user.id } }),
    cardsOverview(user.id, now),
    recurringWithStatus(user.id, user.monthStartDay, now),
    db.transaction.groupBy({
      by: ["creditCardId"],
      where: { userId: user.id, type: "EXPENSE", creditCardId: { not: null }, date: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
    }),
  ]);
  const active = accounts.filter((a) => !a.archived);

  return {
    currency: user.currency,
    today: now.toISOString(),
    period: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      daysLeft: Math.max(1, Math.round((range.end.getTime() - startOfDay(now).getTime()) / 86_400_000)),
    },
    balance: active.filter((a) => a.includeInTotal).reduce((s, a) => s + a.balance, 0),
    accounts: active.map((a) => ({ name: a.name, type: a.type, balance: a.balance })),
    month: { income: month.income, expense: month.expense, net: month.net },
    previousMonth: { income: previousMonth.income, expense: previousMonth.expense, net: previousMonth.net },
    categories: cats.map((c) => ({ name: c.name, icon: c.icon, amount: c.amount, previousAmount: prevCats.find((p) => p.categoryId === c.categoryId)?.amount ?? 0 })),
    topExpenses: top.map((t) => ({ description: t.description, amount: t.amount, date: t.date.toISOString(), category: t.category?.name ?? "Sem categoria" })),
    budgets: budgets.map((b) => ({ category: b.category.name, amount: b.amount, spent: b.spent })),
    goals: goals.map((g) => ({ name: g.name, target: g.targetAmount, current: g.currentAmount, deadline: g.deadline?.toISOString() ?? null })),
    cards: cards.map((c) => ({
      name: c.name,
      currentInvoice: c.currentInvoice.total,
      limit: c.limit,
      available: c.available,
      creditSpentThisMonth: creditSpent.find((s) => s.creditCardId === c.id)?._sum.amount ?? 0,
    })),
    pendingBills: bills.filter((b) => b.active && b.dueThisMonth && !b.paidThisMonth).map((b) => ({ name: b.name, amount: b.amount, dueDay: b.dueDay })),
  };
}
