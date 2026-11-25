"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, MailCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/api-client";

function useForm() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  async function run(fn: () => Promise<void>) {
    setLoading(true);
    setErrors({});
    setFormError(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setErrors(e.fields);
        if (!Object.keys(e.fields).length) setFormError(e.message);
      } else setFormError("Algo deu errado. Tente novamente.");
      setLoading(false);
    }
  }
  return { loading, errors, formError, run };
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-foreground"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="alert" className="animate-fade-in rounded-xl bg-expense-soft px-3.5 py-2.5 text-sm font-medium text-expense">{message}</div>;
}

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginForm({ demo }: { demo?: { email: string; password: string } }) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, errors, formError, run } = useForm();

  const submit = (e?: FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    run(async () => {
      await api.post("/auth/login", creds ?? { email, password });
      // Navegação completa: garante que o layout autenticado seja montado do zero
      window.location.assign(safeNext(params.get("next")));
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormAlert message={formError} />
      <Field label="E-mail" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} required />
      </Field>
      <Field
        label={
          <span className="flex items-center justify-between">
            Senha
            <Link href="/forgot-password" className="text-xs font-medium text-brand hover:underline">Esqueci minha senha</Link>
          </span>
        }
        htmlFor="password"
        error={errors.password}
      >
        <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>Entrar</Button>
      {demo && (
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={loading}
          onClick={() => {
            setEmail(demo.email);
            setPassword(demo.password);
            submit(undefined, demo);
          }}
        >
          <Sparkles className="h-4 w-4 text-brand" /> Explorar conta de demonstração
        </Button>
      )}
    </form>
  );
}

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { loading, errors, formError, run } = useForm();
  const toast = useToast();
  const strength = [/.{8,}/, /[A-Za-z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(form.password)).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.post("/auth/register", form);
      toast.success("Conta criada! 🎉", "Vamos configurar sua vida financeira.");
      window.location.assign("/onboarding");
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormAlert message={formError} />
      <Field label="Nome" htmlFor="name" error={errors.name}>
        <Input id="name" autoComplete="name" placeholder="Como podemos te chamar?" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
      </Field>
      <Field label="E-mail" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" placeholder="voce@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Senha" htmlFor="password" error={errors.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <PasswordInput id="password" autoComplete="new-password" placeholder="Crie uma senha forte" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-invalid={!!errors.password} />
        {form.password && (
          <div className="flex gap-1 pt-1" aria-label={`Força da senha: ${strength} de 4`}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i < strength ? (strength <= 2 ? "var(--warning)" : "var(--income)") : "var(--subtle)" }} />
            ))}
          </div>
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>Criar conta grátis</Button>
      <p className="text-center text-xs text-muted">Ao criar sua conta, você concorda com os <a href="/termos" target="_blank" className="underline hover:text-foreground">Termos de Uso</a> e a <a href="/privacidade" target="_blank" className="underline hover:text-foreground">Política de Privacidade</a>.</p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { loading, errors, formError, run } = useForm();

  if (sent) {
    return (
      <div className="animate-slide-up text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-income-soft text-income"><MailCheck className="h-7 w-7" /></div>
        <h2 className="text-lg font-semibold">Verifique seu e-mail</h2>
        <p className="mt-2 text-sm text-muted">Se <b className="text-foreground">{email}</b> estiver cadastrado, você receberá um link para criar uma nova senha. O link expira em 1 hora.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">Voltar para o login</Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await api.post("/auth/forgot-password", { email });
          setSent(true);
        });
      }}
      className="space-y-4"
      noValidate
    >
      <FormAlert message={formError} />
      <Field label="E-mail" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>Enviar link de recuperação</Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { loading, errors, formError, run } = useForm();
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (mismatch) return;
        run(async () => {
          await api.post("/auth/reset-password", { token, password });
          toast.success("Senha redefinida!", "Entre com sua nova senha.");
          router.replace("/login");
        });
      }}
      className="space-y-4"
      noValidate
    >
      <FormAlert message={formError ?? errors.token ?? null} />
      <Field label="Nova senha" htmlFor="password" error={errors.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Confirme a nova senha" htmlFor="confirm" error={mismatch ? "As senhas não coincidem" : undefined}>
        <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!password || mismatch}>Salvar nova senha</Button>
    </form>
  );
}
