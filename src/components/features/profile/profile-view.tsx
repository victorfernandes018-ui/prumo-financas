"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bell, Camera, ChevronRight, Crown, Download, FileJson, KeyRound, LogOut, Monitor, Moon, Palette, ShieldCheck, Smartphone, Sun, Trash2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Avatar, Badge, PageHeader, Segmented, Switch } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { NAV_INSIGHTS, NAV_MONEY } from "@/components/layout/nav-items";
import { OPEN_INSTALL_EVENT } from "@/components/pwa/install-prompt";
import { api } from "@/lib/api-client";
import { CURRENCIES } from "@/lib/constants";
import { FEATURES } from "@/lib/plans";
import { formatDateLong } from "@/lib/dates";
import { useMutation } from "@/lib/use-mutation";

interface Profile {
  name: string; email: string; avatarUrl: string | null; currency: string; monthStartDay: number; theme: string;
  notifyBills: boolean; notifyBudget: boolean; notifyGoals: boolean; notifyInsights: boolean; plan: string; createdAt: string;
}

function Section({ icon: Icon, title, description, children, id }: { icon: React.ElementType; title: string; description?: string; children: React.ReactNode; id?: string }) {
  return (
    <Card id={id} className="scroll-mt-24 p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon className="h-[18px] w-[18px]" /></div>
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

/** Redimensiona a foto no navegador (256px, JPEG) antes do envio — nada de arquivos enormes no servidor. */
async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ProfileView({ profile, sessions, hasPassword }: { profile: Profile; sessions: number; hasPassword: boolean }) {
  const toast = useToast();
  const { setTheme } = useTheme();
  const { run, loading, errors } = useMutation();
  const [form, setForm] = useState({ name: profile.name, email: profile.email });
  const [prefs, setPrefs] = useState({ currency: profile.currency, monthStartDay: profile.monthStartDay, theme: profile.theme });
  const [notify, setNotify] = useState({ notifyBills: profile.notifyBills, notifyBudget: profile.notifyBudget, notifyGoals: profile.notifyGoals, notifyInsights: profile.notifyInsights });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (data: Record<string, unknown>, success?: string) => run(() => api.patch("/me", data), { success });

  const onAvatar = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Escolha uma imagem");
    try {
      await patch({ avatarUrl: await resizeImage(file) }, "📸 Foto atualizada!");
    } catch {
      toast.error("Não foi possível processar a imagem");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Perfil" description="Suas informações, preferências e segurança." />

      <div className="space-y-4">
        {/* Cabeçalho */}
        <Card className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <Avatar name={profile.name} src={profile.avatarUrl} size={80} />
            <button onClick={() => fileRef.current?.click()} className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-brand text-white" aria-label="Alterar foto"><Camera className="h-4 w-4" /></button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold">{profile.name}</p>
            <p className="text-sm text-muted">{profile.email}</p>
            <p className="mt-1 text-xs text-muted">Membro desde {formatDateLong(profile.createdAt)}</p>
          </div>
          <Badge tone={profile.plan === "PREMIUM" ? "warning" : "neutral"} className="text-xs">{profile.plan === "PREMIUM" ? <><Crown className="h-3 w-3" /> Premium</> : "Plano gratuito"}</Badge>
        </Card>

        {/* Atalhos (útil no celular, onde a navegação inferior tem só 5 itens) */}
        <Card className="p-2 lg:hidden">
          {[...NAV_MONEY.filter((n) => n.href !== "/goals"), ...NAV_INSIGHTS, { href: "/notifications", label: "Notificações", icon: Bell }].map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-subtle">
              <n.icon className="h-[18px] w-[18px] text-brand" /> {n.label}
              <ChevronRight className="ml-auto h-4 w-4 text-muted" />
            </Link>
          ))}
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Smartphone className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Instalar o app no celular</p>
            <p className="text-xs text-muted">Ícone na tela inicial e abertura em tela cheia.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_EVENT))}>Instalar</Button>
        </Card>

        <Section icon={User} title="Dados pessoais">
          <form onSubmit={(e) => { e.preventDefault(); patch(form, "Dados atualizados ✨"); }} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome" error={errors.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></Field>
            <Field label="E-mail" error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></Field>
            <div className="sm:col-span-2"><Button type="submit" loading={loading} disabled={form.name === profile.name && form.email === profile.email}>Salvar alterações</Button></div>
          </form>
        </Section>

        <Section icon={Palette} title="Preferências">
          <div className="space-y-5">
            <Field label="Tema">
              <Segmented
                value={prefs.theme}
                onChange={(t) => { setPrefs({ ...prefs, theme: t }); setTheme(t); patch({ theme: t }); }}
                options={[
                  { value: "light", label: <span className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" />Claro</span> },
                  { value: "dark", label: <span className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" />Escuro</span> },
                  { value: "system", label: <span className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />Sistema</span> },
                ]}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Moeda">
                <Select value={prefs.currency} onChange={(e) => { setPrefs({ ...prefs, currency: e.target.value }); patch({ currency: e.target.value }, "Moeda atualizada"); }}>
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Primeiro dia do mês financeiro" hint="Útil se você recebe o salário em outro dia, ex.: dia 5.">
                <Select value={prefs.monthStartDay} onChange={(e) => { const v = Number(e.target.value); setPrefs({ ...prefs, monthStartDay: v }); patch({ monthStartDay: v }, "Mês financeiro atualizado"); }}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Dia {d}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        </Section>

        <Section icon={Bell} title="Notificações" description="Escolha quais alertas você quer receber.">
          <div className="divide-y divide-border">
            {([
              ["notifyBills", "Vencimento de contas", "Avisos um dia antes e no dia do vencimento"],
              ["notifyBudget", "Orçamento", "Quando uma categoria chegar a 80% ou estourar"],
              ["notifyGoals", "Metas", "Quando estiver perto de concluir ou concluir uma meta"],
              ["notifyInsights", "Insights", "Gastos em alta, economia do mês e dicas"],
            ] as const).map(([key, label, desc]) => (
              <label key={key} className="flex items-center justify-between gap-4 py-3.5">
                <span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-muted">{desc}</span></span>
                <Switch checked={notify[key]} onChange={(v) => { setNotify({ ...notify, [key]: v }); patch({ [key]: v }); }} label={label} />
              </label>
            ))}
          </div>
        </Section>

        <Section icon={ShieldCheck} title="Segurança" description={hasPassword ? "Sua senha é armazenada com criptografia (bcrypt) e nunca fica visível." : "Você entra com o Google. Se quiser, defina também uma senha para entrar com e-mail."}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await run(() => api.put("/me/password", pw), { success: "🔒 Senha alterada!", successDescription: "Outras sessões foram encerradas." });
              if (r) setPw({ currentPassword: "", newPassword: "" });
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {hasPassword && <Field label="Senha atual" error={errors.currentPassword}><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>}
            <Field label="Nova senha" error={errors.newPassword} hint="8+ caracteres, com letras e números"><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={(hasPassword && !pw.currentPassword) || !pw.newPassword}><KeyRound className="h-4 w-4" /> {hasPassword ? "Alterar senha" : "Definir senha"}</Button></div>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-subtle p-4">
            <div>
              <p className="text-sm font-medium">Sessões ativas</p>
              <p className="text-xs text-muted">{sessions} {sessions === 1 ? "dispositivo conectado" : "dispositivos conectados"}</p>
            </div>
            <div className="flex gap-2">
              {sessions > 1 && <Button size="sm" variant="outline" onClick={() => run(() => api.delete("/me/sessions"), { success: "Outras sessões encerradas" })}>Encerrar outras</Button>}
              <Button size="sm" variant="secondary" onClick={async () => { await api.post("/auth/logout"); window.location.assign("/login"); }}><LogOut className="h-4 w-4" /> Sair</Button>
            </div>
          </div>
        </Section>

        <Section id="plano" icon={Crown} title="Seu plano" description="Prumo Premium: recursos avançados para quem quer ir além.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(FEATURES).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning-soft text-[10px]">✦</span>{label}</div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-brand to-violet-500 p-4 text-white">
            <div><p className="font-semibold">Prumo Premium</p><p className="text-xs text-white/80">Metas ilimitadas, IA financeira, relatórios em PDF/Excel e mais.</p></div>
            <Button variant="secondary" className="bg-white text-brand hover:bg-white/90" onClick={() => toast.info("Em breve!", "O plano Premium está sendo preparado. Você será avisado no lançamento. 💜")}>Quero ser Premium</Button>
          </div>
        </Section>

        <Section icon={Download} title="Exportação de dados" description="Seus dados são seus. Baixe quando quiser.">
          <div className="flex flex-wrap gap-2">
            <a href="/api/v1/export?format=csv" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-subtle"><Download className="h-4 w-4" /> Transações (CSV)</a>
            <a href="/api/v1/export?format=json" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-subtle"><FileJson className="h-4 w-4" /> Todos os dados (JSON)</a>
          </div>
        </Section>

        <Card className="border-danger/30 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-danger">Excluir conta</p>
              <p className="text-[13px] text-muted">Remove permanentemente sua conta e todos os seus dados.</p>
            </div>
            <Button variant="danger-ghost" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" /> Excluir minha conta</Button>
          </div>
        </Card>
      </div>
      {deleting && <DeleteAccountModal hasPassword={hasPassword} onClose={() => setDeleting(false)} />}
    </div>
  );
}

function DeleteAccountModal({ onClose, hasPassword }: { onClose: () => void; hasPassword: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const { run, loading, errors } = useMutation();
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Excluir conta permanentemente?"
      description="Todos os lançamentos, contas, cartões e metas serão apagados. Essa ação não pode ser desfeita."
      footer={
        <Button
          variant="danger"
          className="w-full"
          loading={loading}
          disabled={confirmText !== "EXCLUIR" || (hasPassword && !password)}
          onClick={async () => { const r = await run(() => api.delete("/me", { password })); if (r) window.location.assign("/login"); }}
        >
          Excluir definitivamente
        </Button>
      }
    >
      <div className="space-y-4">
        {hasPassword && <Field label="Sua senha" error={errors.password}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>}
        <Field label='Digite "EXCLUIR" para confirmar'><Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
