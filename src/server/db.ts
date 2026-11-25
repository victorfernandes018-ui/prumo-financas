import "server-only";
import { PrismaClient } from "@prisma/client";

// Garante o fuso também em scripts e workers (ver src/instrumentation.ts)
process.env.TZ ??= process.env.APP_TIMEZONE || "America/Sao_Paulo";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
