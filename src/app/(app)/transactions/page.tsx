import { requireUser } from "@/server/auth/session";
import { listTransactions } from "@/server/services/transactions";
import { TransactionsView } from "@/components/features/transactions/transactions-view";
import { transactionFiltersSchema } from "@/lib/validation";
import { toDateInput } from "@/lib/dates";

export const metadata = { title: "Transações" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const raw = Object.fromEntries(Object.entries(await searchParams).filter(([, v]) => v));
  const parsed = transactionFiltersSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : transactionFiltersSchema.parse({});
  // Por padrão, mostra até hoje; parcelas e lançamentos futuros aparecem sob demanda
  const effective = !filters.from && !filters.to && !filters.future ? { ...filters, to: toDateInput(new Date()) } : filters;
  const result = await listTransactions(user.id, { ...effective, page: 1 });
  return <TransactionsView initial={result} filters={filters} queryFilters={effective} />;
}
