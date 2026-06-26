"use client";

import { useState } from "react";
import { StudentsFilterBar } from "./StudentsFilterBar";
import { StudentsBulkTable } from "./StudentsBulkTable";
import { useDebounced } from "@/components/ui/useDebounced";
import type { StudentRiskListItem } from "@/lib/students/risk";

/** Owns the students filter/search state client-side and feeds the paginated
 *  table — no page navigation, so filtering/search is instant + smooth.
 *  `allStudents` powers the band counts only. */
export function StudentsBrowser({ allStudents }: { allStudents: StudentRiskListItem[] }) {
  const [band, setBand] = useState("ALL");
  const [sort, setSort] = useState("riskScore");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);

  return (
    <>
      <StudentsFilterBar students={allStudents} band={band} sort={sort} q={q} onBand={setBand} onSort={setSort} onQuery={setQ} />
      <StudentsBulkTable filters={{ band: band === "ALL" ? undefined : band, sort, q: dq }} />
    </>
  );
}
