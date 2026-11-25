// Erros de domínio (sem dependências do Next, para uso também em scripts como o seed)
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

// Substantivos femininos recebem "encontrada" (ex.: "Transação não encontrada")
const FEMININE = new Set(["Transação", "Conta", "Categoria", "Conta recorrente", "Meta", "Notificação"]);
export const notFound = (what = "Registro") => new ApiError(404, `${what} não ${FEMININE.has(what) ? "encontrada" : "encontrado"}`);
