import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import ExcelJS from "exceljs";
import { energyReport, energyTemplate } from "../src/lib/energy-reports";
import { calculateEnergy, normalizeReading } from "../src/lib/energy-calculations";
import { parseEnergyImport } from "../src/lib/energy-import";

test("downloaded CSV and XLSX import templates round-trip through the actual parser", async () => {
  const app = express(); app.get("/:format", async (req, res) => { await energyTemplate(String(req.params.format), res); });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    for (const format of ["csv", "xlsx", "demo-csv"]) {
      const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/${format}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-disposition")!, /attachment/);
      let bytes = Buffer.from(await response.arrayBuffer());
      // Blank templates intentionally contain only headers. Fill a synthetic
      // row just as the customer must; demo downloads already contain readings.
      if (format === "xlsx") {
        const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes as never);
        book.worksheets[0].addRow(["2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", 1, "kWh"]);
        bytes = Buffer.from(await book.xlsx.writeBuffer());
      } else if (format === "csv") {
        bytes = Buffer.concat([bytes, Buffer.from("\n2026-01-01T00:00:00Z,2026-01-01T01:00:00Z,1,kWh\n")]);
      }
      const result = await parseEnergyImport(`template.${format === "xlsx" ? "xlsx" : "csv"}`, bytes.toString("base64"));
      assert.equal(result.errors.length, 0); assert.ok(result.validCount > 0);
    }
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("CSV, XLSX and PDF report bytes contain reproducible synthetic results without executing formulas", async () => {
  const row = normalizeReading("2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", 10, "kWh");
  const result = calculateEnergy([row], row.start, row.end, "UTC", null);
  const record = { id: "synthetic-report", name: "=1+1", created_at: "2026-01-01T02:00:00Z", is_demo: true, result,
    snapshot: { inputs: { start: row.start, end: row.end }, readings: [row], readingHash: "synthetic-hash",
      meter: { name: "Synthetic meter" }, site: { name: "Synthetic site" }, tariff: null } };
  const app = express(); app.get("/:format", async (req, res) => { await energyReport(record, String(req.params.format), res); });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const csv = await fetch(`${base}/csv`);
    assert.equal(csv.status, 200);
    const text = await csv.text(); assert.match(text, /SYNTHETIC DEMO/);
    assert.match(text, /Consumption kWh.*10/); assert.match(text, /'=1\+1/);
    const xlsx = await fetch(`${base}/xlsx`);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await xlsx.arrayBuffer()) as never);
    assert.deepEqual(workbook.worksheets.map((s) => s.name), ["Summary", "Daily", "Readings"]);
    const name = workbook.getWorksheet("Summary")!.getCell("B3");
    assert.equal(name.type, ExcelJS.ValueType.String); assert.equal(name.value, "=1+1");
    assert.equal(workbook.getWorksheet("Readings")!.getCell("E2").value, 10);
    const pdf = await fetch(`${base}/pdf`); assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    const bytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.ok(bytes.length > 1000);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
