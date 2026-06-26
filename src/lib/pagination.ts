// Shared pagination constants + param parsing for the dashboard tables.
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PER_PAGE = 25;

// Safety cap for the in-memory-paginated tables (Students/Tutors): they fetch
// the full set to filter/aggregate, then slice. Above this, totals under-report
// and they'd need true DB pagination.
// ponytail: 2000-row cap; switch Students/Tutors to DB-level range if academies exceed it.
export const IN_MEMORY_FETCH_CAP = 2000;

export function parsePageParams(sp: URLSearchParams) {
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const raw = Number(sp.get("perPage")) || DEFAULT_PER_PAGE;
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(raw) ? raw : DEFAULT_PER_PAGE;
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}
