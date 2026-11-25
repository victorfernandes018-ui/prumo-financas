import Link from "next/link";
import { RegisterForm } from "@/components/auth/auth-forms";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { enabledOAuthProviders } from "@/server/auth/oauth";

export const metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-semibold tracking-tight">Crie sua conta</h1>
      <p className="mt-1.5 text-sm text-muted">Leva menos de um minuto. Sem cartão de crédito.</p>
      <div className="mt-8"><OAuthButtons enabled={enabledOAuthProviders()} /></div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-border" />ou com e-mail<div className="h-px flex-1 bg-border" /></div>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted">
        Já tem conta? <Link href="/login" className="font-medium text-brand hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
