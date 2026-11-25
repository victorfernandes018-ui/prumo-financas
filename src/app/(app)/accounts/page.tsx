import { requireUser } from "@/server/auth/session";
import { accountBalances } from "@/server/services/accounts";
import { AccountsView } from "@/components/features/accounts/accounts-view";

export const metadata = { title: "Contas" };

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await accountBalances(user.id);
  return <AccountsView accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, institution: a.institution, color: a.color, initialBalance: a.initialBalance, includeInTotal: a.includeInTotal, archived: a.archived, balance: a.balance }))} />;
}
