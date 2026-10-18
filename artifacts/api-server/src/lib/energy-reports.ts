import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import { PlatformError } from "./platform-session";
import { IMPORT_HEADERS } from "./energy-import";

export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function csv(rows: unknown[][]) { return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n"; }
function attachment(res: Response, name: string, type: string) {
  res.set({ "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" });
}
export async function energyTemplate(format: string, res: Response) {
  if (!["csv", "xlsx", "demo-csv"].includes(format)) throw new PlatformError(400, "Choose csv, xlsx or demo-csv.");
  const rows: unknown[][] = [IMPORT_HEADERS];
  if (format === "demo-csv") for (let i = 0; i < 24; i++) rows.push([
    new Date(Date.UTC(2026, 0, 1, i)).toISOString(), new Date(Date.UTC(2026, 0, 1, i + 1)).toISOString(), i >= 8 && i < 18 ? 12 : 4, "kWh",
  ]);
  if (format !== "xlsx") {
    attachment(res, format === "demo-csv" ? "GEIT-SYNTHETIC-DEMO.csv" : "GEIT-interval-import-template.csv", "text/csv; charset=utf-8");
    res.send(csv(rows)); return;
  }
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet("Interval readings");
  sheet.addRows(rows); sheet.columns.forEach((col) => { col.width = 28; });
  attachment(res, "GEIT-interval-import-template.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(Buffer.from(await book.xlsx.writeBuffer()));
}
export async function energyReport(record: Record<string, any>, format: string, res: Response) {
  if (!["csv", "xlsx", "pdf"].includes(format)) throw new PlatformError(400, "Choose csv, xlsx or pdf.");
  const r = record.result, snapshot = record.snapshot;
  const summary: unknown[][] = [
    ["GEIT Energy Management — modelled analysis"], ["Dataset", record.is_demo ? "SYNTHETIC DEMO — NOT CUSTOMER DATA" : "Customer data"],
    ["Analysis", record.name], ["Saved UTC", record.created_at], ["Algorithm", r.version],
    ["Period start", snapshot.inputs.start], ["Period end (exclusive)", snapshot.inputs.end], ["Time zone", r.timezone],
    ["Meter", snapshot.meter.name], ["Site", snapshot.site.name], ["Reading SHA-256", snapshot.readingHash],
    ["Intervals", r.readingCount], ["Consumption kWh", r.kwh], ["Peak interval-average kW", r.peakKw],
    ["Observed average kW", r.averageKw], ["Load factor %", r.loadFactorPercent], ["Coverage %", r.coveragePercent],
    ["Observed hours", r.coveredHours], ["Energy intensity kWh/m2", r.intensityKwhM2],
    ["Modelled total cost", r.cost], ["Currency", r.currency], ["Energy cost", r.energyCost], ["Standing cost", r.standingCost], ["Demand cost", r.demandCost],
    ["Baseline change %", r.baselineChangePercent], ["Target difference kWh", r.targetDifferenceKwh],
    ["Tariff snapshot", snapshot.tariff ? JSON.stringify(snapshot.tariff) : "No tariff"],
    ...r.notes.map((note: string) => ["Assumption / limitation", note]),
  ];
  const readings: unknown[][] = [["interval_start", "interval_end", "value", "unit", "kwh"], ...snapshot.readings.map((v: Record<string, unknown>) => [v.start, v.end, v.value, v.unit, v.kwh])];
  const daily: unknown[][] = [["Local day", "kWh", "Peak interval-average kW"], ...r.daily.map((p: any) => [p.label, p.kwh, p.kw])];
  if (format === "csv") {
    attachment(res, `GEIT-energy-${record.id}.csv`, "text/csv; charset=utf-8");
    res.send(csv([...summary, [], ...daily, [], ...readings])); return;
  }
  if (format === "xlsx") {
    const book = new ExcelJS.Workbook();
    for (const [name, rows] of [["Summary", summary], ["Daily", daily], ["Readings", readings]] as const) {
      const sheet = book.addWorksheet(name); sheet.addRows(rows); sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((col) => { col.width = 30; });
    }
    attachment(res, `GEIT-energy-${record.id}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(Buffer.from(await book.xlsx.writeBuffer())); return;
  }
  const doc = new PDFDocument({ size: "A4", margin: 44 });
  const chunks: Buffer[] = [];
  const buffer = new Promise<Buffer>((resolve, reject) => { doc.on("data", (data) => chunks.push(data)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  doc.fontSize(17).fillColor("#10243a").text("GEIT Energy Intelligence");
  for (const row of summary) {
    if (doc.y > 735) doc.addPage();
    doc.moveDown(0.4).fontSize(9).fillColor("#10243a").text(row.map((v) => v == null ? "Not available" : String(v)).join(": "));
  }
  doc.addPage().fontSize(14).text("Daily consumption");
  doc.fontSize(9).text("Summary report. All interval inputs are available in CSV and Excel exports.");
  for (const row of daily) { if (doc.y > 735) doc.addPage(); doc.moveDown(0.3).fontSize(9).text(row.join(" | ")); }
  doc.end();
  attachment(res, `GEIT-energy-${record.id}.pdf`, "application/pdf");
  res.send(await buffer);
}
