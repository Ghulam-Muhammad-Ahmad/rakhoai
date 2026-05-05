import { NextRequest, NextResponse } from "next/server";
import { getCsvTemplate } from "@/lib/imports/templates";
import type { EntityType } from "@/lib/imports/types";

type Params = { params: Promise<{ entity: string }> };

const ENTITY_TYPES: EntityType[] = ["students", "teachers", "sessions", "payments"];

export async function GET(_req: NextRequest, { params }: Params) {
  const { entity } = await params;
  if (!ENTITY_TYPES.includes(entity as EntityType)) {
    return NextResponse.json({ error: "Unknown template type" }, { status: 404 });
  }

  const csv = getCsvTemplate(entity as EntityType);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rakho-${entity}-template.csv"`,
    },
  });
}
