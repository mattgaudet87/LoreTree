import { NextRequest, NextResponse } from "next/server";
import { getTimeline, type TimelineStartType } from "@/lib/queries/timeline";

const VALID_STARTS: readonly TimelineStartType[] = ["person", "place", "event"];

function isTimelineStart(value: string | null): value is TimelineStartType {
  return !!value && (VALID_STARTS as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start") ?? "person";
  const yearParam = searchParams.get("year");

  if (!isTimelineStart(startParam)) {
    return NextResponse.json({ error: "Invalid start type" }, { status: 400 });
  }

  let year: number | null = null;
  if (yearParam) {
    year = Number(yearParam);
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
  }

  return NextResponse.json(getTimeline(year, startParam));
}
