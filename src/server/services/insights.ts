import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import type { SafeUser } from "../auth/tokens";
import { periodTotals } from "./analytics";
import { budgetsWithSpending } from "./budgets";
import { cardsOverview } from "./cards";
import { recurringWithStatus } from "./recurring";
import { addDays, financialMonth, monthKey, shiftFinancialMonth, toDateInput } from "@/lib/dates";
import { formatMoney, percentChange } from "@/lib/money";

type NewNotification = Omit<Prisma.NotificationCreateManyInput, "userId">;

const THROTTLE_MS = 5 * 60 * 1000;

/**
 * Motor de alertas: analisa os dados e cria notificações (deduplicadas por dedupeKey).
 * Executado no carregamento da área logada, no máximo a cada 5 minutos por usuário.
 */
export async function syncInsights(user: SafeUser, force = false, now = new Date()) {
  if (!force && user.insightsRunAt && now.getTime() - user.insightsRunAt.getTime() < THROTTLE_MS) return;
  await db.user.update({ where: { id: user.id }, data: { insightsRunAt: now } });

  const c = user.currency;
  const range = financialMonth(now, user.monthStartDay);
  const mk = monthKey(range.start);
  const out: NewNotification[] = [];

  const [cards, bills, budgets, goals] = await Promise.all([
    cardsOverview(user.id, now),
    user.notifyBills ? recurringWithStatus(user.id, user.monthStartDay, now) : Promise.resolve([]),
    user.notifyBudget ? budgetsWithSpending(user.id, user.monthStartDay, now) : Promise.resolve([]),
    user.notifyGoals ? db.goal.findMany({ where: { userId: user.id } }) : Promise.resolve([]),
  ]);

  // Cartões: limite comprometido
  for (const card of cards) {
    const u = Math.round(card.utilization);
    if (u >= 80) {
      const tier = u >= 100 ? 100 : u >= 90 ? 90 : 80;
      out.push({
        kind: u >= 90 ? "DANGER" : "WARNING",
        title: `Limite do ${card.name}`,
        message: `⚠️ Seu cartão ${card.name} está ${u}% comprometido.`,
        href: "/cards",
        dedupeKey: `card-util-${card.id}-${mk}-${tier}`,
      });
    }
    if (card.currentInvoice.status === "CLOSED" && card.currentInvoice.unpaid > 0) {
      out.push({
        kind: "INFO",
        title: "Fatura fechada",
        message: `🧾 A fatura do ${card.name} fechou em ${formatMoney(card.currentInvoice.unpaid, c)}.`,
        href: "/cards",
        dedupeKey: `invoice-closed-${card.id}-${card.currentInvoice.key}`,
      });
    }
  }

  // Contas a vencer
  for (const b of bills) {
    if (!b.active || b.paidThisMonth || !b.dueThisMonth) continue;
    const dueKey = toDateInput(new Date(b.nextDue));
    if (b.daysUntilDue === 1) out.push({ kind: "INFO", title: "Conta vence amanhã", message: `💡 Sua conta de ${b.name.toLowerCase()} vence amanhã (${formatMoney(b.amount, c)}).`, href: "/recurring", dedupeKey: `bill-1-${b.id}-${dueKey}` });
    if (b.daysUntilDue === 0) out.push({ kind: "WARNING", title: "Conta vence hoje", message: `📅 ${b.name} vence hoje: ${formatMoney(b.amount, c)}.`, href: "/recurring", dedupeKey: `bill-0-${b.id}-${dueKey}` });
    if (b.overdue) out.push({ kind: "DANGER", title: "Conta atrasada", message: `⏰ ${b.name} venceu dia ${b.dueDay} e ainda não foi marcada como paga.`, href: "/recurring", dedupeKey: `bill-late-${b.id}-${mk}` });
  }

  // Orçamentos
  for (const b of budgets) {
    if (b.status === "exceeded")
      out.push({ kind: "DANGER", title: "Orçamento ultrapassado", message: `🔴 Você ultrapassou seu orçamento de ${b.category.name} em ${formatMoney(-b.remaining, c)}.`, href: "/budget", dedupeKey: `budget-over-${b.categoryId}-${mk}` });
    else if (b.status === "warning")
      out.push({ kind: "WARNING", title: "Orçamento quase no limite", message: `🟡 Você já usou ${Math.round(b.percent)}% do orçamento de ${b.category.name}.`, href: "/budget", dedupeKey: `budget-warn-${b.categoryId}-${mk}` });
  }

  // Metas
  for (const g of goals) {
    const missing = g.targetAmount - g.currentAmount;
    if (g.completedAt) out.push({ kind: "GOAL", title: "Meta concluída", message: `🎉 Parabéns! Você atingiu sua meta "${g.name}".`, href: "/goals", dedupeKey: `goal-done-${g.id}` });
    else if (missing > 0 && (missing <= 50_000 || missing / g.targetAmount <= 0.1))
      out.push({ kind: "GOAL", title: "Meta quase lá", message: `🎯 Você está ${formatMoney(missing, c)} perto da sua meta "${g.name}".`, href: "/goals", dedupeKey: `goal-near-${g.id}` });
  }

  if (user.notifyInsights) {
    // Categorias em alta: mês até hoje vs. mesmo período do mês anterior
    const prev = shiftFinancialMonth(range, -1, user.monthStartDay);
    const elapsed = now.getTime() - range.start.getTime();
    const prevSame = { start: prev.start, end: new Date(prev.start.getTime() + elapsed) };
    const [curCats, prevCats, categories] = await Promise.all([
      db.transaction.groupBy({ by: ["categoryId"], where: { userId: user.id, type: "EXPENSE", date: { gte: range.start, lt: now } }, _sum: { amount: true } }),
      db.transaction.groupBy({ by: ["categoryId"], where: { userId: user.id, type: "EXPENSE", date: { gte: prevSame.start, lt: prevSame.end } }, _sum: { amount: true } }),
      db.category.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    ]);
    for (const cc of curCats) {
      const before = prevCats.find((p) => p.categoryId === cc.categoryId)?._sum.amount ?? 0;
      const nowAmount = cc._sum.amount ?? 0;
      const change = percentChange(nowAmount, before);
      if (change !== null && change >= 15 && nowAmount - before >= 5_000) {
        const name = categories.find((x) => x.id === cc.categoryId)?.name ?? "Outros";
        out.push({ kind: "TIP", title: "Gastos em alta", message: `🔥 Seus gastos com ${name.toLowerCase()} aumentaram ${Math.round(change)}% em relação ao mesmo período do mês passado.`, href: "/reports", dedupeKey: `cat-up-${cc.categoryId}-${mk}` });
      }
    }

    // Economia do mês anterior (fechado)
    const lastMonth = await periodTotals(user.id, prev);
    const beforeLast = await periodTotals(user.id, shiftFinancialMonth(prev, -1, user.monthStartDay));
    if (lastMonth.net > 0) {
      const better = beforeLast.net > 0 ? percentChange(lastMonth.net, beforeLast.net) : null;
      out.push({
        kind: "SUCCESS",
        title: "Mês no azul",
        message: better !== null && better >= 5
          ? `🔥 Você economizou ${formatMoney(lastMonth.net, c)} no mês passado — ${Math.round(better)}% mais que no anterior.`
          : `👏 Você economizou ${formatMoney(lastMonth.net, c)} no mês passado.`,
        href: "/reports",
        dedupeKey: `saved-${monthKey(prev.start)}`,
      });
    }
  }

  if (out.length) {
    const existing = await db.notification.findMany({
      where: { userId: user.id, dedupeKey: { in: out.map((o) => o.dedupeKey) } },
      select: { dedupeKey: true },
    });
    const known = new Set(existing.map((e) => e.dedupeKey));
    const fresh = out.filter((o) => !known.has(o.dedupeKey));
    if (fresh.length) await db.notification.createMany({ data: fresh.map((f) => ({ ...f, userId: user.id })) });
  }

  // Limpeza: remove lidas com mais de 60 dias
  await db.notification.deleteMany({ where: { userId: user.id, read: true, createdAt: { lt: addDays(now, -60) } } });
}

export function listNotifications(userId: string, take = 50) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}
