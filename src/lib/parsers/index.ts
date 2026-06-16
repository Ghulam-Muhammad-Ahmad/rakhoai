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

/** Pure number / date / currency-ish cell — typical of data rows, not headers. */
function isDataLikeCell(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (/^[\d.,%\s/:\\-]+$/.test(text)) return true; // numbers, percents, dates like 2026-05-01
  if (/^(rs|pkr|usd|aed|\$|£|€)\s*[\d.,]+$/i.test(text)) return true;
  return false;
}

const HEADER_SCAN_ROWS = 10;

/**
 * Messy sheets often carry title/blank rows above the real header
 * ("Al-Noor Academy", "Fee Report May 2026", blank, then columns).
 * Score the first few rows and pick the most header-like one: mostly
 * filled, mostly text, mostly distinct values. Ties go to the earliest
 * row, so a clean sheet keeps row 0 — current behavior unchanged.
 */
function detectHeaderRowIndex(grid: string[][]): number {
  const limit = Math.min(grid.length, HEADER_SCAN_ROWS);
  let bestIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < limit; i++) {
    const cells = grid[i].map((cell) => String(cell ?? "").trim());
    const filled = cells.filter((cell) => cell !== "");
    if (filled.length < 2) continue; // titles and blanks can't be headers

    const textCells = filled.filter((cell) => !isDataLikeCell(cell));
    const distinct = new Set(filled.map((cell) => cell.toLowerCase()));
    const textRatio = textCells.length / filled.length;
    const uniqueRatio = distinct.size / filled.length;

    const score = filled.length * (0.5 + 2 * textRatio + uniqueRatio);
    // Headers sit above their data, so a later row must beat the current
    // best by a clear margin — otherwise the first data row (often filled
    // and unique too) would steal the win from the header above it.
    if (score > bestScore * 1.3) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestScore === -Infinity ? 0 : bestIndex;
}

/** Turn a raw cell grid into headers + row objects, skipping junk above the header row. */
function buildFromGrid(grid: string[][], warnings: string[]): Omit<ParseResult, "warnings"> & { warnings: string[] } {
  const trimmed = grid.map((row) => row.map((cell) => String(cell ?? "").trim()));
  const headerIndex = detectHeaderRowIndex(trimmed);

  if (headerIndex > 0) {
    warnings.push(
      `Skipped ${headerIndex} row${headerIndex === 1 ? "" : "s"} above the detected header row (titles or blank rows).`
    );
  }

  // Dedupe / fill blank header cells so no column is lost.
  const seen = new Map<string, number>();
  const headers = (trimmed[headerIndex] ?? []).map((cell, i) => {
    const base = cell || `Column_${i + 1}`;
    const key = base.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count > 1 ? `${base}_${count}` : base;
  });

  const rows = trimmed
    .slice(headerIndex + 1)
    .filter((cells) => cells.some((cell) => cell !== ""))
    .map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = cells[i] ?? "";
      });
      return row;
    });

  return {
    headers,
    sampleRows: rows.slice(0, 5),
    rows,
    totalRows: rows.length,
    warnings,
  };
}

function parseCSV(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
  });

  const warnings: string[] = [];
  if (result.errors.length > 0) {
    warnings.push(`CSV parse warnings: ${result.errors[0].message}`);
  }

  return buildFromGrid(result.data as string[][], warnings);
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

  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const result: ParseResult = buildFromGrid(grid, warnings);

  // Surface all sheet names when there are multiple, so callers can prompt the user to choose
  if (workbook.SheetNames.length > 1 && !chosenSheet) {
    result.sheetNames = workbook.SheetNames;
  }

  return result;
}
