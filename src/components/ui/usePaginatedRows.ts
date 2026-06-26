"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";

/** Client-side pagination state that fetches each page from a GET route
 *  returning `{ rows, total }`. Resets to page 1 when filters/perPage change,
 *  and clamps the page when it runs past the end (e.g. after deletes). */
export function usePaginatedRows<T>(endpoint: string, filters: Record<string, string | undefined> = {}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const filterKey = JSON.stringify(filters);

  // Reset to page 1 when filters or perPage change — React's render-time
  // "adjust state on prop change" pattern (no effect, no cascading render).
  const resetKey = `${filterKey}|${perPage}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    for (const [k, v] of Object.entries(JSON.parse(filterKey) as Record<string, string | undefined>)) {
      if (v) p.set(k, v);
    }
    try {
      const res = await fetch(`${endpoint}?${p.toString()}`);
      const json = await res.json();
      const r: T[] = json.rows ?? [];
      const t: number = json.total ?? 0;
      // Page ran past the end (perPage shrank / rows deleted) — clamp and refetch.
      if (r.length === 0 && t > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(t / perPage)));
        return;
      }
      setRows(r);
      setTotal(t);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, perPage, filterKey]);

  // Fetch on mount + whenever load() changes (page/perPage/filters). The sync
  // setLoading inside load is intentional for the fetch's loading flag.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  return { rows, total, page, setPage, perPage, setPerPage, loading, reload: load };
}
