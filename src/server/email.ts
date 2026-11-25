import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { appUrl } from "./app-url";

// Envio de e-mails transacionais. Ordem de preferência:
//  1) SMTP (ex.: Gmail com "senha de app") — SMTP_USER + SMTP_PASS
//  2) Resend (https://resend.com)          — RESEND_API_KEY (exige domínio verificado para enviar a qualquer pessoa)
//  3) Sem configuração: o e-mail é apenas registrado no log (desenvolvimento).

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | null = null;

function smtp() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(email: Email) {
  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await smtp().sendMail({ from: process.env.EMAIL_FROM || `Prumo <${process.env.SMTP_USER}>`, ...email });
      return true;
    }
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM || "Prumo <onboarding@resend.dev>", ...email }),
      });
      if (!res.ok) console.error("[email] falha no envio (Resend)", res.status, await res.text());
      return res.ok;
    }
    console.info(`\n[Prumo] E-mail (não enviado — nenhum provedor configurado) para ${email.to}: ${email.subject}\n${email.text}\n`);
    return false;
  } catch (e) {
    console.error("[email] erro no envio", e instanceof Error ? e.message : e);
    return false;
  }
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0c0c10">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:20px;border:1px solid #e8e8ed;padding:32px">
<tr><td><div style="display:inline-block;background:#5b5cf0;color:#fff;font-weight:700;border-radius:10px;padding:6px 10px;font-size:14px">Prumo</div>
<h1 style="font-size:22px;margin:24px 0 12px">${title}</h1>
<div style="font-size:15px;line-height:1.6;color:#3f3f46">${body}</div>
${cta ? `<p style="margin:28px 0"><a href="${cta.url}" style="background:#5b5cf0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600;display:inline-block">${cta.label}</a></p>` : ""}
<p style="font-size:12px;color:#6b6b76;margin-top:32px">Você recebeu este e-mail porque tem uma conta no Prumo. Se não foi você, ignore esta mensagem.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function passwordResetEmail(to: string, name: string, url: string): Email {
  return {
    to,
    subject: "Redefina sua senha do Prumo",
    html: layout(`Olá, ${escape(name.split(" ")[0])}!`, "Recebemos um pedido para redefinir a senha da sua conta. O link abaixo vale por <b>1 hora</b>.", { label: "Criar nova senha", url }),
    text: `Olá! Para redefinir sua senha do Prumo, acesse (válido por 1 hora): ${url}\nSe você não pediu, ignore este e-mail.`,
  };
}

export function welcomeEmail(to: string, name: string): Email {
  const url = `${appUrl()}/dashboard`;
  return {
    to,
    subject: "Bem-vindo ao Prumo 👋",
    html: layout(
      `Que bom ter você aqui, ${escape(name.split(" ")[0])}!`,
      "Sua conta foi criada. Registre suas receitas e despesas pelo botão <b>+</b> e, em poucos dias, você vai entender exatamente para onde seu dinheiro está indo.",
      { label: "Abrir o Prumo", url },
    ),
    text: `Sua conta no Prumo foi criada. Acesse: ${url}`,
  };
}
