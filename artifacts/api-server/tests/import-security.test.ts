import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { parseEnergyImport, IMPORT_HEADERS } from "../src/lib/energy-import";

const start = "2026-01-01T00:00:00Z", end = "2026-01-01T01:00:00Z";
const encoded = (text: string) => Buffer.from(text).toString("base64");
const header = IMPORT_HEADERS.join(",");
test("empty, oversized, corrupt, disguised and executable uploads are rejected", async () => {
  for (const [filename, bytes] of [
    ["data.csv", ""], ["data.csv", Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64")],
    ["data.xlsx", encoded("not a ZIP archive")], ["data.csv.exe", encoded(`${header}\n${start},${end},1,kWh`)],
    ["data.xlsx", encoded("MZ synthetic executable")], ["data.csv", "***"],
  ]) await assert.rejects(parseEnergyImport(filename, bytes));
});
test("missing, extra, invalid units and formula cells produce actionable errors", async () => {
  for (const row of [`${start},${end},,kWh`, `${start},${end},1,unsupported`,
    `${start},${end},1,kWh,extra`, `${start},${end},+CMD(),kWh`, `${start},${end},1e309,kWh`]) {
    const result = await parseEnergyImport("data.csv", encoded(`${header}\n${row}`));
    assert.equal(result.validCount, 0); assert.equal(result.errors[0].row, 2);
  }
});
test("5,000-row limit, UTF-8 BOM and CSV quoted parsing are enforced", async () => {
  const row = `${start},${end},1,kWh`;
  await assert.rejects(parseEnergyImport("data.csv", encoded(`${header}\n${Array(5001).fill(row).join("\n")}`)));
  const valid = await parseEnergyImport("data.csv", encoded(`\ufeff${header}\r\n"${start}","${end}",1,kWh`));
  assert.equal(valid.validCount, 1); assert.equal(valid.rows[0].kwh, 1);
});
test("actual XLSX multiple worksheets and compressed expansion bombs fail explicitly", async () => {
  const multi = new ExcelJS.Workbook(); multi.addWorksheet("A"); multi.addWorksheet("B");
  await assert.rejects(parseEnergyImport("multi.xlsx", Buffer.from(await multi.xlsx.writeBuffer()).toString("base64")), /one worksheet/);
  const bomb = new ExcelJS.Workbook(), sheet = bomb.addWorksheet("Readings");
  sheet.addRow(IMPORT_HEADERS);
  for (let i = 0; i < 550; i++) sheet.addRow([`${i}${"x".repeat(32700)}`, "", "", ""]);
  const compressed = Buffer.from(await bomb.xlsx.writeBuffer());
  assert.ok(compressed.length < 2 * 1024 * 1024);
  await assert.rejects(parseEnergyImport("bomb.xlsx", compressed.toString("base64")), /16 MiB/);
});
test("parallel independent parsers do not mix valid data and duplicate previews", async () => {
  const results = await Promise.all(Array.from({ length: 16 }, (_, i) => parseEnergyImport("data.csv",
    encoded(`${header}\n${start},${end},${i},kWh${i % 2 ? `\n${start},${end},${i},kWh` : ""}`))));
  results.forEach((r, i) => {
    assert.equal(r.rows[0].value, i);
    assert.equal(r.errors.length > 0, Boolean(i % 2));
  });
});
