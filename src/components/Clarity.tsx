"use client";
import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

// Gated on NEXT_PUBLIC_CLARITY_ID — unset in prod = no tracking, set in beta env.
export function ClarityInit() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (id) Clarity.init(id);
  }, []);
  return null;
}
