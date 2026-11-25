import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { OnboardingWizard } from "@/components/features/onboarding/onboarding-wizard";

export const metadata = { title: "Boas-vindas" };

export default async function OnboardingPage() {
  const user = await requireUser({ allowOnboarding: true });
  if (user.onboardingCompleted) redirect("/dashboard");
  return <OnboardingWizard name={user.name} currency={user.currency} />;
}
