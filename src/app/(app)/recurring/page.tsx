import { requireUser } from "@/server/auth/session";
import { recurringWithStatus } from "@/server/services/recurring";
import { RecurringView } from "@/components/features/recurring/recurring-view";

export const metadata = { title: "Contas fixas" };

export default async function RecurringPage() {
  const user = await requireUser();
  return <RecurringView items={await recurringWithStatus(user.id, user.monthStartDay)} />;
}
