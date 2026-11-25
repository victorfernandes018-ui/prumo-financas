import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { searchTextOf } from "./transactions";
import { GOAL_TEMPLATES } from "@/lib/constants";
import { atNoon, dateAtDay } from "@/lib/dates";
import type { onboardingSchema } from "@/lib/validation";

// Percentual sugerido da renda para cada categoria escolhida como "principal gasto"
const BUDGET_SHARE: Record<string, number> = {
  Moradia: 0.3, Alimentação: 0.15, Transporte: 0.1, Cartão: 0.1, Contas: 0.08, Lazer: 0.07,
  Compras: 0.07, Saúde: 0.06, Educação: 0.06, Assinaturas: 0.03, Outros: 0.05,
};

const GOAL_DEFAULT_TARGET: Record<string, number> = {
  "Reserva de emergência": 0, "Comprar um carro": 40_000_00, Viagem: 8_000_00, Casamento: 30_000_00,
  "Casa própria": 80_000_00, Investimentos: 20_000_00, "Comprar computador": 6_000_00,
};

/** Cria o dashboard inicial a partir das respostas do onboarding. */
export async function completeOnboarding(userId: string, input: z.output<typeof onboardingSchema>) {
  const now = new Date();
  const categories = await db.category.findMany({ where: { userId } });
  const cat = (name: string, type: "INCOME" | "EXPENSE") => categories.find((c) => c.name === name && c.type === type);

  await db.$transaction(async (tx) => {
    let account = await tx.account.findFirst({ where: { userId } });
    account ??= await tx.account.create({
      data: { userId, name: "Conta principal", type: "CHECKING", color: "#6366f1", initialBalance: input.currentBalance },
    });

    if (input.monthlyIncome > 0) {
      const payday = dateAtDay(now.getFullYear(), now.getMonth(), 5);
      await tx.transaction.create({
        data: {
          userId, type: "INCOME", amount: input.monthlyIncome, description: "Salário", searchText: searchTextOf("Salário"),
          date: payday > now ? atNoon(now) : payday, categoryId: cat("Salário", "INCOME")?.id, accountId: account.id,
          paymentMethod: "TRANSFER", recurrence: "MONTHLY",
        },
      });
      for (const name of input.mainExpenses) {
        const c = cat(name, "EXPENSE");
        const share = BUDGET_SHARE[name];
        if (!c || !share) continue;
        const amount = Math.max(Math.round((input.monthlyIncome * share) / 1000) * 1000, 5000);
        await tx.budget.upsert({ where: { categoryId: c.id }, create: { userId, categoryId: c.id, amount }, update: { amount } });
      }
    }

    if (input.hasDebts && input.debtMonthlyAmount) {
      await tx.recurringExpense.create({
        data: { userId, name: "Dívidas / financiamento", amount: input.debtMonthlyAmount, dueDay: 10, categoryId: cat("Moradia", "EXPENSE")?.id, accountId: account.id },
      });
    }

    if (input.hasCreditCard) {
      await tx.creditCard.create({
        data: { userId, name: input.creditCardName || "Meu cartão", bank: input.creditCardName || "Cartão", limit: input.creditCardLimit || 2_000_00, closingDay: 3, dueDay: 10, color: "#18181b" },
      });
    }

    if (input.mainGoal) {
      const tpl = GOAL_TEMPLATES.find((g) => g.name === input.mainGoal);
      const target =
        input.mainGoalTarget ||
        (input.mainGoal === "Reserva de emergência" ? Math.max(input.monthlyIncome * 6, 5_000_00) : GOAL_DEFAULT_TARGET[input.mainGoal] ?? 10_000_00);
      await tx.goal.create({ data: { userId, name: input.mainGoal, icon: tpl?.icon ?? "🎯", targetAmount: target } });
    }

    await tx.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true, monthlyIncome: input.monthlyIncome, mainGoal: input.mainGoal ?? null },
    });
  });
}
