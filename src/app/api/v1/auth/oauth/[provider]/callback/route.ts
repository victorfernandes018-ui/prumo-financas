import { NextResponse } from "next/server";
import { appUrl } from "@/server/app-url";
import { createSession } from "@/server/auth/session";
import { handleGoogleCallback } from "@/server/auth/google";
import { db } from "@/server/db";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = appUrl();
  if (provider !== "google") return NextResponse.redirect(`${base}/login?error=oauth_unavailable`);
  try {
    const { userId, next } = await handleGoogleCallback(new URL(req.url));
    await createSession(userId);
    const user = await db.user.findUnique({ where: { id: userId }, select: { onboardingCompleted: true } });
    return NextResponse.redirect(`${base}${user?.onboardingCompleted ? next : "/onboarding"}`);
  } catch (e) {
    console.error("[oauth:google]", e);
    return NextResponse.redirect(`${base}/login?error=oauth`);
  }
}
