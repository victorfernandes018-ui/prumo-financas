// Formato serializado de transação usado pelos componentes client-side
export interface TxView {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: Date | string;
  notes: string | null;
  paymentMethod: string | null;
  categoryId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  creditCardId: string | null;
  creditCardTransactionId: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  recurrence: string;
  recurrenceParentId: string | null;
  isInvoicePayment: boolean;
  paid: boolean;
  category: { id: string; name: string; icon: string; color: string } | null;
  account: { id: string; name: string; color: string } | null;
  toAccount: { id: string; name: string; color: string } | null;
  creditCard: { id: string; name: string; color: string } | null;
}
