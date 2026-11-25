import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { Logo } from "@/components/layout/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca (desktop) */}
      <aside className="relative hidden overflow-hidden bg-[#0b0b14] p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-teal-500/20 blur-[120px]" />
        <Logo className="relative [&_span]:text-white" />
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight">Finalmente entenda para onde seu dinheiro está indo.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Receitas, despesas, cartões, metas e orçamento em um só lugar — com análises que mostram, de forma simples, como está sua vida financeira.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-white/50">Saldo atual</p>
              <p className="tabular mt-1 text-xl font-semibold">R$ 8.540,00</p>
              <p className="mt-1 text-xs text-teal-300">+12,5% este mês</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs text-white/50">Organização financeira</p>
              <p className="tabular mt-1 text-xl font-semibold">82/100</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full w-[82%] rounded-full bg-gradient-to-r from-indigo-400 to-teal-300" /></div>
            </div>
          </div>
        </div>
        <p className="relative mt-12 text-xs text-white/40">Seus dados são protegidos com criptografia e nunca são compartilhados.</p>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
