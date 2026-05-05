export type DbRiskBand = "HIGH" | "MEDIUM" | "LOW";
export type RiskLevel = "high" | "medium" | "low" | "unscored" | "needs_data";
export type RiskBandFilter = DbRiskBand | "AT_RISK" | "ALL";
export type StudentRiskSort = "riskScore" | "lastSessionDate" | "feesAmount" | "name";
export type SortDirection = "asc" | "desc";

export type RiskLike = {
  id?: string;
  riskBand?: string | null;
  riskScore?: number | null;
  confidence?: number | null;
  computedAt?: string | null;
};

export type ActionLike = {
  id?: string;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FilterableStudentRiskRow = {
  id: string;
  name: string;
  contact?: string | null;
  tutor?: string | null;
  subject?: string | null;
  feesAmount?: number | null;
  lastSessionDate?: string | null;
  latestRisk?: RiskLike | null;
};

export type StudentRiskFilters = {
  band?: RiskBandFilter | null;
  tutor?: string | null;
  subject?: string | null;
  query?: string | null;
  sort?: StudentRiskSort | null;
  direction?: SortDirection | null;
};

export function selectLatestRisk<T extends RiskLike>(assessments: T[] | null | undefined): T | null {
  if (!assessments?.length) return null;

  return [...assessments].sort((a, b) => {
    const aTime = a.computedAt ? new Date(a.computedAt).getTime() : 0;
    const bTime = b.computedAt ? new Date(b.computedAt).getTime() : 0;
    return bTime - aTime;
  })[0] ?? null;
}

export function normalizeRiskLevel(riskBand?: string | null, confidence?: number | null): RiskLevel {
  if (!riskBand) return "unscored";
  if (riskBand === "HIGH") return "high";
  if (riskBand === "MEDIUM") return "medium";
  if (riskBand === "LOW" && confidence != null && confidence < 0.8) return "needs_data";
  if (riskBand === "LOW") return "low";
  return "unscored";
}

export function selectLatestActionStatus<T extends ActionLike>(actions: T[] | null | undefined): string | null {
  if (!actions?.length) return null;

  return [...actions].sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  })[0]?.status ?? null;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function matchesText(value: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected) return true;
  return (value ?? "").toLowerCase() === expected.toLowerCase();
}

function matchesQuery(row: FilterableStudentRiskRow, query: string | null | undefined): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return [row.name, row.id, row.contact, row.tutor, row.subject]
    .some((value) => (value ?? "").toLowerCase().includes(q));
}

function matchesBand(row: FilterableStudentRiskRow, band: RiskBandFilter | null | undefined): boolean {
  const normalized = band ?? "ALL";
  if (normalized === "ALL") return true;
  const rowBand = row.latestRisk?.riskBand ?? null;
  if (normalized === "AT_RISK") return rowBand === "HIGH" || rowBand === "MEDIUM";
  return rowBand === normalized;
}

function sortValue(row: FilterableStudentRiskRow, sort: StudentRiskSort): string | number {
  if (sort === "name") return row.name.toLowerCase();
  if (sort === "feesAmount") return row.feesAmount ?? 0;
  if (sort === "lastSessionDate") return row.lastSessionDate ? new Date(row.lastSessionDate).getTime() : 0;
  return row.latestRisk?.riskScore ?? 0;
}

export function filterAndSortStudentRiskRows<T extends FilterableStudentRiskRow>(
  rows: T[],
  filters: StudentRiskFilters
): T[] {
  const sort = filters.sort ?? "riskScore";
  const direction = filters.direction ?? "desc";
  const multiplier = direction === "asc" ? 1 : -1;

  return rows
    .filter((row) => matchesBand(row, filters.band))
    .filter((row) => matchesText(row.tutor, filters.tutor))
    .filter((row) => matchesText(row.subject, filters.subject))
    .filter((row) => matchesQuery(row, filters.query))
    .sort((a, b) => {
      const aValue = sortValue(a, sort);
      const bValue = sortValue(b, sort);

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * multiplier;
      }

      return ((aValue as number) - (bValue as number)) * multiplier;
    });
}
