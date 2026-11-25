import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { ApiError, notFound } from "../errors";
import { parseDateInput } from "@/lib/dates";
import { limitFor } from "@/lib/plans";
import type { contributeGoalSchema, goalSchema, updateGoalSchema } from "@/lib/validation";

export function listGoals(userId: string) {
  return db.goal.findMany({
    where: { userId },
    include: { contributions: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
  });
}
export type GoalWithContributions = Awaited<ReturnType<typeof listGoals>>[number];

export async function createGoal(userId: string, plan: string, input: z.output<typeof goalSchema>) {
  const count = await db.goal.count({ where: { userId, completedAt: null } });
  if (count >= limitFor(plan, "goals")) throw new ApiError(403, "Você atingiu o limite de metas do plano gratuito. Metas ilimitadas no Premium!");
  const completed = input.currentAmount >= input.targetAmount;
  return db.goal.create({
    data: {
      ...input,
      userId,
      deadline: input.deadline ? parseDateInput(input.deadline) : null,
      completedAt: completed ? new Date() : null,
      contributions: input.currentAmount > 0 ? { create: { amount: input.currentAmount, note: "Valor inicial" } } : undefined,
    },
  });
}

export async function updateGoal(userId: string, id: string, input: z.output<typeof updateGoalSchema>) {
  const goal = await db.goal.findFirst({ where: { id, userId } });
  if (!goal) throw notFound("Meta");
  const target = input.targetAmount ?? goal.targetAmount;
  const current = input.currentAmount ?? goal.currentAmount;
  return db.goal.update({
    where: { id },
    data: {
      ...input,
      deadline: input.deadline === undefined ? undefined : input.deadline ? parseDateInput(input.deadline) : null,
      completedAt: current >= target ? goal.completedAt ?? new Date() : null,
    },
  });
}

export async function deleteGoal(userId: string, id: string) {
  const res = await db.goal.deleteMany({ where: { id, userId } });
  if (!res.count) throw notFound("Meta");
}

/** Adiciona (ou resgata, se negativo) dinheiro na meta. Retorna se a meta foi concluída agora. */
export async function contributeToGoal(userId: string, id: string, input: z.output<typeof contributeGoalSchema>) {
  const goal = await db.goal.findFirst({ where: { id, userId } });
  if (!goal) throw notFound("Meta");
  const next = goal.currentAmount + input.amount;
  if (next < 0) throw new ApiError(422, "O resgate é maior que o valor guardado na meta.");
  const justCompleted = !goal.completedAt && next >= goal.targetAmount;
  const updated = await db.goal.update({
    where: { id },
    data: {
      currentAmount: next,
      completedAt: next >= goal.targetAmount ? goal.completedAt ?? new Date() : null,
      contributions: { create: { amount: input.amount, note: input.note } },
    },
  });
  return { goal: updated, justCompleted };
}
