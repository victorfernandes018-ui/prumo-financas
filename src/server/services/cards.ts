import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { ApiError, notFound } from "../errors";
import { assertAccount } from "./ownership";
import { transactionInclude } from "./transactions";
import { currentInvoiceKey, invoiceDates, invoiceStatus, nextInvoiceKey, type InvoiceStatus } from "@/lib/cards";
import { atNoon, monthKeyLabel, parseDateInput } from "@/lib/dates";
import { limitFor } from "@/lib/plans";
import type { creditCardSchema, payInvoiceSchema, updateCreditCardSchema } from "@/lib/validation";

export interface InvoiceSummary {
  key: string;
  label: string;
  total: number;
  unpaid: number;
  status: InvoiceStatus;
  closing: string;
  due: string;
}

export interface CardOverview {
  id: string;
  name: string;
  bank: string;
  brand: string | null;
  color: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  used: number;
  available: number;
  utilization: number;
  currentInvoice: InvoiceSummary;
  nextInvoice: InvoiceSummary;
  totalInstallments: number;
  invoices: InvoiceSummary[];
}

export async function cardsOverview(userId: string, now = new Date()): Promise<CardOverview[]> {
  const cards = await db.creditCard.findMany({ where: { userId, archived: false }, orderBy: { createdAt: "asc" } });
  if (!cards.length) return [];
  const sums = await db.transaction.groupBy({
    by: ["creditCardId", "invoiceKey", "paid"],
    where: { userId, creditCardId: { in: cards.map((c) => c.id) }, isInvoicePayment: false },
    _sum: { amount: true },
  });
  const installmentSums = await db.transaction.groupBy({
    by: ["creditCardId"],
    where: { userId, creditCardId: { in: cards.map((c) => c.id) }, paid: false, installmentTotal: { gt: 1 } },
    _sum: { amount: true },
  });

  return cards.map((card) => {
    const mine = sums.filter((s) => s.creditCardId === card.id);
    const used = mine.filter((s) => !s.paid).reduce((a, s) => a + (s._sum.amount ?? 0), 0);
    const keys = [...new Set(mine.map((s) => s.invoiceKey!).filter(Boolean))];
    const curKey = currentInvoiceKey(card, now);
    const nextKey = nextInvoiceKey(card, now);
    for (const k of [curKey, nextKey]) if (!keys.includes(k)) keys.push(k);

    const summary = (key: string): InvoiceSummary => {
      const rows = mine.filter((s) => s.invoiceKey === key);
      const total = rows.reduce((a, s) => a + (s._sum.amount ?? 0), 0);
      const unpaid = rows.filter((s) => !s.paid).reduce((a, s) => a + (s._sum.amount ?? 0), 0);
      const { closing, due } = invoiceDates(card, key);
      return { key, label: monthKeyLabel(key), total, unpaid, status: invoiceStatus(card, key, unpaid, total, now), closing: closing.toISOString(), due: due.toISOString() };
    };

    return {
      id: card.id,
      name: card.name,
      bank: card.bank,
      brand: card.brand,
      color: card.color,
      limit: card.limit,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      used,
      available: card.limit - used,
      utilization: card.limit > 0 ? (used / card.limit) * 100 : 0,
      currentInvoice: summary(curKey),
      nextInvoice: summary(nextKey),
      totalInstallments: installmentSums.find((s) => s.creditCardId === card.id)?._sum.amount ?? 0,
      invoices: keys.sort().map(summary),
    };
  });
}

export async function cardInvoice(userId: string, cardId: string, key: string) {
  const card = await db.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw notFound("Cartão");
  return db.transaction.findMany({
    where: { userId, creditCardId: cardId, invoiceKey: key, isInvoicePayment: false },
    include: transactionInclude,
    orderBy: { date: "desc" },
  });
}

