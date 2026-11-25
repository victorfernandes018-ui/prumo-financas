import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "../db";
import { ApiError, notFound } from "../errors";
import { assertAccount, assertCard, assertCategory } from "./ownership";
import { invoiceKeyFor, splitInstallments } from "@/lib/cards";
import { addDays, addMonths, monthKeyAdd, parseDateInput, startOfDay } from "@/lib/dates";
import { normalize } from "@/lib/utils";
import type { Recurrence } from "@/lib/constants";
import type { TransactionFilters, transactionSchema, updateTransactionSchema } from "@/lib/validation";

type CreateInput = z.output<typeof transactionSchema>;

export const transactionInclude = {
  category: { select: { id: true, name: true, icon: true, color: true } },
  account: { select: { id: true, name: true, color: true } },
  toAccount: { select: { id: true, name: true, color: true } },
  creditCard: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TransactionInclude;

export type TransactionWithRelations = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

export const searchTextOf = (description: string, notes?: string | null) => normalize(`${description} ${notes ?? ""}`.trim());

export async function defaultAccountId(userId: string) {
  const acc = await db.account.findFirst({
    where: { userId, archived: false },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return acc?.id ?? null;
}

/**
 * Cria receita, despesa (à vista, parcelada ou no cartão) ou transferência.
 * Retorna a primeira transação criada.
 */
export async function createTransaction(userId: string, input: CreateInput) {
  const date = parseDateInput(input.date);
  const base = {
    userId,
    description: input.description,
    notes: input.notes ?? null,
    searchText: searchTextOf(input.description, input.notes),
  };

  // --- Transferência entre contas (não conta como receita nem despesa)
  if (input.type === "TRANSFER") {
    await assertAccount(userId, input.accountId);
    await assertAccount(userId, input.toAccountId);
    return db.transaction.create({
      data: { ...base, type: "TRANSFER", amount: input.amount, date, accountId: input.accountId, toAccountId: input.toAccountId, paymentMethod: "TRANSFER" },
      include: transactionInclude,
    });
  }

  const categoryId = await assertCategory(userId, input.categoryId, input.type);

  // --- Receita
  if (input.type === "INCOME") {
    const accountId = (await assertAccount(userId, input.accountId)) ?? (await defaultAccountId(userId));
    return db.transaction.create({
      data: { ...base, type: "INCOME", amount: input.amount, date, categoryId, accountId, paymentMethod: input.paymentMethod ?? null, recurrence: input.recurrence },
      include: transactionInclude,
    });
  }

  // --- Despesa no cartão de crédito
  if (input.paymentMethod === "CREDIT") {
    const card = await assertCard(userId, input.creditCardId);
    if (!card) throw new ApiError(422, "Escolha o cartão", { creditCardId: "Escolha o cartão" });
    const n = input.installments;
    const firstKey = invoiceKeyFor(card, date);
    const parts = splitInstallments(input.amount, n);

    return db.$transaction(async (tx) => {
      const purchase = await tx.creditCardTransaction.create({
        data: { userId, creditCardId: card.id, categoryId, description: input.description, totalAmount: input.amount, installments: n, purchaseDate: date },
      });
      const groupId = n > 1 ? purchase.id : null;
      await tx.transaction.createMany({
        data: parts.map((amount, i) => ({
          ...base,
          type: "EXPENSE",
          amount,
          date: addMonths(date, i),
          categoryId,
          accountId: null,
          paymentMethod: "CREDIT",
          creditCardId: card.id,
          creditCardTransactionId: purchase.id,
          invoiceKey: monthKeyAdd(firstKey, i),
          installmentGroupId: groupId,
          installmentNumber: n > 1 ? i + 1 : null,
          installmentTotal: n > 1 ? n : null,
          recurrence: n === 1 ? input.recurrence : "NONE",
          paid: false,
        })),
      });
      return tx.transaction.findFirstOrThrow({
        where: { creditCardTransactionId: purchase.id },
        orderBy: { date: "asc" },
        include: transactionInclude,
      });
    });
  }

  // --- Despesa em conta (à vista ou parcelada em boleto/carnê etc.)
  const accountId = (await assertAccount(userId, input.accountId)) ?? (await defaultAccountId(userId));
  const n = input.installments;
  if (n === 1) {
    return db.transaction.create({
      data: { ...base, type: "EXPENSE", amount: input.amount, date, categoryId, accountId, paymentMethod: input.paymentMethod ?? null, recurrence: input.recurrence },
      include: transactionInclude,
    });
  }
  const groupId = randomUUID();
  const parts = splitInstallments(input.amount, n);
  await db.transaction.createMany({
    data: parts.map((amount, i) => ({
      ...base,
      type: "EXPENSE",
      amount,
      date: addMonths(date, i),
      categoryId,
      accountId,
      paymentMethod: input.paymentMethod ?? null,
      installmentGroupId: groupId,
      installmentNumber: i + 1,
      installmentTotal: n,
    })),
  });
  return db.transaction.findFirstOrThrow({ where: { installmentGroupId: groupId }, orderBy: { date: "asc" }, include: transactionInclude });
}

export async function updateTransaction(userId: string, id: string, input: z.output<typeof updateTransactionSchema>) {
  const tx = await db.transaction.findFirst({ where: { id, userId } });
  if (!tx) throw notFound("Transação");
  if (tx.isInvoicePayment) throw new ApiError(422, "Pagamentos de fatura não podem ser editados. Exclua e pague novamente.");

  const type = tx.type === "INCOME" ? "INCOME" : "EXPENSE";
  const categoryId = input.categoryId !== undefined && tx.type !== "TRANSFER" ? await assertCategory(userId, input.categoryId, type) : undefined;
  const accountId = input.accountId !== undefined && !tx.creditCardId ? await assertAccount(userId, input.accountId) : undefined;
  const description = input.description ?? tx.description;
  const notes = input.notes !== undefined ? input.notes : tx.notes;

  // Compra no cartão: descrição e categoria valem para todas as parcelas; valor não pode mudar
  if (tx.creditCardTransactionId) {
    if (input.amount !== undefined && input.amount !== tx.amount)
      throw new ApiError(422, "Para alterar o valor de uma compra no cartão, exclua e lance novamente.");
    await db.$transaction([
      db.transaction.updateMany({
        where: { creditCardTransactionId: tx.creditCardTransactionId, userId },
        data: { description, notes, searchText: searchTextOf(description, notes), ...(categoryId !== undefined ? { categoryId } : {}) },
      }),
      db.creditCardTransaction.update({
        where: { id: tx.creditCardTransactionId },
        data: { description, ...(categoryId !== undefined ? { categoryId } : {}) },
      }),
    ]);
    return db.transaction.findUniqueOrThrow({ where: { id }, include: transactionInclude });
  }

  return db.transaction.update({
    where: { id },
    data: {
      description,
      notes,
      searchText: searchTextOf(description, notes),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.date ? { date: parseDateInput(input.date) } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(accountId !== undefined ? { accountId } : {}),
      ...(input.paid !== undefined ? { paid: input.paid } : {}),
      ...(input.stopRecurrence ? { recurrence: "NONE" } : {}),
    },
    include: transactionInclude,
  });
}

/** Exclui uma transação. Parcelas de uma compra são excluídas juntas (scope "all"). */
export async function deleteTransaction(userId: string, id: string, scope: "single" | "all" = "single") {
  const tx = await db.transaction.findFirst({ where: { id, userId } });
  if (!tx) throw notFound("Transação");

  if (tx.isInvoicePayment && tx.creditCardId) {
    // Estornar pagamento de fatura: as parcelas daquela fatura voltam a ficar em aberto
    const key = tx.invoiceKey;
    await db.$transaction([
      db.transaction.updateMany({ where: { userId, creditCardId: tx.creditCardId, invoiceKey: key, isInvoicePayment: false }, data: { paid: false } }),
      db.transaction.delete({ where: { id } }),
    ]);
    return { deleted: 1 };
  }
  if (tx.creditCardTransactionId) {
    await db.creditCardTransaction.delete({ where: { id: tx.creditCardTransactionId } });
    return { deleted: tx.installmentTotal ?? 1 };
  }
  if (scope === "all" && tx.installmentGroupId) {
    const r = await db.transaction.deleteMany({ where: { userId, installmentGroupId: tx.installmentGroupId } });
    return { deleted: r.count };
  }
  await db.transaction.delete({ where: { id } });
  return { deleted: 1 };
}

export async function getTransaction(userId: string, id: string) {
  const tx = await db.transaction.findFirst({ where: { id, userId }, include: transactionInclude });
  if (!tx) throw notFound("Transação");
  return tx;
}

export async function listTransactions(userId: string, f: TransactionFilters) {
  const where: Prisma.TransactionWhereInput = { userId };
  const and: Prisma.TransactionWhereInput[] = [];

  if (f.search?.trim()) {
    const q = normalize(f.search.trim());
    const cats = await db.category.findMany({ where: { userId }, select: { id: true, name: true } });
    const catIds = cats.filter((c) => normalize(c.name).includes(q)).map((c) => c.id);
    and.push({ OR: [{ searchText: { contains: q } }, ...(catIds.length ? [{ categoryId: { in: catIds } }] : [])] });
  }
  if (f.type) where.type = f.type;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.accountId) and.push({ OR: [{ accountId: f.accountId }, { toAccountId: f.accountId }] });
  if (f.paymentMethod) where.paymentMethod = f.paymentMethod;
  if (f.from || f.to) {
    where.date = {
      ...(f.from ? { gte: startOfDay(parseDateInput(f.from)) } : {}),
      ...(f.to ? { lt: addDays(startOfDay(parseDateInput(f.to)), 1) } : {}),
    };
  }
  if (f.minAmount !== undefined || f.maxAmount !== undefined) {
    where.amount = { ...(f.minAmount !== undefined ? { gte: f.minAmount } : {}), ...(f.maxAmount !== undefined ? { lte: f.maxAmount } : {}) };
  }
  if (and.length) where.AND = and;

  const [items, total, sums] = await Promise.all([
    db.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    db.transaction.count({ where }),
    db.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);
  const sum = (t: string) => sums.find((s) => s.type === t)?._sum.amount ?? 0;
  return {
    items,
    total,
    page: f.page,
    pageSize: f.pageSize,
    hasMore: f.page * f.pageSize < total,
    totals: { income: sum("INCOME"), expense: sum("EXPENSE"), transfer: sum("TRANSFER") },
  };
}

// ---------- Recorrência ----------

function occurrence(start: Date, recurrence: Recurrence, i: number) {
  if (recurrence === "WEEKLY") return addDays(start, 7 * i);
  if (recurrence === "YEARLY") return addMonths(start, 12 * i);
  return addMonths(start, i);
}

function occurrenceIndex(start: Date, recurrence: Recurrence, d: Date) {
  if (recurrence === "WEEKLY") return Math.round((startOfDay(d).getTime() - startOfDay(start).getTime()) / (7 * 86_400_000));
  const months = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
  return recurrence === "YEARLY" ? Math.floor(months / 12) : months;
}

/**
 * Gera, de forma preguiçosa, as ocorrências de transações recorrentes até hoje.
 * Chamada ao carregar a área logada; é idempotente.
 */
export async function materializeRecurring(userId: string, now = new Date()) {
  const heads = await db.transaction.findMany({
    where: { userId, recurrence: { not: "NONE" }, recurrenceParentId: null },
    include: { creditCard: true },
  });
  if (!heads.length) return 0;
  const limit = addDays(startOfDay(now), 1);
  let created = 0;

  for (const head of heads) {
    const rec = head.recurrence as Recurrence;
    const last = await db.transaction.findFirst({
      where: { recurrenceParentId: head.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    let i = occurrenceIndex(head.date, rec, last?.date ?? head.date) + 1;
    const rows: Prisma.TransactionCreateManyInput[] = [];
    for (let next = occurrence(head.date, rec, i); next < limit && rows.length < 120; next = occurrence(head.date, rec, ++i)) {
      rows.push({
        userId,
        type: head.type,
        amount: head.amount,
        description: head.description,
        notes: head.notes,
        searchText: head.searchText,
        date: next,
        categoryId: head.categoryId,
        accountId: head.accountId,
        paymentMethod: head.paymentMethod,
        creditCardId: head.creditCardId,
        invoiceKey: head.creditCard ? invoiceKeyFor(head.creditCard, next) : null,
        paid: !head.creditCardId,
        recurrenceParentId: head.id,
      });
    }
    if (rows.length) {
      await db.transaction.createMany({ data: rows });
      created += rows.length;
    }
  }
  return created;
}
