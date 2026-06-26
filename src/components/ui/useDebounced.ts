"use client";

import { useEffect, useState } from "react";

/** Returns `value` delayed by `ms` — lets an input update instantly while the
 *  downstream fetch only fires once typing pauses. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
