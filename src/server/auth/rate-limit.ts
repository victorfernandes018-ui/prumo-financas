import "server-only";
import { db } from "../db";

// Janela fixa armazenada no banco: funciona com várias instâncias (serverless).
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  try {
    const row = await db.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt < now) {
      await db.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
        update: { count: 1, resetAt: new Date(now.getTime() + windowMs) },
      });
      // Limpeza ocasional de janelas expiradas
      if (Math.random() < 0.02) await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
      return { ok: true, retryAfter: 0 };
    }
    const updated = await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    if (updated.count > limit) return { ok: false, retryAfter: Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000) };
    return { ok: true, retryAfter: 0 };
  } catch (e) {
    // Falha no limitador não pode derrubar o login
    console.error("[rate-limit]", e);
    return { ok: true, retryAfter: 0 };
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
