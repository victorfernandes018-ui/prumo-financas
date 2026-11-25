# Prumo — Finanças pessoais

Aplicativo de gestão financeira pessoal: receitas, despesas, cartões, contas fixas, metas, orçamento, relatórios, saúde financeira e assistente — responsivo, com modo claro/escuro.

> "Finalmente consigo entender para onde meu dinheiro está indo."

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env        # gere um AUTH_SECRET: openssl rand -hex 32
npm run setup               # cria o banco (SQLite) e carrega os dados de demonstração
npm run dev                 # http://localhost:3000
```

**Conta de demonstração** (criada pelo seed, apenas em desenvolvimento): use o botão
“Explorar conta de demonstração” na tela de login. As credenciais estão em `prisma/seed.ts`.

O mês atual da conta demo fecha em: saldo **R$ 8.540,00**, receitas **R$ 6.500,00**,
despesas **R$ 3.820,00** e disponível **R$ 2.680,00**. Para restaurar esses números a qualquer momento: `npm run db:seed`.

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `start` | Build e servidor de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:seed` | Recria a conta demo |
| `npm run db:reset` | Apaga o banco e recria tudo |

## Produção

Publicado na **Vercel** (região São Paulo, `gru1`) com banco **PostgreSQL no Neon**:
**https://prumo-financas-five.vercel.app**

```bash
npx vercel deploy --prod      # publica (roda as migrações e o build na Vercel)
```

