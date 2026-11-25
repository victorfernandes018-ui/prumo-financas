/**
 * Dados de demonstração — conta do "Victor" com 6 meses de histórico.
 * Executar: npm run db:seed
 *
 * Conta demo (apenas desenvolvimento):
 *   e-mail: victor@prumo.app
 *   senha:  Demo@2026
 *
 * O mês atual fecha exatamente em: receitas R$ 6.500,00 · despesas R$ 3.820,00 ·
 * disponível R$ 2.680,00 · saldo atual R$ 8.540,00.
 */
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/auth/password";
import { createDefaultCategories } from "../src/server/services/categories";
import { createTransaction } from "../src/server/services/transactions";
import { accountBalances, totalBalance } from "../src/server/services/accounts";
import { payInvoice, cardsOverview } from "../src/server/services/cards";
import { payRecurring } from "../src/server/services/recurring";
import { contributeToGoal } from "../src/server/services/goals";
import { syncInsights } from "../src/server/services/insights";
import { periodTotals } from "../src/server/services/analytics";
import { safeUserSelect } from "../src/server/auth/tokens";
import { invoiceDates } from "../src/lib/cards";
import { dateAtDay, financialMonth, toDateInput } from "../src/lib/dates";
import type { TransactionInput } from "../src/lib/validation";

export const DEMO_EMAIL = "victor@prumo.app";
export const DEMO_PASSWORD = "Demo@2026";

// PRNG determinístico para dados "aleatórios" reproduzíveis
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));

const now = new Date();
const TODAY = now.getDate();

/** Data no mês `offset` (0 = atual). No mês atual, nunca depois de hoje. */
function day(offset: number, d: number) {
  const safe = offset === 0 ? Math.min(d, TODAY) : d;
  return toDateInput(dateAtDay(now.getFullYear(), now.getMonth() + offset, safe));
}

