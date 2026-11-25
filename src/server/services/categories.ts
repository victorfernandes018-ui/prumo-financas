import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { ApiError, notFound } from "../errors";
import { CATEGORY_KEYWORDS, DEFAULT_CATEGORIES } from "@/lib/constants";
import type { categorySchema } from "@/lib/validation";
import { normalize } from "@/lib/utils";

export async function createDefaultCategories(userId: string) {
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, nature: c.nature ?? "ESSENTIAL", userId })),
  });
}

export function listCategories(userId: string) {
  return db.category.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { name: "asc" }] });
}

export async function createCategory(userId: string, input: z.infer<typeof categorySchema>) {
  const exists = await db.category.findFirst({ where: { userId, name: input.name, type: input.type } });
  if (exists) throw new ApiError(409, "Já existe uma categoria com esse nome");
  return db.category.create({ data: { ...input, userId } });
}

export async function updateCategory(userId: string, id: string, input: Partial<z.infer<typeof categorySchema>>) {
  const cat = await db.category.findFirst({ where: { id, userId } });
  if (!cat) throw notFound("Categoria");
  return db.category.update({ where: { id }, data: { ...input, type: cat.type } });
}

export async function deleteCategory(userId: string, id: string) {
  const res = await db.category.deleteMany({ where: { id, userId } });
  if (!res.count) throw notFound("Categoria");
}

/**
 * Sugestão inteligente de categoria:
 * 1) histórico do próprio usuário (mesma descrição já lançada antes)
 * 2) dicionário de palavras-chave
 * 3) categorias mais usadas nos últimos 90 dias
 */
export async function suggestCategories(userId: string, query: string, type: "INCOME" | "EXPENSE") {
  const q = normalize(query.trim());
  const categories = await db.category.findMany({ where: { userId, type } });
  const byName = new Map(categories.map((c) => [c.name, c]));
  const ranked: string[] = [];

  if (q.length >= 2) {
    const history = await db.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type, searchText: { contains: q }, categoryId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 3,
    });
    for (const h of history) if (h.categoryId) ranked.push(h.categoryId);

    for (const [name, words] of Object.entries(CATEGORY_KEYWORDS)) {
      if (words.some((w) => q.includes(normalize(w)) || (q.length >= 3 && normalize(w).startsWith(q)))) {
        const cat = byName.get(name);
        if (cat) ranked.push(cat.id);
      }
    }
  }

  const since = new Date(Date.now() - 90 * 86_400_000);
  const frequent = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type, date: { gte: since }, categoryId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { categoryId: "desc" } },
    take: 6,
  });
  for (const f of frequent) if (f.categoryId) ranked.push(f.categoryId);

  return [...new Set(ranked)].slice(0, 6);
}
