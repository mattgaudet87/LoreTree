import { NextRequest, NextResponse } from "next/server";
import { getTopPeople } from "@/lib/queries/people";

export async function GET(request: NextRequest) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 8);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 200) : 8;
  return NextResponse.json({ people: getTopPeople(safeLimit) });
}
