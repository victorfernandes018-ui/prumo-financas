import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Campos do usuário que podem circular pela aplicação (nunca inclui passwordHash)
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  currency: true,
  monthStartDay: true,
  theme: true,
  notifyBills: true,
  notifyBudget: true,
  notifyGoals: true,
  notifyInsights: true,
  plan: true,
  onboardingCompleted: true,
  monthlyIncome: true,
  mainGoal: true,
  insightsRunAt: true,
  createdAt: true,
} as const;

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  currency: string;
  monthStartDay: number;
  theme: string;
  notifyBills: boolean;
  notifyBudget: boolean;
  notifyGoals: boolean;
  notifyInsights: boolean;
  plan: string;
  onboardingCompleted: boolean;
  monthlyIncome: number | null;
  mainGoal: string | null;
  insightsRunAt: Date | null;
  createdAt: Date;
};

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

