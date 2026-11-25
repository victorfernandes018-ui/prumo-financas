import "server-only";
import ExcelJS from "exceljs";
import { db } from "../db";
import { categoryBreakdown, periodTotals } from "./analytics";
import type { DateRange } from "@/lib/dates";

const TYPE_LABEL: Record<string, string> = { INCOME: "Receita", EXPENSE: "Despesa", TRANSFER: "Transferência" };
const BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';

/** Planilha com resumo, transações e gastos por categoria do período. */
export async function exportXlsx(userId: string, range: DateRange) {
  const [txs, totals, cats] = await Promise.all([
    db.transaction.findMany({
      where: { userId, date: { gte: range.start, lt: range.end } },
      include: { category: true, account: true, toAccount: true, creditCard: true },
      orderBy: { date: "asc" },
    }),
    periodTotals(userId, range),
    categoryBreakdown(userId, range),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Prumo";
  const header = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B5CF0" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  const summary = wb.addWorksheet("Resumo");
  summary.columns = [{ header: "Indicador", key: "k", width: 28 }, { header: "Valor", key: "v", width: 18, style: { numFmt: BRL } }];
  header(summary);
  summary.addRows([
    { k: "Período", v: `${range.start.toLocaleDateString("pt-BR")} a ${new Date(range.end.getTime() - 1).toLocaleDateString("pt-BR")}` },
    { k: "Receitas", v: totals.income / 100 },
    { k: "Despesas", v: totals.expense / 100 },
    { k: "Resultado", v: totals.net / 100 },
    { k: "Lançamentos", v: totals.count },
  ]);
  summary.getCell("B2").numFmt = "@";
  summary.getCell("B6").numFmt = "0";

  const ws = wb.addWorksheet("Transações");
  ws.columns = [
    { header: "Data", key: "date", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Tipo", key: "type", width: 14 },
    { header: "Descrição", key: "desc", width: 34 },
    { header: "Categoria", key: "cat", width: 18 },
    { header: "Conta / Cartão", key: "acc", width: 20 },
    { header: "Parcela", key: "inst", width: 10 },
    { header: "Valor", key: "amount", width: 16, style: { numFmt: BRL } },
    { header: "Observação", key: "notes", width: 30 },
  ];
  header(ws);
  for (const t of txs) {
    ws.addRow({
      date: t.date,
      type: TYPE_LABEL[t.type] ?? t.type,
      desc: t.description,
      cat: t.category?.name ?? "",
      acc: t.creditCard?.name ?? (t.type === "TRANSFER" ? `${t.account?.name ?? ""} → ${t.toAccount?.name ?? "fatura"}` : t.account?.name ?? ""),
      inst: t.installmentNumber ? `${t.installmentNumber}/${t.installmentTotal}` : "",
      amount: (t.type === "EXPENSE" ? -t.amount : t.amount) / 100,
      notes: t.notes ?? "",
    });
  }
  ws.autoFilter = { from: "A1", to: "H1" };

  const wc = wb.addWorksheet("Por categoria");
  wc.columns = [
    { header: "Categoria", key: "name", width: 24 },
    { header: "Lançamentos", key: "count", width: 14 },
    { header: "% do total", key: "pct", width: 12, style: { numFmt: "0.0%" } },
    { header: "Valor", key: "amount", width: 16, style: { numFmt: BRL } },
  ];
  header(wc);
  for (const c of cats) wc.addRow({ name: c.name, count: c.count, pct: c.percent / 100, amount: c.amount / 100 });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
