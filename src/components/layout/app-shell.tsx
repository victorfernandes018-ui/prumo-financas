"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Crown, LogOut, Moon, Plus, Search, Settings, Sun,
} from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { useAppData } from "@/components/providers/app-data";
import { useQuickActions } from "@/components/features/transactions/transaction-modal";
import { api } from "@/lib/api-client";
import { cn, firstName } from "@/lib/utils";
import { Logo, LogoMark } from "./logo";
import { NAV_INSIGHTS, NAV_MAIN, NAV_MOBILE, NAV_MONEY, PAGE_TITLES, type NavItem } from "./nav-items";
import { CommandSearch } from "./command-search";
import { NotificationsPopover } from "./notifications-popover";
import { InstallPrompt } from "@/components/pwa/install-prompt";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({ title, items, pathname }: { title?: string; items: NavItem[]; pathname: string }) {
  return (
    <div>
      {title && <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-muted/80 uppercase">{title}</p>}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-soft text-brand" : "text-muted hover:bg-subtle hover:text-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      onClick={() => {
        const next = dark ? "light" : "dark";
        setTheme(next);
        api.patch("/me", { theme: next }).catch(() => {});
      }}
      className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-foreground", className)}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

async function logout() {
  await api.post("/auth/logout").catch(() => {});
  window.location.assign("/login");
}

function Sidebar({ pathname }: { pathname: string }) {
  const { user } = useAppData();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-card/60 px-3 py-5 backdrop-blur lg:flex">
      <Link href="/dashboard" className="mb-7 px-3"><Logo /></Link>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        <NavGroup items={NAV_MAIN} pathname={pathname} />
        <NavGroup title="Dinheiro" items={NAV_MONEY} pathname={pathname} />
        <NavGroup title="Inteligência" items={NAV_INSIGHTS} pathname={pathname} />
      </nav>
      {user.plan !== "PREMIUM" && (
        <Link href="/profile#plano" className="mb-3 block rounded-2xl bg-gradient-to-br from-brand to-violet-500 p-4 text-white shadow-lg shadow-brand/20 transition-transform hover:-translate-y-0.5">
          <Crown className="h-5 w-5" />
          <p className="mt-2 text-sm font-semibold">Prumo Premium</p>
          <p className="mt-0.5 text-xs text-white/75">IA financeira, relatórios avançados e muito mais.</p>
        </Link>
      )}
      <div className="flex items-center gap-2 rounded-xl p-1.5">
        <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 hover:bg-subtle">
          <Avatar name={user.name} src={user.avatarUrl} size={34} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </Link>
        <button onClick={logout} className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-foreground" aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

function Fab() {
  const { openNew } = useQuickActions();
  const [open, setOpen] = useState(false);
  const actions = [
    { type: "INCOME" as const, label: "Receita", icon: ArrowDownLeft, cls: "bg-income" },
    { type: "EXPENSE" as const, label: "Despesa", icon: ArrowUpRight, cls: "bg-expense" },
    { type: "TRANSFER" as const, label: "Transferência", icon: ArrowLeftRight, cls: "bg-brand" },
  ];
  return (
    <>
      {open && <div className="fixed inset-0 z-40 animate-fade-in bg-background/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <div className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-3 lg:hidden">
        {open &&
          actions.map((a, i) => (
            <button
              key={a.type}
              onClick={() => {
                setOpen(false);
                openNew(a.type);
              }}
              className="flex animate-slide-up items-center gap-3"
              style={{ animationDelay: `${(actions.length - i) * 35}ms` }}
            >
              <span className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium shadow-pop">{a.label}</span>
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg", a.cls)}><a.icon className="h-5 w-5" /></span>
            </button>
          ))}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-transform active:scale-95"
          aria-label={open ? "Fechar" : "Adicionar lançamento"}
          aria-expanded={open}
        >
          <Plus className={cn("h-6 w-6 transition-transform duration-200", open && "rotate-45")} />
        </button>
      </div>
    </>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_MOBILE.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors", active ? "text-brand" : "text-muted")}>
                <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.7} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UserMenu() {
  const { user } = useAppData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-brand/30" aria-label="Menu do usuário">
        <Avatar name={user.name} src={user.avatarUrl} size={36} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 animate-scale-in rounded-2xl border border-border bg-card p-1.5 shadow-pop">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-subtle"><Settings className="h-4 w-4 text-muted" /> Perfil e preferências</Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-expense-soft"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, unread } = useAppData();
  const { openNew } = useQuickActions();
  const [searchOpen, setSearchOpen] = useState(false);
  const title = Object.entries(PAGE_TITLES).find(([href]) => isActive(pathname, href))?.[1];

  // Atalhos do ícone do app (PWA): /dashboard?new=expense|income abre o lançamento rápido
  useEffect(() => {
    const url = new URL(window.location.href);
    const kind = url.searchParams.get("new");
    if (kind === "expense" || kind === "income") {
      openNew(kind === "income" ? "INCOME" : "EXPENSE");
      url.searchParams.delete("new");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [openNew]);

  // Atalhos de teclado: ⌘K / Ctrl+K busca, "N" novo lançamento
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (!typing && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "n" && !document.querySelector("[role=dialog]")) {
        e.preventDefault();
        openNew("EXPENSE");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openNew]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="lg:hidden" aria-label="Início"><LogoMark size={30} /></Link>
            <p className="text-[15px] font-semibold lg:hidden">{pathname === "/dashboard" ? `Olá, ${firstName(user.name)}` : title}</p>
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 text-sm text-muted transition-colors hover:border-brand/40 lg:flex"
            >
              <Search className="h-4 w-4" />
              Buscar transações...
              <kbd className="ml-auto rounded-md border border-border bg-subtle px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setSearchOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-subtle lg:hidden" aria-label="Buscar">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <ThemeToggle />
              <NotificationsPopover initialUnread={unread} />
              <button onClick={() => openNew("EXPENSE")} className="ml-2 hidden h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white shadow-sm shadow-brand/20 transition hover:bg-brand-hover active:scale-[0.97] lg:flex">
                <Plus className="h-4 w-4" /> Novo lançamento
              </button>
              <div className="ml-2 hidden lg:block"><UserMenu /></div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-6 pb-32 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <BottomNav pathname={pathname} />
      <Fab />
      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <InstallPrompt />
    </div>
  );
}

