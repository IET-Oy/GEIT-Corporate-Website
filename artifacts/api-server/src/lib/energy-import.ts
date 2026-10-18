import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { Open } from "unzipper";
import { normalizeReading, type Reading } from "./energy-calculations";

export const IMPORT_HEADERS = ["interval_start", "interval_end", "value", "unit"];
export async function parseEnergyImport(filename: string, fileBase64: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(fileBase64)) throw new Error("File encoding is invalid.");
  const bytes = Buffer.from(fileBase64, "base64");
  if (bytes.length === 0 || bytes.length > 2 * 1024 * 1024) throw new Error("Choose a non-empty file no larger than 2 MiB.");
  let table: unknown[][];
  if (/\.csv$/i.test(filename)) {
    table = parse(bytes, { bom: true, skip_empty_lines: true, relax_column_count: true, max_record_size: 4096 });
  } else if (/\.xlsx$/i.test(filename)) {
    // Bound decompressed content before ExcelJS sees it; ZIP metadata alone is
    // not sufficient protection against compressed oversized workbooks.
    const zip = await Open.buffer(bytes);
    if (zip.files.length > 200) throw new Error("Workbook has too many ZIP entries.");
    let expanded = 0;
    for (const entry of zip.files) {
      if (entry.type === "Directory") continue;
      for await (const chunk of entry.stream()) {
        expanded += chunk.length;
        if (expanded > 16 * 1024 * 1024) throw new Error("Expanded workbook exceeds the 16 MiB safety limit.");
      }
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as never);
    if (workbook.worksheets.length !== 1) throw new Error("Use exactly one worksheet for each import.");
    const sheet = workbook.worksheets[0];
    if (sheet.rowCount > 5001 || sheet.columnCount > 4) throw new Error("Maximum 5,000 rows and exactly four columns.");
    table = [];
    sheet.eachRow((row) => {
      const values: unknown[] = [];
      for (let c = 1; c <= 4; c++) {
        const cell = row.getCell(c);
        values.push(cell.type === ExcelJS.ValueType.Formula || typeof cell.value === "object" && cell.value !== null ? "__UNSUPPORTED_CELL__" : cell.value ?? "");
      }
      table.push(values);
    });
  } else throw new Error("Use CSV or .xlsx. Legacy .xls files are not supported.");
  if (!Array.isArray(table) || table.length < 2 || table.length > 5001) throw new Error("Provide a header and 1–5,000 data rows.");
  if (table[0].length !== 4 || table[0].map((v) => String(v).trim()).join(",") !== IMPORT_HEADERS.join(",")) throw new Error(`Required columns, in order: ${IMPORT_HEADERS.join(", ")}.`);
  const rows: Reading[] = [], errors: { row: number; message: string }[] = [];
  const spans: { s: number; e: number; row: number }[] = [];
  for (let i = 1; i < table.length; i++) {
    try {
      const cells = table[i];
      if (cells.length !== 4) throw new Error("Exactly four cells are required.");
      const [start, end, quantity, unit] = cells.map((v) => String(v ?? "").trim());
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(quantity)) throw new Error("Value must be a non-negative decimal, not a formula or formatted number.");
      const row = normalizeReading(start, end, Number(quantity), unit);
      rows.push(row); spans.push({ s: Date.parse(row.start), e: Date.parse(row.end), row: i + 1 });
    } catch (error) {
      errors.push({ row: i + 1, message: error instanceof Error ? error.message : "Invalid row." });
    }
  }
  spans.sort((a, b) => a.s - b.s);
  let maxEnd = -Infinity;
  for (const span of spans) {
    if (span.s < maxEnd) errors.push({ row: span.row, message: "Duplicate or overlapping interval in this file." });
    maxEnd = Math.max(maxEnd, span.e);
  }
  return { rows, errors, rowCount: table.length - 1, validCount: table.length - 1 - new Set(errors.map((e) => e.row)).size };
}
