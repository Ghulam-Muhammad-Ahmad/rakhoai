import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getStudentRiskList } from "@/lib/students/risk";
import type { DbRiskBand, RiskBandFilter, SortDirection, StudentRiskSort } from "@/lib/students/risk-core";

function parseBand(value: string | null): RiskBandFilter | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") return upper as DbRiskBand;
  if (upper === "AT_RISK" || upper === "ALL") return upper as RiskBandFilter;
  return undefined;
}

function parseSort(value: string | null): StudentRiskSort | undefined {
  if (value === "riskScore" || value === "lastSessionDate" || value === "feesAmount" || value === "name") return value;
  return undefined;
}

function parseDirection(value: string | null): SortDirection | undefined {
  if (value === "asc" || value === "desc") return value;
  return undefined;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const students = await getStudentRiskList(dbUser.academy.id, {
    band: parseBand(searchParams.get("band")),
    tutor: searchParams.get("tutor"),
    subject: searchParams.get("subject"),
    query: searchParams.get("q"),
    sort: parseSort(searchParams.get("sort")),
    direction: parseDirection(searchParams.get("direction")),
  });

  return NextResponse.json({ students });
}