/** Compras parceladas com parcelas ainda em aberto, com a parcela "atual" (ex.: 4 de 12). */
export async function installmentPurchases(userId: string, now = new Date()) {
  const purchases = await db.creditCardTransaction.findMany({
    where: { userId, installments: { gt: 1 }, transactions: { some: { paid: false } } },
    include: {
      creditCard: { select: { id: true, name: true, color: true, closingDay: true, dueDay: true } },
      category: { select: { name: true, icon: true, color: true } },
      transactions: { select: { invoiceKey: true, paid: true, amount: true, installmentNumber: true } },
    },
    orderBy: { purchaseDate: "desc" },
  });
  return purchases.map((p) => {
    const cur = currentInvoiceKey(p.creditCard, now);
    const current = p.transactions.filter((t) => (t.invoiceKey ?? "") <= cur).length;
    const remaining = p.transactions.filter((t) => !t.paid).reduce((a, t) => a + t.amount, 0);
    const installmentAmount = p.transactions.find((t) => t.installmentNumber === 2)?.amount ?? Math.round(p.totalAmount / p.installments);
    return {
      id: p.id,
      description: p.description,
      totalAmount: p.totalAmount,
      installments: p.installments,
      installmentAmount,
      currentInstallment: Math.min(Math.max(current, 1), p.installments),
      remaining,
      purchaseDate: p.purchaseDate,
      card: { id: p.creditCard.id, name: p.creditCard.name, color: p.creditCard.color },
      category: p.category,
    };
  });
}

export async function createCard(userId: string, plan: string, input: z.output<typeof creditCardSchema>) {
  const count = await db.creditCard.count({ where: { userId, archived: false } });
  if (count >= limitFor(plan, "cards")) throw new ApiError(403, "Limite de cartões do plano gratuito atingido.");
  return db.creditCard.create({ data: { ...input, userId } });
}

export async function updateCard(userId: string, id: string, input: z.output<typeof updateCreditCardSchema>) {
  const card = await db.creditCard.findFirst({ where: { id, userId } });
  if (!card) throw notFound("Cartão");
  return db.creditCard.update({ where: { id }, data: input });
}

export async function deleteCard(userId: string, id: string) {
  const card = await db.creditCard.findFirst({ where: { id, userId } });
  if (!card) throw notFound("Cartão");
  const open = await db.transaction.count({ where: { creditCardId: id, paid: false, isInvoicePayment: false } });
  if (open > 0) {
    await db.creditCard.update({ where: { id }, data: { archived: true } });
    return { archived: true };
  }
  await db.creditCard.delete({ where: { id } });
  return { archived: false };
}

/** Paga a fatura: marca as compras como pagas e debita a conta via transferência (não conta como despesa). */
export async function payInvoice(userId: string, cardId: string, input: z.output<typeof payInvoiceSchema>) {
  const card = await db.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw notFound("Cartão");
  const accountId = await assertAccount(userId, input.accountId);
  const pending = await db.transaction.aggregate({
    where: { userId, creditCardId: cardId, invoiceKey: input.invoiceKey, paid: false, isInvoicePayment: false },
    _sum: { amount: true },
  });
  const amount = pending._sum.amount ?? 0;
  if (amount <= 0) throw new ApiError(422, "Essa fatura não tem valores em aberto.");

  await db.$transaction([
    db.transaction.updateMany({
      where: { userId, creditCardId: cardId, invoiceKey: input.invoiceKey, paid: false, isInvoicePayment: false },
      data: { paid: true },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "TRANSFER",
        amount,
        description: `Fatura ${card.name} — ${monthKeyLabel(input.invoiceKey)}`,
        searchText: `fatura ${card.name.toLowerCase()}`,
        date: input.date ? parseDateInput(input.date) : atNoon(new Date()),
        accountId,
        toAccountId: null,
        creditCardId: cardId,
        invoiceKey: input.invoiceKey,
        isInvoicePayment: true,
        paymentMethod: "TRANSFER",
      },
    }),
  ]);
  return { amount };
}
