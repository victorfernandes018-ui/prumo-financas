import "server-only";
import { db } from "../db";
import { notFound } from "../errors";
import { assertCategory } from "./ownership";
import { financialMonth } from "@/lib/dates";

export interface BudgetStatus {
  id: string;
  categoryId: string;
  category: { name: string; icon: string; color: string };
  amount: number;
  spent: number;
  percent: number;
  remaining: number;
  status: "ok" | "warning" | "exceeded";
}

export async function budgetsWithSpending(userId: string, startDay = 1, now = new Date()): Promise<BudgetStatus[]> {
  const range = financialMonth(now, startDay);
  const [budgets, spending] = await Promise.all([
    db.budget.findMany({ where: { userId }, include: { category: { select: { name: true, icon: true, color: true } } } }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
    }),
  ]);
  return budgets
    .map((b) => {
      const spent = spending.find((s) => s.categoryId === b.categoryId)?._sum.amount ?? 0;
      const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      return {
        id: b.id,
        categoryId: b.categoryId,
        category: b.category,
        amount: b.amount,
        spent,
        percent,
        remaining: b.amount - spent,
        status: (percent > 100 ? "exceeded" : percent >= 80 ? "warning" : "ok") as BudgetStatus["status"],
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

export async function upsertBudget(userId: string, categoryId: string, amount: number) {
  await assertCategory(userId, categoryId, "EXPENSE");
  return db.budget.upsert({
    where: { categoryId },
    create: { userId, categoryId, amount },
    update: { amount },
  });
}

export async function deleteBudget(userId: string, id: string) {
  const res = await db.budget.deleteMany({ where: { id, userId } });
  if (!res.count) throw notFound("Orçamento");
}
