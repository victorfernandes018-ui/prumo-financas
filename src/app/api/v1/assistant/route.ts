import { ApiError, authed, parseBody } from "@/server/http";
import { rateLimit } from "@/server/auth/rate-limit";
import { answer } from "@/server/assistant";
import { buildSnapshot } from "@/server/assistant/snapshot";
import { assistantSchema } from "@/lib/validation";

export const maxDuration = 60; // respostas da IA podem levar alguns segundos

export const POST = authed(async (req, { user }) => {
  if (!(await rateLimit(`assistant:${user.id}`, 20, 60_000)).ok) throw new ApiError(429, "Muitas perguntas seguidas. Aguarde um instante.");
  const { message, history } = await parseBody(req, assistantSchema);
  return answer(user, message, await buildSnapshot(user), history);
});
