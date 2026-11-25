import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <div className="animate-slide-up">
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <h1 className="text-2xl font-semibold tracking-tight">Esqueceu sua senha?</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">Sem problemas. Informe seu e-mail e enviaremos um link para você criar uma nova.</p>
      <ForgotPasswordForm />
    </div>
  );
}
