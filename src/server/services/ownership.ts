import "server-only";
import { db } from "../db";
import { ApiError } from "../errors";

// Garante que registros referenciados por ID pertencem ao usuário da sessão.
// Toda escrita que recebe IDs de outras entidades passa por aqui.

export async function assertAccount(userId: string, accountId: string | null | undefined) {
  if (!accountId) return null;
  const acc = await db.account.findFirst({ where: { id: accountId, userId }, select: { id: true } });
  if (!acc) throw new ApiError(422, "Conta inválida", { accountId: "Conta inválida" });
  return acc.id;
}

export async function assertCategory(userId: string, categoryId: string | null | undefined, type?: "INCOME" | "EXPENSE") {
  if (!categoryId) return null;
  const cat = await db.category.findFirst({ where: { id: categoryId, userId }, select: { id: true, type: true } });
  if (!cat) throw new ApiError(422, "Categoria inválida", { categoryId: "Categoria inválida" });
  if (type && cat.type !== type) throw new ApiError(422, "Categoria incompatível com o tipo", { categoryId: "Categoria incompatível" });
  return cat.id;
}

export async function assertCard(userId: string, cardId: string | null | undefined) {
  if (!cardId) return null;
  const card = await db.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new ApiError(422, "Cartão inválido", { creditCardId: "Cartão inválido" });
  return card;
}
