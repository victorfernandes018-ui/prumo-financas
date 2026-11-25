import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { generateToken, hashToken, safeUserSelect, type SafeUser } from "./tokens";

export { generateToken, hashToken, safeUserSelect, type SafeUser };

export const SESSION_COOKIE = "prumo_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  const h = await headers();
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: h.get("user-agent")?.slice(0, 250) ?? null },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Usuário da requisição atual (memoizado por requisição). */
export const getSessionUser = cache(async (): Promise<SafeUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, user: { select: safeUserSelect } },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
});

/** Para Server Components: redireciona para o login se não houver sessão. */
export async function requireUser(opts: { allowOnboarding?: boolean } = {}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!opts.allowOnboarding && !user.onboardingCompleted) redirect("/onboarding");
  return user;
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Encerra todas as sessões exceto a atual (ex.: após trocar a senha). */
export async function destroyOtherSessions(userId: string) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({
    where: { userId, ...(token ? { NOT: { tokenHash: hashToken(token) } } : {}) },
  });
}
