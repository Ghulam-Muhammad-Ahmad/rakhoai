import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ParseResult {
  headers: string[];
  sampleRows: Record<string, string>[];
  rows: Record<string, string>[];
  totalRows: number;
  warnings: string[];
  /** Populated for Excel files with more than one sheet, so callers can prompt the user to choose. */
  sheetNames?: string[];
}

export interface ParseOptions {
  /** For Excel files: which sheet to parse. Falls back to the first sheet if not found. */
  sheet?: string;
}

export async function parseFile(
  buffer: Buffer,
  fileName: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return parseCSV(buffer);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(buffer, options.sheet);
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

function parseExcel(buffer: Buffer, chosenSheet?: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const warnings: string[] = [];

  // Resolve which sheet to use
  const resolvedSheet =
    chosenSheet && workbook.SheetNames.includes(chosenSheet)
      ? chosenSheet
      : workbook.SheetNames[0];
  const sheetName = resolvedSheet;
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

  const result: ParseResult = {
    headers,
    sampleRows: nonEmpty.slice(0, 5),
    rows: nonEmpty,
    totalRows: nonEmpty.length,
    warnings,
  };

  // Surface all sheet names when there are multiple, so callers can prompt the user to choose
  if (workbook.SheetNames.length > 1 && !chosenSheet) {
    result.sheetNames = workbook.SheetNames;
  }

  return result;
}
