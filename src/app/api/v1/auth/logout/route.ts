import { publicRoute } from "@/server/http";
import { destroyCurrentSession } from "@/server/auth/session";

export const POST = publicRoute(async () => {
  await destroyCurrentSession();
  return { ok: true };
});
