import { NextResponse, type NextRequest } from "next/server";

// Primeira barreira (edge): sem cookie de sessão, páginas privadas redirecionam para o login.
// A validação real da sessão acontece no servidor (requireUser / authed), pois o
// middleware não acessa o banco.
const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/termos", "/privacidade"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.cookies.has("prumo_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + search)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|offline.html|icons/|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};
