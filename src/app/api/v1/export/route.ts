import { ApiError, authed } from "@/server/http";
import { userHasFeature } from "@/server/features";
import { exportTransactionsCsv, exportUserData } from "@/server/services/users";
import { exportXlsx } from "@/server/services/export-xlsx";
import { PERIOD_PRESETS, periodRange, type PeriodPreset } from "@/lib/dates";

export const GET = authed(async (req, { user }) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new Response(JSON.stringify(await exportUserData(user.id), null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="prumo-dados-${stamp}.json"` },
    });
  }
  if (format === "xlsx") {
    if (!userHasFeature(user, "export_pdf_excel")) throw new ApiError(403, "Exportação em Excel é um recurso Premium.");
    const p = url.searchParams.get("period") as PeriodPreset;
    const range = periodRange(PERIOD_PRESETS.includes(p) ? p : "month", user.monthStartDay, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
    return new Response(new Uint8Array(await exportXlsx(user.id, range)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="prumo-relatorio-${stamp}.xlsx"`,
      },
    });
  }
  return new Response(await exportTransactionsCsv(user.id), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="prumo-transacoes-${stamp}.csv"` },
  });
});
