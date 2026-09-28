import { NextRequest, NextResponse } from "next/server";
import { getYearTimeline } from "@/lib/queries/timeline";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  return NextResponse.json(getYearTimeline(yearNum));
}
