import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { accountBalances } from "@/server/services/accounts";
import { syncInsights, unreadCount } from "@/server/services/insights";
import { materializeRecurring } from "@/server/services/transactions";
import { AppDataProvider } from "@/components/providers/app-data";
import { TransactionModalProvider } from "@/components/features/transactions/transaction-modal";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Tarefas idempotentes: gerar ocorrências recorrentes e atualizar alertas
  await materializeRecurring(user.id);
  await syncInsights(user).catch((e) => console.error("[insights]", e));

  const [accounts, categories, cards, unread] = await Promise.all([
    accountBalances(user.id),
    db.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true, icon: true, color: true, type: true, nature: true } }),
    db.creditCard.findMany({ where: { userId: user.id, archived: false }, select: { id: true, name: true, color: true, closingDay: true, dueDay: true } }),
    unreadCount(user.id),
  ]);

  // "Outros" sempre por último na grade de categorias
  categories.sort((a, b) => Number(a.name === "Outros") - Number(b.name === "Outros"));

  return (
    <AppDataProvider
      value={{
        user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, currency: user.currency, plan: user.plan, monthStartDay: user.monthStartDay, theme: user.theme },
        accounts: accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name, type: a.type, color: a.color, balance: a.balance, institution: a.institution })),
        categories,
        cards,
        unread,
      }}
    >
      <TransactionModalProvider>
        <AppShell>{children}</AppShell>
      </TransactionModalProvider>
    </AppDataProvider>
  );
}
