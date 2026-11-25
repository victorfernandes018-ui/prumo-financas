"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatMoney } from "@/lib/money";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  currency: string;
  plan: string;
  monthStartDay: number;
  theme: string;
}
export interface AppAccount { id: string; name: string; type: string; color: string; balance: number; institution: string | null }
export interface AppCategory { id: string; name: string; icon: string; color: string; type: string; nature: string }
export interface AppCard { id: string; name: string; color: string; closingDay: number; dueDay: number }

export interface AppData {
  user: AppUser;
  accounts: AppAccount[];
  categories: AppCategory[];
  cards: AppCard[];
  unread: number;
}

const Ctx = createContext<AppData | null>(null);

export function AppDataProvider({ value, children }: { value: AppData; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppData fora do AppDataProvider");
  return v;
}

/** Formatador de moeda já com a moeda preferida do usuário. */
export function useMoney() {
  const { user } = useAppData();
  return (cents: number) => formatMoney(cents, user.currency);
}
