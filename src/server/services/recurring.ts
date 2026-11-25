import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { notFound } from "../errors";
import { assertAccount, assertCategory } from "./ownership";
import { defaultAccountId, searchTextOf } from "./transactions";
import { atNoon, dateAtDay, financialMonth, parseDateInput, startOfDay } from "@/lib/dates";
import type { payRecurringSchema, recurringExpenseSchema, updateRecurringExpenseSchema } from "@/lib/validation";

export interface RecurringStatus {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  dueMonth: number | null;
  recurrence: string;
  active: boolean;
  categoryId: string | null;
  accountId: string | null;
  category: { name: string; icon: string; color: string } | null;
  dueThisMonth: boolean;
  paidThisMonth: boolean;
  nextDue: string;
  daysUntilDue: number;
  overdue: boolean;
}

/** Contas recorrentes com o status do mês corrente (paga, vence em X dias, atrasada). */
export async function recurringWithStatus(userId: string, startDay = 1, now = new Date()): Promise<RecurringStatus[]> {
  const range = financialMonth(now, startDay);
  const items = await db.recurringExpense.findMany({
    where: { userId },
    include: {
      category: { select: { name: true, icon: true, color: true } },
      transactions: { where: { date: { gte: range.start, lt: range.end } }, select: { id: true } },
    },
    orderBy: [{ active: "desc" }, { dueDay: "asc" }],
  });
  const today = startOfDay(now);

  return items.map((r) => {
    const dueThisMonth = r.recurrence !== "YEARLY" || r.dueMonth === now.getMonth() + 1;
    const paidThisMonth = r.transactions.length > 0;
    let due = dateAtDay(now.getFullYear(), now.getMonth(), r.dueDay);
    if (r.recurrence === "YEARLY" && r.dueMonth) {
      due = dateAtDay(now.getFullYear(), r.dueMonth - 1, r.dueDay);
      if (startOfDay(due) < today && paidThisMonth) due = dateAtDay(now.getFullYear() + 1, r.dueMonth - 1, r.dueDay);
      else if (startOfDay(due) < today && !dueThisMonth) due = dateAtDay(now.getFullYear() + 1, r.dueMonth - 1, r.dueDay);
    } else if (paidThisMonth) {
      due = dateAtDay(now.getFullYear(), now.getMonth() + 1, r.dueDay);
    }
    const daysUntilDue = Math.round((startOfDay(due).getTime() - today.getTime()) / 86_400_000);
    return {
      id: r.id,
      name: r.name,
      amount: r.amount,
      dueDay: r.dueDay,
      dueMonth: r.dueMonth,
      recurrence: r.recurrence,
      active: r.active,
      categoryId: r.categoryId,
      accountId: r.accountId,
      category: r.category,
      dueThisMonth,
      paidThisMonth,
      nextDue: due.toISOString(),
      daysUntilDue,
      overdue: r.active && dueThisMonth && !paidThisMonth && daysUntilDue < 0,
    };
  });
}

/** Custo mensal equivalente das contas fixas ativas (anuais divididas por 12). */
export async function monthlyFixedCost(userId: string) {
  const items = await db.recurringExpense.findMany({ where: { userId, active: true }, select: { amount: true, recurrence: true } });
  return items.reduce((s, r) => s + (r.recurrence === "YEARLY" ? Math.round(r.amount / 12) : r.amount), 0);
}

export async function createRecurring(userId: string, input: z.output<typeof recurringExpenseSchema>) {
  const categoryId = await assertCategory(userId, input.categoryId, "EXPENSE");
  const accountId = await assertAccount(userId, input.accountId);
  return db.recurringExpense.create({
    data: { ...input, categoryId, accountId, dueMonth: input.recurrence === "YEARLY" ? input.dueMonth ?? new Date().getMonth() + 1 : null, userId },
  });
}

export async function updateRecurring(userId: string, id: string, input: z.output<typeof updateRecurringExpenseSchema>) {
  const r = await db.recurringExpense.findFirst({ where: { id, userId } });
  if (!r) throw notFound("Conta recorrente");
  const data = { ...input };
  if (input.categoryId !== undefined) data.categoryId = await assertCategory(userId, input.categoryId, "EXPENSE");
  if (input.accountId !== undefined) data.accountId = await assertAccount(userId, input.accountId);
  return db.recurringExpense.update({ where: { id }, data });
}

export async function deleteRecurring(userId: string, id: string) {
  const res = await db.recurringExpense.deleteMany({ where: { id, userId } });
  if (!res.count) throw notFound("Conta recorrente");
}

/** Marca a conta do mês como paga, gerando a despesa correspondente. */
export async function payRecurring(userId: string, id: string, input: z.output<typeof payRecurringSchema>) {
  const r = await db.recurringExpense.findFirst({ where: { id, userId } });
  if (!r) throw notFound("Conta recorrente");
  const accountId = (await assertAccount(userId, input.accountId ?? r.accountId)) ?? (await defaultAccountId(userId));
  return db.transaction.create({
    data: {
      userId,
      type: "EXPENSE",
      amount: input.amount ?? r.amount,
      description: r.name,
      searchText: searchTextOf(r.name),
      date: input.date ? parseDateInput(input.date) : atNoon(new Date()),
      categoryId: r.categoryId,
      accountId,
      paymentMethod: "BOLETO",
      recurringExpenseId: r.id,
    },
  });
}