async function main() {
  console.log("🌱 Criando dados de demonstração...");
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await db.user.create({
    data: {
      name: "Victor Fernandes",
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      onboardingCompleted: true,
      monthlyIncome: 520000,
      mainGoal: "Comprar um carro",
      theme: "system",
    },
  });
  const uid = user.id;
  await createDefaultCategories(uid);
  const cats = await db.category.findMany({ where: { userId: uid } });
  const cat = (name: string, type: "INCOME" | "EXPENSE" = "EXPENSE") => cats.find((c) => c.name === name && c.type === type)!.id;

  // ---------- Contas ----------
  const [nubank, itau, poupanca, carteira, invest] = await Promise.all([
    db.account.create({ data: { userId: uid, name: "Nubank", type: "CHECKING", institution: "Nubank", color: "#8b5cf6", initialBalance: 180000 } }),
    db.account.create({ data: { userId: uid, name: "Itaú", type: "CHECKING", institution: "Itaú", color: "#f97316", initialBalance: 120000 } }),
    db.account.create({ data: { userId: uid, name: "Reserva", type: "SAVINGS", institution: "Nubank", color: "#0d9488", initialBalance: 0 } }),
    db.account.create({ data: { userId: uid, name: "Carteira", type: "CASH", color: "#64748b", initialBalance: 15000 } }),
    db.account.create({ data: { userId: uid, name: "Investimentos", type: "INVESTMENT", institution: "Corretora", color: "#2a78d6", initialBalance: 30000 } }),
  ]);

  // ---------- Cartões ----------
  const cardNu = await db.creditCard.create({ data: { userId: uid, name: "Nubank", bank: "Nubank", brand: "mastercard", limit: 390000, closingDay: 5, dueDay: 12, color: "#6d28d9" } });
  const cardItau = await db.creditCard.create({ data: { userId: uid, name: "Itaú Click", bank: "Itaú", brand: "visa", limit: 600000, closingDay: 20, dueDay: 28, color: "#1f2937" } });

  // ---------- Contas recorrentes ----------
  const bills = [
    { name: "Aluguel", amount: 150000, dueDay: 5, cat: "Moradia" },
    { name: "Academia", amount: 9990, dueDay: 7, cat: "Saúde" },
    { name: "Internet", amount: 11000, dueDay: 10, cat: "Contas" },
    { name: "Netflix", amount: 5590, dueDay: 15, cat: "Assinaturas" },
    { name: "Spotify", amount: 2190, dueDay: 18, cat: "Assinaturas" },
    { name: "Energia", amount: 18240, dueDay: 20, cat: "Contas" },
    { name: "Telefone", amount: 6000, dueDay: Math.min(TODAY + 1, 31), cat: "Contas" },
    { name: "Água", amount: 7500, dueDay: 28, cat: "Contas" },
  ];
  const recurring = [];
  for (const b of bills) {
    recurring.push(await db.recurringExpense.create({ data: { userId: uid, name: b.name, amount: b.amount, dueDay: b.dueDay, categoryId: cat(b.cat), accountId: nubank.id } }));
  }
  await db.recurringExpense.create({ data: { userId: uid, name: "Financiamento moto", amount: 42000, dueDay: 15, categoryId: cat("Transporte"), accountId: itau.id, active: false } });

  const tx = (input: Partial<TransactionInput> & Pick<TransactionInput, "type" | "amount" | "description" | "date">) =>
    createTransaction(uid, { installments: 1, recurrence: "NONE", notes: null, ...input } as never);

  // ---------- Salário recorrente (mãe + ocorrências) ----------
  const salaryHead = await tx({ type: "INCOME", amount: 520000, description: "Salário", date: day(-5, 5), categoryId: cat("Salário", "INCOME"), accountId: nubank.id, paymentMethod: "TRANSFER", recurrence: "MONTHLY" });
  for (let m = -4; m <= 0; m++) {
    await db.transaction.create({
      data: { userId: uid, type: "INCOME", amount: 520000, description: "Salário", searchText: "salario", date: new Date(`${day(m, 5)}T12:00:00`), categoryId: cat("Salário", "INCOME"), accountId: nubank.id, paymentMethod: "TRANSFER", recurrenceParentId: salaryHead.id },
    });
  }

  // ---------- Histórico (5 meses anteriores) ----------
  const freelance = [90000, 0, 145000, 62000, 57800]; // mês -5 .. -1 (−1 = 578 → +12,5% de receita no mês atual)
  for (let m = -5; m <= -1; m++) {
    const i = m + 5;
    if (freelance[i]) await tx({ type: "INCOME", amount: freelance[i], description: "Freelance — projeto web", date: day(m, 18), categoryId: cat("Freelance", "INCOME"), accountId: itau.id, paymentMethod: "PIX" });
    if (m === -3) await tx({ type: "INCOME", amount: 35000, description: "Venda de bicicleta", date: day(m, 23), categoryId: cat("Venda", "INCOME"), accountId: carteira.id, paymentMethod: "CASH" });
    if (m === -2) await tx({ type: "INCOME", amount: 4870, description: "Rendimento CDB", date: day(m, 28), categoryId: cat("Investimento", "INCOME"), accountId: invest.id, paymentMethod: "TRANSFER" });

    // Contas fixas pagas no vencimento
    for (const r of recurring) await payRecurring(uid, r.id, { date: day(m, r.dueDay), accountId: nubank.id });

    // Alimentação
    for (const d of [3, 11, 19, 26]) await tx({ type: "EXPENSE", amount: between(18000, 32000), description: "Mercado", date: day(m, d), categoryId: cat("Alimentação"), accountId: nubank.id, paymentMethod: "DEBIT" });
    for (const d of [6, 14, 22]) await tx({ type: "EXPENSE", amount: between(3500, 7500), description: "iFood", date: day(m, d), categoryId: cat("Alimentação"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
    await tx({ type: "EXPENSE", amount: between(9000, 16000), description: "Restaurante", date: day(m, 13), categoryId: cat("Alimentação"), paymentMethod: "CREDIT", creditCardId: cardItau.id });
    await tx({ type: "EXPENSE", amount: between(1500, 3000), description: "Padaria", date: day(m, 9), categoryId: cat("Alimentação"), accountId: carteira.id, paymentMethod: "CASH" });

    // Transporte
    for (const d of [4, 12, 21]) await tx({ type: "EXPENSE", amount: between(1800, 4200), description: "Uber", date: day(m, d), categoryId: cat("Transporte"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
    await tx({ type: "EXPENSE", amount: between(16000, 22000), description: "Posto de gasolina", date: day(m, 15), categoryId: cat("Transporte"), accountId: itau.id, paymentMethod: "DEBIT" });

    // Lazer / compras / saúde / educação
    await tx({ type: "EXPENSE", amount: between(6000, 14000), description: m % 2 ? "Cinema" : "Bar com amigos", date: day(m, 17), categoryId: cat("Lazer"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
    if (m !== -1) await tx({ type: "EXPENSE", amount: between(8000, 25000), description: m % 2 ? "Roupas" : "Presente", date: day(m, 24), categoryId: cat("Compras"), paymentMethod: "CREDIT", creditCardId: cardItau.id });
    await tx({ type: "EXPENSE", amount: between(3000, 9000), description: "Farmácia", date: day(m, 8), categoryId: cat("Saúde"), accountId: nubank.id, paymentMethod: "PIX" });
    await tx({ type: "EXPENSE", amount: 9700, description: "Curso de inglês online", date: day(m, 6), categoryId: cat("Educação"), paymentMethod: "CREDIT", creditCardId: cardNu.id });

    // Guardar dinheiro: transferência para a reserva
    await tx({ type: "TRANSFER", amount: m === -1 ? 50000 : 60000, description: "Guardar na reserva", date: day(m, 6), accountId: nubank.id, toAccountId: poupanca.id });
    if (m === -3) await tx({ type: "TRANSFER", amount: 100000, description: "Aporte mensal", date: day(m, 7), accountId: itau.id, toAccountId: invest.id });
  }

  // Compras parceladas
  await tx({ type: "EXPENSE", amount: 360000, description: "iPhone", date: day(-3, 10), categoryId: cat("Compras"), paymentMethod: "CREDIT", creditCardId: cardNu.id, installments: 12 });
  await tx({ type: "EXPENSE", amount: 240000, description: "Geladeira", date: day(-2, 8), categoryId: cat("Moradia"), paymentMethod: "CREDIT", creditCardId: cardItau.id, installments: 10 });
  await tx({ type: "EXPENSE", amount: 89900, description: "Fone de ouvido", date: day(-5, 25), categoryId: cat("Compras"), paymentMethod: "CREDIT", creditCardId: cardItau.id, installments: 5 });

  // ---------- Mês atual ----------
  await tx({ type: "INCOME", amount: 130000, description: "Freelance — app mobile", date: day(0, 18), categoryId: cat("Freelance", "INCOME"), accountId: itau.id, paymentMethod: "PIX" });

  for (const r of recurring.filter((r) => r.dueDay <= TODAY && !["Telefone", "Água"].includes(r.name))) {
    await payRecurring(uid, r.id, { date: day(0, r.dueDay), accountId: nubank.id });
  }
  await tx({ type: "EXPENSE", amount: 35000, description: "Mercado", date: day(0, 3), categoryId: cat("Alimentação"), accountId: nubank.id, paymentMethod: "DEBIT" });
  await tx({ type: "EXPENSE", amount: 4780, description: "Farmácia", date: day(0, 9), categoryId: cat("Saúde"), accountId: nubank.id, paymentMethod: "PIX" });
  await tx({ type: "EXPENSE", amount: 2490, description: "Uber", date: day(0, 11), categoryId: cat("Transporte"), accountId: nubank.id, paymentMethod: "PIX" });
  await tx({ type: "EXPENSE", amount: 12850, description: "Restaurante japonês", date: day(0, 12), categoryId: cat("Alimentação"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
  await tx({ type: "EXPENSE", amount: 3240, description: "Uber", date: day(0, 14), categoryId: cat("Transporte"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
  await tx({ type: "EXPENSE", amount: 18990, description: "Amazon — livros", date: day(0, 16), categoryId: cat("Compras"), paymentMethod: "CREDIT", creditCardId: cardItau.id, installments: 3 });
  await tx({ type: "EXPENSE", amount: 5890, description: "iFood", date: day(0, 17), categoryId: cat("Alimentação"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
  await tx({ type: "EXPENSE", amount: 2350, description: "Padaria", date: day(0, 19), categoryId: cat("Alimentação"), accountId: carteira.id, paymentMethod: "CASH" });
  await tx({ type: "EXPENSE", amount: 6400, description: "Cinema", date: day(0, 21), categoryId: cat("Lazer"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
  await tx({ type: "EXPENSE", amount: 12000, description: "Show de rock", date: day(0, 22), categoryId: cat("Lazer"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
  await tx({ type: "EXPENSE", amount: 9700, description: "Curso de inglês online", date: day(0, 6), categoryId: cat("Educação"), paymentMethod: "CREDIT", creditCardId: cardNu.id });
  await tx({ type: "TRANSFER", amount: 50000, description: "Nubank → Itaú", date: day(0, 20), accountId: nubank.id, toAccountId: itau.id });
  await tx({ type: "TRANSFER", amount: 60000, description: "Guardar na reserva", date: day(0, 6), accountId: nubank.id, toAccountId: poupanca.id });

  // Fecha as despesas do mês exatamente em R$ 3.820,00 (inclui parcelas de compras antigas)
  const range = financialMonth(now, 1);
  const partial = await periodTotals(uid, range);
  const grocery = 382000 - partial.expense;
  if (grocery > 0) await tx({ type: "EXPENSE", amount: grocery, description: "Mercado", date: day(0, 24), categoryId: cat("Alimentação"), accountId: nubank.id, paymentMethod: "DEBIT" });

  // Faturas anteriores pagas no vencimento
  for (const card of [cardNu, cardItau]) {
    const keys = await db.transaction.findMany({ where: { creditCardId: card.id, paid: false }, distinct: ["invoiceKey"], select: { invoiceKey: true } });
    const overview = (await cardsOverview(uid)).find((c) => c.id === card.id)!;
    for (const { invoiceKey } of keys.sort((a, b) => a.invoiceKey!.localeCompare(b.invoiceKey!))) {
      if (!invoiceKey || invoiceKey >= overview.currentInvoice.key) continue;
      const { due } = invoiceDates(card, invoiceKey);
      const payDate = due > now ? now : due;
      await payInvoice(uid, card.id, { accountId: card.id === cardNu.id ? nubank.id : itau.id, invoiceKey, date: toDateInput(payDate) });
    }
  }

  // Ajusta o saldo inicial para o saldo total fechar em R$ 8.540,00
  const delta = 854000 - (await totalBalance(uid));
  await db.account.update({ where: { id: nubank.id }, data: { initialBalance: { increment: delta } } });

  // ---------- Orçamentos ----------
  const budgets: [string, number][] = [["Alimentação", 120000], ["Transporte", 50000], ["Lazer", 15000], ["Compras", 40000], ["Assinaturas", 10000], ["Saúde", 20000]];
  for (const [name, amount] of budgets) await db.budget.create({ data: { userId: uid, categoryId: cat(name), amount } });

  // ---------- Metas ----------
  const goals = [
    { name: "Comprar um carro", icon: "🚗", color: "#2a78d6", target: 4000000, steps: [500000, 300000, 250000, 200000], deadline: 18 },
    { name: "Reserva de emergência", icon: "🛟", color: "#0d9488", target: 3000000, steps: [1000000, 500000, 320000], deadline: null },
    { name: "Viagem para o Chile", icon: "✈️", color: "#eb6834", target: 800000, steps: [400000, 250000, 120000], deadline: 4 },
    { name: "Comprar computador", icon: "💻", color: "#4a3aa7", target: 600000, steps: [300000, 300000], deadline: null },
  ];
  for (const g of goals) {
    const goal = await db.goal.create({
      data: {
        userId: uid, name: g.name, icon: g.icon, color: g.color, targetAmount: g.target,
        deadline: g.deadline ? dateAtDay(now.getFullYear(), now.getMonth() + g.deadline, 1) : null,
      },
    });
    for (const amount of g.steps) await contributeToGoal(uid, goal.id, { amount, note: "Aporte" });
  }

  // Alertas iniciais
  const safeUser = await db.user.findUniqueOrThrow({ where: { id: uid }, select: safeUserSelect });
  await syncInsights(safeUser, true);

  // ---------- Resumo ----------
  const totals = await periodTotals(uid, range);
  const balances = await accountBalances(uid);
  const cards = await cardsOverview(uid);
  const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  console.log(`\n✅ Pronto! Mês atual → receitas ${fmt(totals.income)} · despesas ${fmt(totals.expense)} · disponível ${fmt(totals.net)}`);
  console.log(`   Saldo total: ${fmt(balances.filter((a) => a.includeInTotal).reduce((s, a) => s + a.balance, 0))}`);
  for (const a of balances) console.log(`   · ${a.name.padEnd(14)} ${fmt(a.balance)}`);
  for (const c of cards) console.log(`   💳 ${c.name.padEnd(12)} fatura atual ${fmt(c.currentInvoice.total)} (${c.currentInvoice.key}) · uso ${c.utilization.toFixed(0)}%`);
  console.log(`\n   Login demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
