import "server-only";
import { hasFeature, type Feature } from "@/lib/plans";

/**
 * Recursos liberados para o usuário. Durante a fase de testes, BETA_UNLOCK_PREMIUM=true
 * libera os recursos Premium para todos (sem cobrança). Desligue ao lançar o plano pago.
 */
export function userHasFeature(user: { plan: string }, feature: Feature) {
  return process.env.BETA_UNLOCK_PREMIUM === "true" || hasFeature(user.plan, feature);
}
