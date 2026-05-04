import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ParseResult {
  headers: string[];
  sampleRows: Record<string, string>[];
  rows: Record<string, string>[];
  totalRows: number;
  warnings: string[];
}

export async function parseFile(
  buffer: Buffer,
  fileName: string
): Promise<ParseResult> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return parseCSV(buffer);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(buffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}`);
  }
}

function parseCSV(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const warnings: string[] = [];
  if (result.errors.length > 0) {
    warnings.push(`CSV parse warnings: ${result.errors[0].message}`);
  }

  const rows = result.data as Record<string, string>[];
  const headers = result.meta.fields ?? [];

  return {
    headers,
    sampleRows: rows.slice(0, 5),
    rows,
    totalRows: rows.length,
    warnings,
  };
}

function parseExcel(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const warnings: string[] = [];

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Detect merged cells
  if (sheet["!merges"] && sheet["!merges"].length > 0) {
    warnings.push(
      `${sheet["!merges"].length} merged cell(s) detected and flattened.`
    );
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });

  // Filter out rows where every value is empty
  const nonEmpty = rows.filter((row) =>
    Object.values(row).some((v) => v !== "")
  );

  const headers =
    nonEmpty.length > 0
      ? Object.keys(nonEmpty[0])
      : XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];

  return {
    headers,
    sampleRows: nonEmpty.slice(0, 5),
    rows: nonEmpty,
    totalRows: nonEmpty.length,
    warnings,
  };
}
