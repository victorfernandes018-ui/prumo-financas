import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { getSessionUser, type SafeUser } from "./auth/session";

import { ApiError } from "./errors";

export { ApiError, notFound } from "./errors";

/** Bloqueia requisições de escrita vindas de outra origem (defesa extra contra CSRF). */
function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") throw new ApiError(403, "Origem não permitida");
    return;
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new Error();
  } catch {
    throw new ApiError(403, "Origem não permitida");
  }
}

export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Corpo da requisição inválido");
  }
  return schema.parse(json);
}

export function parseQuery<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): T {
  const params = Object.fromEntries(
    [...new URL(req.url).searchParams.entries()].filter(([, v]) => v !== ""),
  );
  return schema.parse(params);
}

function handleError(e: unknown) {
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    return NextResponse.json({ error: Object.values(fields)[0] ?? "Dados inválidos", fields }, { status: 422 });
  }
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message, fields: e.fields }, { status: e.status });
  }
  console.error("[api] erro inesperado", e);
  return NextResponse.json({ error: "Algo deu errado. Tente novamente." }, { status: 500 });
}

type Ctx<P> = { params: Promise<P> };

/** Rota autenticada: resolve o usuário, valida origem e padroniza erros e respostas `{ data }`. */
export function authed<P = Record<string, string>>(
  fn: (req: Request, ctx: { user: SafeUser; params: P }) => Promise<unknown>,
) {
  return async (req: Request, context: Ctx<P>) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      const user = await getSessionUser();
      if (!user) throw new ApiError(401, "Sessão expirada. Entre novamente.");
      const result = await fn(req, { user, params: await context.params });
      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null });
    } catch (e) {
      return handleError(e);
    }
  };
}

/** Rota pública (login, cadastro...). */
export function publicRoute(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      if (req.method !== "GET") assertSameOrigin(req);
      const result = await fn(req);
      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null });
    } catch (e) {
      return handleError(e);
    }
  };
}
