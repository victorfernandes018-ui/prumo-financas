import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Nova senha" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-semibold tracking-tight">Crie uma nova senha</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">Por segurança, você será desconectado de todos os dispositivos.</p>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-muted">Link inválido. <Link href="/forgot-password" className="font-medium text-brand">Solicite um novo</Link>.</p>
      )}
    </div>
  );
}
