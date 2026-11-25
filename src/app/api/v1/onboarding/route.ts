import { authed, parseBody } from "@/server/http";
import { completeOnboarding } from "@/server/services/onboarding";
import { onboardingSchema } from "@/lib/validation";

export const POST = authed(async (req, { user }) => {
  await completeOnboarding(user.id, await parseBody(req, onboardingSchema));
  return { ok: true };
});