- Desenvolvimento usa SQLite automaticamente (`DATABASE_URL="file:./dev.db"`); produção usa Postgres. Quem decide é `scripts/prisma.mjs`, pela URL.
- Mudou o `schema.prisma`? Gere uma migração nova (`npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`) dentro de `prisma/migrations/<data>_<nome>/migration.sql`. O deploy aplica sozinho.
- Variáveis na Vercel: `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (Neon), `APP_TIMEZONE`, `BETA_UNLOCK_PREMIUM`. E-mail: `SMTP_USER` + `SMTP_PASS` (Gmail, configurado). Opcionais: `RESEND_API_KEY` + `EMAIL_FROM`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (login Google — redirect: `<url>/api/v1/auth/oauth/google/callback`), `ANTHROPIC_API_KEY` (assistente com IA). Após adicionar, publique de novo.
- `.vercelignore` impede o envio de `.env` e do banco local.

## App no celular (PWA)

O Prumo é instalável como app (ícone na tela inicial, tela cheia):
- **Android/Chrome:** convite "Instalar o Prumo" aparece no app; ou menu ⋮ → Instalar app.
- **iPhone:** Safari → Compartilhar → Adicionar à Tela de Início (o app mostra esse passo a passo).
- Arquivos: `src/app/manifest.ts`, `public/sw.js`, `public/offline.html`, `src/components/pwa/`, ícones em `public/icons/` (regerar com `node scripts/generate-icons.mjs`).
- Privacidade: o service worker só guarda arquivos estáticos; dados financeiros e a API nunca vão para o cache do aparelho.
- Ao alterar `public/sw.js`, mude a constante `VERSION` para forçar a atualização nos celulares.

## Stack e arquitetura

- **Next.js 15 (App Router) + React 19 + TypeScript** — páginas são Server Components: os dados são lidos no servidor e só o necessário chega ao navegador.
- **Tailwind CSS v4** com design tokens semânticos (`src/app/globals.css`) para claro/escuro.
- **Prisma**: PostgreSQL em produção, SQLite em desenvolvimento (automático).
- **Recharts** para gráficos (paleta validada para daltonismo), **lucide** para ícones, **Zod** para validação.

```
src/
├─ app/
│  ├─ (auth)/           login, cadastro, recuperação de senha
│  ├─ (app)/            área logada (dashboard, transações, cartões, metas...)
│  ├─ onboarding/       primeiro acesso
│  └─ api/v1/           API REST versionada (pronta para um app mobile)
├─ server/              código que só roda no servidor
│  ├─ auth/             sessões, senhas, rate limit, OAuth
│  ├─ services/         regras de negócio (sempre com escopo por usuário)
│  ├─ assistant/        motor do assistente + interface para IA
│  └─ http.ts           wrapper das rotas: auth, CSRF, validação e erros
├─ components/          ui/ (design system), layout/, charts/, features/
└─ lib/                 código compartilhado: validação, datas, dinheiro, planos
```

### Decisões importantes

- **Dinheiro em centavos (inteiros)** em todo o sistema — nunca float.
- **Cartão de crédito**: cada compra vira um `CreditCardTransaction` com N parcelas (`Transaction`), cada uma na fatura certa (`invoiceKey` = mês de vencimento, calculado pelo dia de fechamento). As parcelas contam como despesa no mês em que caem. **Pagar a fatura** gera uma transferência da conta (não conta como despesa de novo).
- **Transferências** entre contas não contam como receita nem despesa.
- **Recorrência** (salário, assinaturas): a transação “mãe” gera as ocorrências de forma preguiçosa e idempotente ao abrir o app.
- **Mês financeiro** configurável (ex.: começar no dia 5, dia do salário).
- **Alertas** são gerados por um motor de insights com deduplicação (`dedupeKey`), respeitando as preferências do usuário.

## Segurança

- Senhas com **bcrypt** (custo 12); comparação em tempo constante mesmo para e-mails inexistentes.
- **Sessões no banco**: o cookie guarda um token aleatório `httpOnly` + `SameSite=Lax` (+ `Secure` em produção); o banco guarda só o hash SHA-256. Sessões são revogáveis (“encerrar outras sessões”; trocar a senha encerra as demais).
- **Proteção de rotas** em duas camadas: middleware (sem cookie → login) e validação real da sessão no servidor em cada página/rota.
- **Controle de acesso**: toda consulta é filtrada por `userId`, e IDs referenciados (conta, categoria, cartão) são verificados como pertencentes ao usuário (`server/services/ownership.ts`).
- **CSRF**: rotas de escrita rejeitam requisições de outra origem.
- **Validação e sanitização** com Zod em toda entrada (textos sem HTML/caracteres de controle, limites de tamanho, valores positivos).
- **Rate limiting** em login, cadastro, recuperação de senha e assistente.
- **Headers**: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, HSTS em produção.
- Exportação CSV protegida contra injeção de fórmulas.
- Nenhum dado bancário sensível é armazenado (sem número de cartão, agência ou senha bancária).

> O rate limiter é em memória (suficiente para uma instância). Com várias instâncias, troque por Redis mantendo a interface de `server/auth/rate-limit.ts`.

## Integrações opcionais

- **E-mail**: boas-vindas e redefinição de senha, enviados pelo Gmail via SMTP (`SMTP_USER` + `SMTP_PASS`, uma "senha de app" do Google; limite ~500/dia). Alternativa: Resend (`RESEND_API_KEY`) com domínio verificado. Sem nenhum dos dois, os e-mails vão para o log.
- **Login com Google**: fluxo OAuth 2.0 + PKCE implementado (`server/auth/google.ts`). O botão se ativa quando as credenciais existem. Apple Login segue "em breve" (exige Apple Developer Program pago).
- **Assistente com IA (Claude)**: `server/assistant/claude-provider.ts`, modelo `claude-opus-5` (configurável em `AI_MODEL`). Envia só um resumo financeiro do próprio usuário, com instrução de responder apenas com base nele; em qualquer falha, volta ao motor de regras.
- **Premium**: `lib/plans.ts` + `server/features.ts`. `BETA_UNLOCK_PREMIUM=true` libera IA e exportação PDF/Excel para todos durante os testes. Cobrança ainda não implementada.
- **Sincronização bancária / importação de extratos**: não implementadas (exigem Open Finance ou parceiro).
