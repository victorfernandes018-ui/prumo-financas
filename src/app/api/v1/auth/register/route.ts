import { ApiError, parseBody, publicRoute } from "@/server/http";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import { createSession } from "@/server/auth/session";
import { registerUser } from "@/server/services/users";
import { registerSchema } from "@/lib/validation";

export const POST = publicRoute(async (req) => {
  if (!(await rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000)).ok) throw new ApiError(429, "Muitas tentativas. Tente novamente mais tarde.");
  const { name, email, password } = await parseBody(req, registerSchema);
  const user = await registerUser(name, email, password);
  await createSession(user.id);
  return { ok: true };
});
