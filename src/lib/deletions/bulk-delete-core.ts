export type BulkDeleteTarget = "students" | "tutors" | "interventions" | "payments" | "sessions";

const BULK_DELETE_TARGETS: readonly BulkDeleteTarget[] = [
  "students",
  "tutors",
  "interventions",
  "payments",
  "sessions",
];

export type DeleteResult = {
  target: BulkDeleteTarget;
  requested: number;
  deleted: number;
  missing: string[];
};

export function normalizeDeleteIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.flatMap((value) => {
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }))];
}

export function normalizeDeleteNames(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const names: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    names.push(trimmed);
  }

  return names;
}

export function isBulkDeleteTarget(value: string): value is BulkDeleteTarget {
  return BULK_DELETE_TARGETS.includes(value as BulkDeleteTarget);
}

export function buildDeleteResult(target: BulkDeleteTarget, requestedIds: string[], deletedIds: string[]): DeleteResult {
  const deleted = new Set(deletedIds);
  return {
    target,
    requested: requestedIds.length,
    deleted: deletedIds.length,
    missing: requestedIds.filter((id) => !deleted.has(id)),
  };
}
