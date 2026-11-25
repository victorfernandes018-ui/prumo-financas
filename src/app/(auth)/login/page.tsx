import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { enabledOAuthProviders } from "@/server/auth/oauth";

export const metadata = { title: "Entrar" };

// Credenciais da conta de demonstração criada pelo seed (somente fora de produção)
const DEMO = process.env.NODE_ENV !== "production" ? { email: "victor@prumo.app", password: "Demo@2026" } : undefined;

const OAUTH_ERRORS: Record<string, string> = {
  oauth: "Não foi possível entrar com o Google. Tente novamente ou use seu e-mail.",
  oauth_unavailable: "Esse método de login ainda não está disponível.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta 👋</h1>
      <p className="mt-1.5 text-sm text-muted">Entre para ver como está sua vida financeira.</p>
      {error && OAUTH_ERRORS[error] && <div role="alert" className="mt-4 rounded-xl bg-expense-soft px-3.5 py-2.5 text-sm font-medium text-expense">{OAUTH_ERRORS[error]}</div>}
      <div className="mt-8"><OAuthButtons enabled={enabledOAuthProviders()} /></div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-border" />ou com e-mail<div className="h-px flex-1 bg-border" /></div>
      <Suspense><LoginForm demo={DEMO} /></Suspense>
      <p className="mt-8 text-center text-sm text-muted">
        Ainda não tem conta? <Link href="/register" className="font-medium text-brand hover:underline">Criar conta grátis</Link>
      </p>
    </div>
  );
}
