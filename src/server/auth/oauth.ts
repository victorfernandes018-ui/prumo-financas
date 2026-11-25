import "server-only";

// Login social. Um provedor fica habilitado quando está implementado E suas credenciais
// existem no ambiente; a UI consulta `enabledOAuthProviders()`.
// Google: implementado (Authorization Code + PKCE) em /api/v1/auth/oauth/google.
// Apple: estrutura pronta; exige conta paga no Apple Developer Program e client secret JWT.

export type OAuthProviderId = "google" | "apple";

interface OAuthProviderConfig {
  id: OAuthProviderId;
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  implemented: boolean;
}

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProviderConfig> = {
  google: {
    id: "google",
    name: "Google",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    implemented: true,
  },
  apple: {
    id: "apple",
    name: "Apple",
    authorizationUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    scopes: ["name", "email"],
    clientIdEnv: "APPLE_CLIENT_ID",
    clientSecretEnv: "APPLE_CLIENT_SECRET",
    implemented: false,
  },
};

export function enabledOAuthProviders(): OAuthProviderId[] {
  return (Object.values(OAUTH_PROVIDERS) as OAuthProviderConfig[])
    .filter((p) => p.implemented && process.env[p.clientIdEnv] && process.env[p.clientSecretEnv])
    .map((p) => p.id);
}
