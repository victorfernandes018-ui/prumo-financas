import { requireUser } from "@/server/auth/session";
import { healthReport } from "@/server/services/health";
import { HealthView } from "@/components/features/health/health-view";

export const metadata = { title: "Saúde financeira" };

export default async function HealthPage() {
  const user = await requireUser();
  return <HealthView report={await healthReport(user.id, user.monthStartDay, user.currency)} />;
}
