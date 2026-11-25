import { ApiError, parseBody, publicRoute } from "@/server/http";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { requestPasswordReset } from "@/server/services/users";
import { forgotPasswordSchema } from "@/lib/validation";

export const POST = publicRoute(async (req) => {
  if (!(await rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000)).ok) throw new ApiError(429, "Muitas solicitações. Aguarde alguns minutos.");
  const { email } = await parseBody(req, forgotPasswordSchema);
  await requestPasswordReset(email);
  return { ok: true }; // sempre a mesma resposta
});
