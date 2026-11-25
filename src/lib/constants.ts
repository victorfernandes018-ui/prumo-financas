export const APP_NAME = "Prumo";
export const APP_TAGLINE = "Suas finanças no rumo certo";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CATEGORY_TYPES = ["INCOME", "EXPENSE"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_NATURES = ["ESSENTIAL", "SUPERFLUOUS"] as const;
export type CategoryNature = (typeof CATEGORY_NATURES)[number];

export const RECURRENCES = ["NONE", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type Recurrence = (typeof RECURRENCES)[number];
export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  NONE: "Não se repete",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

export const PAYMENT_METHODS = ["PIX", "DEBIT", "CREDIT", "CASH", "BOLETO", "TRANSFER", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  DEBIT: "Débito",
  CREDIT: "Cartão de crédito",
  CASH: "Dinheiro",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

export const ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "CASH", "WALLET", "INVESTMENT", "OTHER"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  WALLET: "Carteira digital",
  INVESTMENT: "Investimentos",
  OTHER: "Outros",
};

export const CARD_BRANDS = ["visa", "mastercard", "elo", "amex", "hipercard", "outros"] as const;

export const NOTIFICATION_KINDS = ["WARNING", "INFO", "SUCCESS", "GOAL", "TIP", "DANGER"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const CURRENCIES = [
  { code: "BRL", label: "Real brasileiro (R$)" },
  { code: "USD", label: "Dólar americano (US$)" },
  { code: "EUR", label: "Euro (€)" },
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#f59e0b",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#64748b", "#18181b",
];

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  nature?: CategoryNature;
}

// Categorias criadas automaticamente para todo novo usuário
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Moradia", icon: "🏠", color: "#2a78d6", type: "EXPENSE", nature: "ESSENTIAL" },
  { name: "Alimentação", icon: "🍔", color: "#eb6834", type: "EXPENSE", nature: "ESSENTIAL" },
  { name: "Transporte", icon: "🚗", color: "#1baf7a", type: "EXPENSE", nature: "ESSENTIAL" },
  { name: "Cartão", icon: "💳", color: "#eda100", type: "EXPENSE", nature: "ESSENTIAL" },
  { name: "Lazer", icon: "🎮", color: "#e87ba4", type: "EXPENSE", nature: "SUPERFLUOUS" },
  { name: "Compras", icon: "🛒", color: "#4a3aa7", type: "EXPENSE", nature: "SUPERFLUOUS" },
  { name: "Contas", icon: "💡", color: "#008300", type: "EXPENSE", nature: "ESSENTIAL" },
  { name: "Educação", icon: "📚", color: "#e34948", type: "EXPENSE", nature: "ESSENTIAL" },
  { name: "Saúde", icon: "❤️", color: "#d55181", type: "EXPENSE", nature: "ESSENTIAL" },
  { name: "Assinaturas", icon: "📺", color: "#9085e9", type: "EXPENSE", nature: "SUPERFLUOUS" },
  { name: "Outros", icon: "📦", color: "#94a3b8", type: "EXPENSE", nature: "SUPERFLUOUS" },
  { name: "Salário", icon: "💼", color: "#10b981", type: "INCOME" },
  { name: "Freelance", icon: "💻", color: "#06b6d4", type: "INCOME" },
  { name: "Venda", icon: "🏷️", color: "#f59e0b", type: "INCOME" },
  { name: "Investimento", icon: "📈", color: "#6366f1", type: "INCOME" },
  { name: "Outros", icon: "✨", color: "#94a3b8", type: "INCOME" },
];

// Palavras-chave para sugestão inteligente de categoria (combinado com o histórico do usuário)
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentação: ["mercado", "supermercado", "ifood", "restaurante", "lanche", "padaria", "pizza", "açougue", "feira", "café", "hamburguer", "almoço", "jantar", "rappi", "comida"],
  Transporte: ["uber", "99", "gasolina", "combustível", "posto", "estacionamento", "ônibus", "metrô", "pedágio", "taxi", "táxi", "ipva", "oficina"],
  Moradia: ["aluguel", "condomínio", "iptu", "reforma", "móveis", "financiamento"],
  Contas: ["luz", "energia", "água", "internet", "telefone", "celular", "gás", "conta"],
  Assinaturas: ["netflix", "spotify", "prime", "disney", "hbo", "max", "youtube", "icloud", "assinatura", "globoplay", "deezer"],
  Saúde: ["farmácia", "remédio", "médico", "consulta", "dentista", "academia", "plano de saúde", "exame", "hospital", "drogaria"],
  Educação: ["curso", "faculdade", "escola", "livro", "mensalidade", "udemy", "alura"],
  Lazer: ["cinema", "show", "bar", "viagem", "hotel", "jogo", "steam", "passeio", "ingresso", "balada"],
  Compras: ["roupa", "shopping", "amazon", "mercado livre", "shopee", "presente", "tênis", "eletrônico", "magazine"],
  Salário: ["salário", "salario", "pagamento", "holerite", "13º", "férias"],
  Freelance: ["freela", "freelance", "projeto", "cliente", "job"],
  Venda: ["venda", "vendi", "olx"],
  Investimento: ["dividendos", "rendimento", "juros", "cdb", "tesouro", "resgate"],
};

export const GOAL_TEMPLATES = [
  { name: "Reserva de emergência", icon: "🛟" },
  { name: "Comprar um carro", icon: "🚗" },
  { name: "Viagem", icon: "✈️" },
  { name: "Casamento", icon: "💍" },
  { name: "Casa própria", icon: "🏡" },
  { name: "Investimentos", icon: "📈" },
  { name: "Comprar computador", icon: "💻" },
];
