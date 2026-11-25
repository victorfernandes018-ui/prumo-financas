import {
  ArrowLeftRight, BarChart3, CalendarClock, CreditCard, HeartPulse, Home, Landmark, PiggyBank, Sparkles, Target, User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
];

export const NAV_MONEY: NavItem[] = [
  { href: "/accounts", label: "Contas", icon: Landmark },
  { href: "/cards", label: "Cartões", icon: CreditCard },
  { href: "/recurring", label: "Contas fixas", icon: CalendarClock },
  { href: "/budget", label: "Orçamento", icon: PiggyBank },
  { href: "/goals", label: "Metas", icon: Target },
];

export const NAV_INSIGHTS: NavItem[] = [
  { href: "/health", label: "Saúde financeira", icon: HeartPulse },
  { href: "/assistant", label: "Meu Assistente", icon: Sparkles },
];

export const NAV_MOBILE: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/profile", label: "Perfil", icon: User },
];

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  [...NAV_MAIN, ...NAV_MONEY, ...NAV_INSIGHTS, { href: "/profile", label: "Perfil" }, { href: "/notifications", label: "Notificações" }].map((n) => [n.href, n.label]),
);
