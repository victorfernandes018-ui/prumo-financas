import { parseBody, publicRoute } from "@/server/http";
import { resetPassword } from "@/server/services/users";
import { resetPasswordSchema } from "@/lib/validation";

export const POST = publicRoute(async (req) => {
  const { token, password } = await parseBody(req, resetPasswordSchema);
  await resetPassword(token, password);
  return { ok: true };
});
