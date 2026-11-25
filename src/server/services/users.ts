import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../errors";
import { hashPassword, verifyPassword } from "../auth/password";
import { generateToken, hashToken, safeUserSelect } from "../auth/tokens";
import { createDefaultCategories } from "./categories";
import { appUrl } from "../app-url";
import { passwordResetEmail, sendEmail, welcomeEmail } from "../email";
import type { updateProfileSchema } from "@/lib/validation";

export async function registerUser(name: string, email: string, password: string) {
  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw new ApiError(409, "Este e-mail já está cadastrado", { email: "Este e-mail já está cadastrado" });
  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) }, select: { id: true } });
  await createDefaultCategories(user.id);
  await sendEmail(welcomeEmail(email, name)); // aguardado: em serverless, tarefas soltas podem ser interrompidas
  return user;
}

export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) return null;
  return user;
}

/** Gera token de redefinição (válido por 1h). Em produção, envie por e-mail. */
export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) return; // resposta idêntica para não revelar e-mails cadastrados
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const token = generateToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  await sendEmail(passwordResetEmail(email, user.name, `${appUrl()}/reset-password?token=${token}`));
}

export async function resetPassword(token: string, password: string) {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) throw new ApiError(400, "Link inválido ou expirado. Solicite um novo.");
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }), // encerra todas as sessões
  ]);
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new ApiError(404, "Usuário não encontrado");
  // Contas criadas com Google não têm senha: podem definir uma sem informar a atual
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash)))
    throw new ApiError(422, "Senha atual incorreta", { currentPassword: "Senha atual incorreta" });
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
}

export async function updateProfile(userId: string, input: z.output<typeof updateProfileSchema>) {
  if (input.email) {
    const taken = await db.user.findFirst({ where: { email: input.email, NOT: { id: userId } }, select: { id: true } });
    if (taken) throw new ApiError(409, "Este e-mail já está em uso", { email: "Este e-mail já está em uso" });
  }
  return db.user.update({ where: { id: userId }, data: input, select: safeUserSelect });
}

export async function deleteUser(userId: string, password: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new ApiError(404, "Usuário não encontrado");
  if (user.passwordHash && !(await verifyPassword(password, user.passwordHash))) throw new ApiError(422, "Senha incorreta", { password: "Senha incorreta" });
  await db.user.delete({ where: { id: userId } }); // cascade remove todos os dados
}

// ---------- Exportação (portabilidade de dados / LGPD) ----------

export async function exportUserData(userId: string) {
  const [user, accounts, categories, transactions, cards, purchases, recurring, goals, budgets] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, currency: true, monthStartDay: true, createdAt: true } }),
    db.account.findMany({ where: { userId } }),
    db.category.findMany({ where: { userId } }),
    db.transaction.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    db.creditCard.findMany({ where: { userId } }),
    db.creditCardTransaction.findMany({ where: { userId } }),
    db.recurringExpense.findMany({ where: { userId } }),
    db.goal.findMany({ where: { userId }, include: { contributions: true } }),
    db.budget.findMany({ where: { userId } }),
  ]);
  return { exportedAt: new Date().toISOString(), note: "Valores em centavos.", user, accounts, categories, transactions, cards, purchases, recurring, goals, budgets };
}

export async function exportTransactionsCsv(userId: string, from?: Date, to?: Date) {
  const rows = await db.transaction.findMany({
    where: { userId, ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}) },
    include: { category: true, account: true, toAccount: true, creditCard: true },
    orderBy: { date: "asc" },
  });
  const typeLabel: Record<string, string> = { INCOME: "Receita", EXPENSE: "Despesa", TRANSFER: "Transferência" };
  const esc = (v: string) => {
    // Neutraliza injeção de fórmulas em planilhas (=, +, -, @)
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = ["Data", "Tipo", "Descrição", "Categoria", "Conta", "Destino", "Cartão", "Parcela", "Valor", "Observação"];
  const lines = rows.map((t) =>
    [
      t.date.toLocaleDateString("pt-BR"),
      typeLabel[t.type] ?? t.type,
      t.description,
      t.category?.name ?? "",
      t.account?.name ?? "",
      t.toAccount?.name ?? "",
      t.creditCard?.name ?? "",
      t.installmentNumber ? `${t.installmentNumber}/${t.installmentTotal}` : "",
      ((t.type === "EXPENSE" ? -t.amount : t.amount) / 100).toFixed(2).replace(".", ","),
      t.notes ?? "",
    ].map((v) => esc(String(v))).join(";"),
  );
  return "﻿" + [header.map(esc).join(";"), ...lines].join("\r\n");
}
