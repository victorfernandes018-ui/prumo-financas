// Arquitetura de planos: toda funcionalidade Premium passa por `hasFeature`/`limitFor`,
// então liberar/bloquear recursos é uma mudança de configuração, não de código espalhado.

export type Plan = "FREE" | "PREMIUM";

export const FEATURES = {
  ai_assistant: "IA financeira",
  advanced_reports: "Relatórios avançados",
  export_pdf_excel: "Exportação PDF/Excel",
  custom_dashboard: "Dashboard personalizado",
  auto_insights: "Insights automáticos",
  statement_import: "Importação de extratos",
  bank_sync: "Sincronização bancária",
  advanced_planning: "Planejamento financeiro avançado",
} as const;
export type Feature = keyof typeof FEATURES;

const PLAN_FEATURES: Record<Plan, Feature[]> = {
  FREE: ["auto_insights"],
  PREMIUM: Object.keys(FEATURES) as Feature[],
};

export const PLAN_LIMITS: Record<Plan, { accounts: number; goals: number; cards: number }> = {
  FREE: { accounts: 6, goals: 6, cards: 4 },
  PREMIUM: { accounts: Infinity, goals: Infinity, cards: Infinity },
};

export function hasFeature(plan: string, feature: Feature) {
  return PLAN_FEATURES[(plan as Plan) in PLAN_FEATURES ? (plan as Plan) : "FREE"].includes(feature);
}

export function limitFor(plan: string, key: keyof (typeof PLAN_LIMITS)["FREE"]) {
  return PLAN_LIMITS[(plan as Plan) in PLAN_LIMITS ? (plan as Plan) : "FREE"][key];
}
