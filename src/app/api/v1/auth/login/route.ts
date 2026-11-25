import { ApiError, parseBody, publicRoute } from "@/server/http";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { createSession } from "@/server/auth/session";
import { authenticate } from "@/server/services/users";
import { loginSchema } from "@/lib/validation";

export const POST = publicRoute(async (req) => {
  const { email, password } = await parseBody(req, loginSchema);
  // Limita tentativas por IP e por e-mail (proteção contra força bruta)
  const byIp = await rateLimit(`login:ip:${clientIp(req)}`, 20, 15 * 60_000);
  const byEmail = await rateLimit(`login:email:${email}`, 8, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) throw new ApiError(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  const user = await authenticate(email, password);
  if (!user) throw new ApiError(401, "E-mail ou senha incorretos");
  await createSession(user.id);
  return { ok: true };
});
