import "server-only";
import { db } from "../db";
import { accountBalances } from "./accounts";
import { periodTotals } from "./analytics";
import { budgetsWithSpending } from "./budgets";
import { monthlyFixedCost } from "./recurring";
import { financialMonth, shiftFinancialMonth } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/money";
import { clamp, normalize } from "@/lib/utils";

export type IndicatorStatus = "good" | "warning" | "bad" | "neutral";

export interface HealthIndicator {
  key: string;
  label: string;
  value: string;
  status: IndicatorStatus;
  description: string;
  percent?: number;
}

export interface HealthReport {
  score: number;
  level: "excellent" | "good" | "attention" | "critical" | "empty";
  label: string;
  emoji: string;
  message: string;
  indicators: HealthIndicator[];
  tips: string[];
  breakdown: { label: string; points: number; max: number }[];
  hasData: boolean;
}

const linear = (value: number, worst: number, best: number) => clamp((value - worst) / (best - worst), 0, 1);

/**
 * Pontuação de ORGANIZAÇÃO financeira (0–100). Indicador interno do app —
 * não é e não substitui score de crédito.
 */
export async function healthReport(userId: string, startDay: number, currency: string, now = new Date()): Promise<HealthReport> {
  const range = financialMonth(now, startDay);
  const last3 = { start: shiftFinancialMonth(range, -3, startDay).start, end: range.start };

  const [cur, hist, fixed, balances, budgets, goals, cardInstallments, otherInstallments, natures, user] = await Promise.all([
    periodTotals(userId, range),
    periodTotals(userId, last3),
    monthlyFixedCost(userId),
    accountBalances(userId),
    budgetsWithSpending(userId, startDay, now),
    db.goal.findMany({ where: { userId }, select: { name: true, currentAmount: true } }),
    db.transaction.aggregate({ where: { userId, paid: false, installmentTotal: { gt: 1 }, creditCardId: { not: null } }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { userId, installmentTotal: { gt: 1 }, creditCardId: null, date: { gte: now } }, _sum: { amount: true } }),
    db.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: range.start, lt: range.end } },
      select: { amount: true, installmentTotal: true, category: { select: { nature: true } } },
    }),
    db.user.findUnique({ where: { id: userId }, select: { monthlyIncome: true } }),
  ]);

  const avgExpense3 = hist.expense / 3;
  const income = cur.income || Math.round(hist.income / 3) || user?.monthlyIncome || 0;
  const expense = cur.expense;
  const hasData = cur.count > 0 || hist.count > 0;

  // Sem despesas registradas, qualquer nota seria enganosa (ex.: "100% de economia")
  if (!hasData || income === 0 || (cur.expense === 0 && hist.expense === 0)) {
    return {
      score: 0, level: "empty", label: "Sem dados suficientes", emoji: "🌱", hasData: false,
      message: "Registre suas receitas e despesas do dia a dia para receber uma análise completa da sua saúde financeira.",
      indicators: [], tips: ["Comece lançando sua renda mensal e os gastos fixos."], breakdown: [],
    };
  }

  const monthlyInstallments = natures.filter((n) => (n.installmentTotal ?? 0) > 1).reduce((s, n) => s + n.amount, 0);
  const essential = natures.filter((n) => n.category?.nature !== "SUPERFLUOUS").reduce((s, n) => s + n.amount, 0);
  const superfluous = expense - essential;

  const savingsRate = ((income - expense) / income) * 100;
  const committed = ((fixed + monthlyInstallments) / income) * 100;
  const installmentsRate = (monthlyInstallments / income) * 100;
  const debts = (cardInstallments._sum.amount ?? 0) + (otherInstallments._sum.amount ?? 0);
  const reserveBalance =
    balances.filter((a) => !a.archived && (a.type === "SAVINGS" || a.type === "INVESTMENT")).reduce((s, a) => s + Math.max(a.balance, 0), 0) +
    goals.filter((g) => /reserva|emergenc/.test(normalize(g.name))).reduce((s, g) => s + g.currentAmount, 0);
  const baseExpense = avgExpense3 || expense || 1;
  const reserveMonths = reserveBalance / baseExpense;
  const budgetsOk = budgets.length ? budgets.filter((b) => b.status !== "exceeded").length / budgets.length : null;

  // Composição da pontuação (100 pontos)
  const breakdown = [
    { label: "Taxa de economia", max: 30, points: Math.round(30 * linear(savingsRate, 0, 20)) },
    { label: "Renda comprometida", max: 20, points: Math.round(20 * linear(committed, 80, 40)) },
    { label: "Reserva financeira", max: 20, points: Math.round(20 * linear(reserveMonths, 0, 6)) },
    { label: "Parcelamentos", max: 15, points: Math.round(15 * linear(installmentsRate, 40, 10)) },
    { label: "Orçamentos respeitados", max: 15, points: Math.round(15 * (budgetsOk ?? 0.6)) },
  ];
  const score = clamp(breakdown.reduce((s, b) => s + b.points, 0), 0, 100);

  const level = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "attention" : "critical";
  const meta = {
    excellent: { label: "Excelente", emoji: "🟢" },
    good: { label: "Boa", emoji: "🟢" },
    attention: { label: "Atenção", emoji: "🟡" },
    critical: { label: "Crítica", emoji: "🔴" },
  }[level];

  let message: string;
  if (savingsRate >= 20) message = "Você está gastando bem menos do que ganha e possui uma ótima margem de economia.";
  else if (savingsRate > 0) message = "Você está gastando menos do que ganha e possui uma margem de economia positiva.";
  else if (savingsRate === 0) message = "Seus gastos estão empatando com sua renda. Vale revisar as despesas supérfluas.";
  else message = "Neste mês você está gastando mais do que ganha. Revise seus gastos para voltar ao azul.";

  const st = (good: boolean, warn: boolean): IndicatorStatus => (good ? "good" : warn ? "warning" : "bad");
  const indicators: HealthIndicator[] = [
    {
      key: "committed", label: "Renda comprometida", value: formatPercent(committed, 0), percent: committed,
      status: st(committed <= 50, committed <= 70),
      description: `Contas fixas (${formatMoney(fixed, currency)}) e parcelas do mês somadas. O ideal é ficar abaixo de 50%.`,
    },
    {
      key: "savings", label: "Taxa de economia", value: formatPercent(savingsRate, 0), percent: Math.max(savingsRate, 0),
      status: st(savingsRate >= 20, savingsRate > 0),
      description: savingsRate > 0 ? `Sobram ${formatMoney(income - expense, currency)} da sua renda neste mês. Meta saudável: 20%.` : "Você não está conseguindo guardar dinheiro neste mês.",
    },
    {
      key: "essential", label: "Gastos essenciais", value: formatPercent(expense ? (essential / expense) * 100 : 0, 0), percent: expense ? (essential / expense) * 100 : 0,
      status: "neutral",
      description: `${formatMoney(essential, currency)} em moradia, alimentação, transporte, saúde, contas e educação.`,
    },
    {
      key: "superfluous", label: "Gastos supérfluos", value: formatPercent(expense ? (superfluous / expense) * 100 : 0, 0), percent: expense ? (superfluous / expense) * 100 : 0,
      status: st(superfluous / income <= 0.3, superfluous / income <= 0.4),
      description: `${formatMoney(superfluous, currency)} em lazer, compras e assinaturas — até 30% da renda é um bom limite.`,
    },
    {
      key: "debts", label: "Dívidas em aberto", value: formatMoney(debts, currency),
      status: st(debts <= income, debts <= income * 3),
      description: debts > 0 ? `Parcelas futuras a pagar, equivalentes a ${(debts / income).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mês(es) de renda.` : "Nenhuma parcela futura. Excelente!",
    },
    {
      key: "installments", label: "Parcelamentos do mês", value: formatPercent(installmentsRate, 0), percent: installmentsRate,
      status: st(installmentsRate <= 10, installmentsRate <= 25),
      description: `${formatMoney(monthlyInstallments, currency)} em parcelas neste mês. Mantenha abaixo de 10–15% da renda.`,
    },
    {
      key: "reserve", label: "Reserva financeira", value: `${reserveMonths.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses`, percent: clamp((reserveMonths / 6) * 100, 0, 100),
      status: st(reserveMonths >= 6, reserveMonths >= 3),
      description: `${formatMoney(reserveBalance, currency)} em poupança, investimentos e meta de reserva. O recomendado é 6 meses de gastos.`,
    },
  ];

  const tips: string[] = [];
  if (savingsRate < 20) tips.push("Tente separar pelo menos 20% da renda assim que o salário cair — trate como uma conta fixa.");
  if (committed > 50) tips.push("Mais da metade da renda está comprometida. Renegociar contas fixas libera fôlego todo mês.");
  if (reserveMonths < 6) tips.push(`Sua reserva cobre ${reserveMonths.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses. Aportes mensais constantes fazem diferença.`);
  if (installmentsRate > 15) tips.push("Evite novos parcelamentos até reduzir as parcelas atuais.");
  if (budgets.some((b) => b.status === "exceeded")) tips.push("Alguns orçamentos foram ultrapassados. Revise os limites ou os hábitos dessas categorias.");
  if (!budgets.length) tips.push("Defina orçamentos por categoria para acompanhar seus limites com mais facilidade.");
  if (!tips.length) tips.push("Continue assim! Considere investir o excedente de acordo com seus objetivos.");

  return { score, level, ...meta, message, indicators, tips, breakdown, hasData: true };
}
