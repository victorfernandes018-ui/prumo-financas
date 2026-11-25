import { NextResponse } from "next/server";
import { enabledOAuthProviders } from "@/server/auth/oauth";
import { googleAuthorizationUrl } from "@/server/auth/google";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  if (provider !== "google" || !enabledOAuthProviders().includes("google")) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", url));
  }
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(await googleAuthorizationUrl(safeNext));
}
