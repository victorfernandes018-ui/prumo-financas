import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;
let dummyHash: string | null = null;

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  // Sem usuário, compara contra um hash fictício para que o tempo de resposta
  // não revele quais e-mails estão cadastrados.
  if (!hash) {
    dummyHash ??= await bcrypt.hash("prumo-dummy-password", COST);
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
