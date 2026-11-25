import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { ApiError, notFound } from "../errors";
import { addDays, startOfDay } from "@/lib/dates";
import { limitFor } from "@/lib/plans";
import type { accountSchema, updateAccountSchema } from "@/lib/validation";

/**
 * Saldo por conta até `until` (exclusivo; padrão = fim do dia de hoje).
 * saldo = inicial + receitas − despesas − transferências enviadas + transferências recebidas.
 * Despesas de cartão não afetam contas; o pagamento da fatura (transferência sem destino) sim.
 */
export async function accountBalances(userId: string, until = addDays(startOfDay(new Date()), 1)) {
  const [accounts, outgoing, incoming] = await Promise.all([
    db.account.findMany({ where: { userId }, orderBy: [{ archived: "asc" }, { createdAt: "asc" }] }),
    db.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { not: null }, date: { lt: until } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["toAccountId"],
      where: { userId, type: "TRANSFER", toAccountId: { not: null }, date: { lt: until } },
      _sum: { amount: true },
    }),
  ]);

  return accounts.map((acc) => {
    const flows = outgoing.filter((o) => o.accountId === acc.id);
    const sum = (t: string) => flows.find((f) => f.type === t)?._sum.amount ?? 0;
    const received = incoming.find((i) => i.toAccountId === acc.id)?._sum.amount ?? 0;
    const balance = acc.initialBalance + sum("INCOME") - sum("EXPENSE") - sum("TRANSFER") + received;
    return { ...acc, balance };
  });
}

export type AccountWithBalance = Awaited<ReturnType<typeof accountBalances>>[number];

export async function totalBalance(userId: string, until?: Date) {
  const list = await accountBalances(userId, until);
  return list.filter((a) => a.includeInTotal && !a.archived).reduce((s, a) => s + a.balance, 0);
}

export async function createAccount(userId: string, plan: string, input: z.output<typeof accountSchema>) {
  const count = await db.account.count({ where: { userId, archived: false } });
  if (count >= limitFor(plan, "accounts"))
    throw new ApiError(403, "Você atingiu o limite de contas do plano gratuito. Conheça o Premium!");
  return db.account.create({ data: { ...input, userId } });
}

export async function updateAccount(userId: string, id: string, input: z.output<typeof updateAccountSchema>) {
  const acc = await db.account.findFirst({ where: { id, userId } });
  if (!acc) throw notFound("Conta");
  return db.account.update({ where: { id }, data: input });
}

export async function deleteAccount(userId: string, id: string) {
  const acc = await db.account.findFirst({ where: { id, userId } });
  if (!acc) throw notFound("Conta");
  const used = await db.transaction.count({ where: { userId, OR: [{ accountId: id }, { toAccountId: id }] } });
  if (used > 0) {
    // Preserva o histórico: contas com movimentação são arquivadas em vez de apagadas
    await db.account.update({ where: { id }, data: { archived: true } });
    return { archived: true };
  }
  await db.account.delete({ where: { id } });
  return { archived: false };
}
