import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { EngineeringScenario } from "@workspace/api-zod";
import { PlatformError } from "../platform-session";
import { csvCell } from "../energy-reports";
export function flatten(value: unknown, path = "", out: unknown[][] = []): unknown[][] {
  if (value && typeof value === "object") for (const [k, child] of Object.entries(value)) flatten(child, path ? `${path}.${k}` : k, out);
  else out.push([path, value ?? "Not available"]);
  return out;
}
export async function exportEngineeringReport(saved: EngineeringScenario, format: string, res: Response) {
  if (!["csv", "xlsx", "pdf", "json"].includes(format)) throw new PlatformError(400, "Choose CSV, Excel, PDF or JSON.");
  const r = saved.result, p = saved.projectSnapshot;
  const summary: unknown[][] = [
    ["GEIT Engineering — screening report"], ["Project", p.name], ["Facility / boundary", p.facility], ["Project brief", p.brief],
    ["Module", saved.module], ["Scenario", saved.name], ["Saved UTC", saved.created_at], ["Currency", p.currency],
    ["Engine version", r.version], ["Input SHA-256", saved.inputHash], ["Source", saved.inputs.sourceNotes],
    ["Integration status", "Manual inputs; external providers not configured"],
    ...r.metrics.map((m) => [m.label, m.value ?? "Not available", m.unit, m.description]),
    ...r.formulas.map((s) => ["Formula", s]), ...r.assumptions.map((s) => ["Assumption", s]), ...r.warnings.map((s) => ["Warning", s]),
  ];
  const sections = [{ title: "Summary", rows: summary }, { title: "Inputs", rows: [["Field", "Value"], ...flatten(saved.inputs)] },
    ...(r.provenance ? [{ title: "Provenance", rows: [["Field", "Value"], ...flatten(r.provenance)] }] : []),
    ...r.tables.map((t) => ({ title: t.title, rows: [
      t.columns.map((c) => c.unit ? `${c.label} (${c.unit})` : c.label),
      ...t.rows.map((row) => t.columns.map((c) => row[c.key] ?? "Not available")),
    ] }))];
  const type = format === "json" ? "application/json" : format === "csv" ? "text/csv; charset=utf-8" :
    format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
  res.set({ "Content-Type": type, "Content-Disposition": `attachment; filename="GEIT-${saved.module}-${saved.id}.${format}"`, "Cache-Control": "no-store" });
  if (format === "json") { res.send(JSON.stringify(saved, null, 2)); return; }
  if (format === "csv") {
    res.send(sections.flatMap((s) => [[s.title], ...s.rows, []]).map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n"); return;
  }
  if (format === "xlsx") {
    const book = new ExcelJS.Workbook();
    for (const [index, section] of sections.entries()) {
      const sheet = book.addWorksheet(`${index + 1} ${section.title}`.replace(/[\\/*?:[\]]/g, "").slice(0, 31));
      sheet.addRows(section.rows); sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((c) => { c.width = 28; });
    }
    res.send(Buffer.from(await book.xlsx.writeBuffer())); return;
  }
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];
  const ready = new Promise<Buffer>((resolve, reject) => { doc.on("data", (data) => chunks.push(data)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  doc.fontSize(17).fillColor("#10243a").text("GEIT Engineering — screening report");
  const text = (s: string) => { if (doc.y > 725) doc.addPage(); doc.moveDown(0.3).fontSize(9).fillColor("#10243a").text(s); };
  for (const row of summary) text(row.join(" | "));
  text("Full immutable inputs and all result rows are included in the CSV, Excel and JSON downloads.");
  for (const t of r.tables) {
    doc.addPage().fontSize(13).text(t.title);
    text(`PDF shows ${Math.min(50, t.rows.length)} of ${t.rows.length} rows. Wide rows are listed as labelled fields below.`);
    for (const [index, row] of t.rows.slice(0, 50).entries()) text(`Row ${index + 1}: ${t.columns.map((c) => `${c.label} = ${row[c.key] ?? "Not available"} ${c.unit}`).join("; ")}`);
  }
  doc.end(); res.send(await ready);
}
