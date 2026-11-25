import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "../db";
import { appUrl } from "../app-url";
import { createDefaultCategories } from "../services/categories";
import { generateToken } from "./tokens";
import { OAUTH_PROVIDERS } from "./oauth";

const COOKIE = "prumo_oauth";
const google = OAUTH_PROVIDERS.google;
const redirectUri = () => `${appUrl()}/api/v1/auth/oauth/google/callback`;

/** Passo 1: gera state + PKCE, guarda em cookie httpOnly e devolve a URL do Google. */
export async function googleAuthorizationUrl(next: string) {
  const state = generateToken(24);
  const verifier = generateToken(48);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  (await cookies()).set(COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth/oauth",
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: process.env[google.clientIdEnv]!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: google.scopes.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${google.authorizationUrl}?${params}`;
}

interface GoogleProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Passo 2: valida o state, troca o code por token e busca o perfil.
 * Retorna o usuário (existente, vinculado pelo e-mail verificado, ou novo).
 */
export async function handleGoogleCallback(url: URL) {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  jar.delete({ name: COOKIE, path: "/api/v1/auth/oauth" });
  if (!raw) throw new Error("state ausente");
  const saved = JSON.parse(raw) as { state: string; verifier: string; next: string };
  if (url.searchParams.get("error")) throw new Error(`google: ${url.searchParams.get("error")}`);
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== saved.state) throw new Error("state inválido");

  const tokenRes = await fetch(google.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env[google.clientIdEnv]!,
      client_secret: process.env[google.clientSecretEnv]!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
  });
  if (!tokenRes.ok) throw new Error(`troca de token falhou (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Perfil obtido direto do Google (TLS) com o token recém-emitido
  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!profileRes.ok) throw new Error("perfil indisponível");
  const profile = (await profileRes.json()) as GoogleProfile;
  if (!profile.email || !profile.email_verified) throw new Error("e-mail do Google não verificado");
  const email = profile.email.toLowerCase();

  const linked = await db.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: profile.sub } },
    select: { userId: true },
  });
  if (linked) return { userId: linked.userId, next: saved.next };

  // Vincula a uma conta existente com o mesmo e-mail (verificado pelo Google) ou cria uma nova
  let user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    user = await db.user.create({ data: { name: (profile.name || email.split("@")[0]).slice(0, 80), email }, select: { id: true } });
    await createDefaultCategories(user.id);
  }
  await db.oAuthAccount.create({ data: { provider: "google", providerAccountId: profile.sub, userId: user.id } });
  return { userId: user.id, next: saved.next };
}
