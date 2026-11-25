import { requireUser } from "@/server/auth/session";
import { cardsOverview, installmentPurchases } from "@/server/services/cards";
import { CardsView } from "@/components/features/cards/cards-view";

export const metadata = { title: "Cartões" };

export default async function CardsPage() {
  const user = await requireUser();
  const [cards, purchases] = await Promise.all([cardsOverview(user.id), installmentPurchases(user.id)]);
  return <CardsView cards={cards} purchases={purchases.map((p) => ({ ...p, purchaseDate: p.purchaseDate.toISOString() }))} />;
}
