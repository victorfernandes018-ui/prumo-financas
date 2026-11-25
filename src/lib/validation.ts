import { z } from "zod";
import {
  ACCOUNT_TYPES, CARD_BRANDS, CATEGORY_NATURES, CATEGORY_TYPES, CURRENCIES,
  PAYMENT_METHODS, RECURRENCES, TRANSACTION_TYPES,
} from "./constants";
import { sanitizeText } from "./utils";

// ---------- primitivos ----------
const text = (max: number, min = 1) =>
  z.string().transform(sanitizeText).pipe(z.string().min(min, "Campo obrigatório").max(max, `Máximo de ${max} caracteres`));
const optionalText = (max: number) =>
  z.string().transform(sanitizeText).pipe(z.string().max(max)).optional().nullable().transform((v) => v || null);
export const cents = z.number({ invalid_type_error: "Valor inválido" }).int().positive("Informe um valor maior que zero").max(100_000_000_00, "Valor muito alto");
const centsOrZero = z.number().int().min(0).max(100_000_000_00);
const signedCents = z.number().int().min(-100_000_000_00).max(100_000_000_00);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const id = z.string().min(1).max(64);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");
const emoji = z.string().min(1).max(16);
const day = z.number().int().min(1).max(31);

// ---------- autenticação ----------
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .max(128)
  .regex(/[A-Za-z]/, "Inclua pelo menos uma letra")
  .regex(/\d/, "Inclua pelo menos um número");

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(254);

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Informe sua senha").max(128) });
export const registerSchema = z.object({ name: text(80, 2), email: emailSchema, password: passwordSchema });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().max(128).default(""), newPassword: passwordSchema });

// ---------- perfil ----------
export const updateProfileSchema = z.object({
  name: text(80, 2).optional(),
  email: emailSchema.optional(),
  avatarUrl: z
    .string()
    .max(300_000, "Imagem muito grande")
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Imagem inválida")
    .nullable()
    .optional(),
  currency: z.enum(CURRENCIES.map((c) => c.code) as [string, ...string[]]).optional(),
  monthStartDay: z.number().int().min(1).max(28).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifyBills: z.boolean().optional(),
  notifyBudget: z.boolean().optional(),
  notifyGoals: z.boolean().optional(),
  notifyInsights: z.boolean().optional(),
});

// ---------- transações ----------
export const transactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: cents,
    description: text(120),
    date: dateStr,
    categoryId: id.optional().nullable(),
    accountId: id.optional().nullable(),
    toAccountId: id.optional().nullable(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
    creditCardId: id.optional().nullable(),
    installments: z.number().int().min(1).max(48).default(1),
    notes: optionalText(500),
    recurrence: z.enum(RECURRENCES).default("NONE"),
  })
  .superRefine((v, ctx) => {
    if (v.type === "TRANSFER") {
      if (!v.accountId) ctx.addIssue({ code: "custom", path: ["accountId"], message: "Escolha a conta de origem" });
      if (!v.toAccountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Escolha a conta de destino" });
      if (v.accountId && v.accountId === v.toAccountId)
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Origem e destino precisam ser diferentes" });
    }
    if (v.type === "EXPENSE" && v.paymentMethod === "CREDIT" && !v.creditCardId)
      ctx.addIssue({ code: "custom", path: ["creditCardId"], message: "Escolha o cartão" });
    if (v.installments > 1 && v.recurrence !== "NONE")
      ctx.addIssue({ code: "custom", path: ["recurrence"], message: "Compras parceladas não podem ser recorrentes" });
  });
export type TransactionInput = z.input<typeof transactionSchema>;

export const updateTransactionSchema = z.object({
  amount: cents.optional(),
  description: text(120).optional(),
  date: dateStr.optional(),
  categoryId: id.nullable().optional(),
  accountId: id.nullable().optional(),
  notes: optionalText(500),
  paid: z.boolean().optional(),
  stopRecurrence: z.boolean().optional(),
});

export const transactionFiltersSchema = z.object({
  search: z.string().max(80).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  categoryId: id.optional(),
  accountId: id.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  minAmount: z.coerce.number().int().min(0).optional(),
  maxAmount: z.coerce.number().int().min(0).optional(),
  future: z.enum(["1"]).optional(), // inclui lançamentos futuros (parcelas, agendados)
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

// ---------- contas ----------
export const accountSchema = z.object({
  name: text(60),
  type: z.enum(ACCOUNT_TYPES),
  institution: optionalText(60),
  color: color.default("#6366f1"),
  initialBalance: signedCents.default(0),
  includeInTotal: z.boolean().default(true),
});
export const updateAccountSchema = accountSchema.partial().extend({ archived: z.boolean().optional() });

// ---------- categorias ----------
export const categorySchema = z.object({
  name: text(40),
  icon: emoji,
  color,
  type: z.enum(CATEGORY_TYPES),
  nature: z.enum(CATEGORY_NATURES).default("ESSENTIAL"),
});

// ---------- cartões ----------
export const creditCardSchema = z.object({
  name: text(40),
  bank: text(40),
  brand: z.enum(CARD_BRANDS).optional().nullable(),
  limit: cents,
  closingDay: day,
  dueDay: day,
  color: color.default("#18181b"),
});
export const updateCreditCardSchema = creditCardSchema.partial().extend({ archived: z.boolean().optional() });
export const payInvoiceSchema = z.object({ accountId: id, invoiceKey: z.string().regex(/^\d{4}-\d{2}$/), date: dateStr.optional() });

// ---------- contas recorrentes ----------
export const recurringExpenseSchema = z.object({
  name: text(60),
  amount: cents,
  categoryId: id.optional().nullable(),
  accountId: id.optional().nullable(),
  dueDay: day,
  dueMonth: z.number().int().min(1).max(12).optional().nullable(),
  recurrence: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  active: z.boolean().default(true),
});
export const updateRecurringExpenseSchema = recurringExpenseSchema.partial();
export const payRecurringSchema = z.object({ accountId: id.optional().nullable(), date: dateStr.optional(), amount: cents.optional() });

// ---------- metas ----------
export const goalSchema = z.object({
  name: text(60),
  icon: emoji.default("🎯"),
  color: color.default("#6366f1"),
  targetAmount: cents,
  currentAmount: centsOrZero.default(0),
  deadline: dateStr.optional().nullable(),
});
export const updateGoalSchema = goalSchema.partial();
export const contributeGoalSchema = z.object({ amount: signedCents.refine((v) => v !== 0, "Informe um valor"), note: optionalText(120) });

// ---------- orçamento ----------
export const budgetSchema = z.object({ categoryId: id, amount: cents });

// ---------- onboarding ----------
export const onboardingSchema = z.object({
  monthlyIncome: centsOrZero,
  mainExpenses: z.array(z.string().max(40)).max(12).default([]),
  hasDebts: z.boolean(),
  debtMonthlyAmount: centsOrZero.optional().nullable(),
  hasCreditCard: z.boolean(),
  creditCardLimit: centsOrZero.optional().nullable(),
  creditCardName: optionalText(40),
  mainGoal: z.string().max(60).optional().nullable(),
  mainGoalTarget: centsOrZero.optional().nullable(),
  currentBalance: signedCents.default(0),
});

// ---------- assistente ----------
export const assistantSchema = z.object({
  message: text(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(12)
    .default([]),
});
