import { authed, parseBody } from "@/server/http";
import { destroyOtherSessions } from "@/server/auth/session";
import { changePassword } from "@/server/services/users";
import { changePasswordSchema } from "@/lib/validation";

export const PUT = authed(async (req, { user }) => {
  const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);
  await changePassword(user.id, currentPassword, newPassword);
  await destroyOtherSessions(user.id);
  return { ok: true };
});
