#!/usr/bin/env node
// Executa o Prisma CLI escolhendo o banco pela DATABASE_URL:
//  - "file:..."      → SQLite (desenvolvimento local, zero configuração)
//  - "postgres(ql)://" → PostgreSQL (produção), usando prisma/schema.prisma
// Uso: node scripts/prisma.mjs <comando prisma>   |   node scripts/prisma.mjs deploy
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function loadDotEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadDotEnv();

const url = process.env.DATABASE_URL ?? "";
const sqlite = url.startsWith("file:");
let args = process.argv.slice(2);

if (sqlite) {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
    .replace('provider  = "postgresql"', 'provider  = "sqlite"')
    .replace(/\n\s*directUrl\s*=.*\n/, "\n");
  writeFileSync("prisma/schema.sqlite.prisma", `// ARQUIVO GERADO por scripts/prisma.mjs — não edite.\n${schema}`);
}

// "deploy": migrações versionadas no Postgres; db push no SQLite local
if (args[0] === "deploy") args = sqlite ? ["db", "push", "--skip-generate"] : ["migrate", "deploy"];
if (sqlite && !args.some((a) => a.startsWith("--schema"))) args.push("--schema=prisma/schema.sqlite.prisma");
if (!sqlite && !process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = url;

execFileSync("npx", ["prisma", ...args], { stdio: "inherit", env: process.env });
