import { NextRequest, NextResponse } from "next/server";
import { getLifetimeTimelineTags, getYearMonthsTags, type TimelineStartType } from "@/lib/queries/timeline";

const VALID_STARTS: readonly TimelineStartType[] = ["person", "place", "event"];

function isTimelineStart(value: string | null): value is TimelineStartType {
  return !!value && (VALID_STARTS as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const yearParam = searchParams.get("year");

  if (!isTimelineStart(startParam)) {
    return NextResponse.json({ error: "Invalid or missing start type" }, { status: 400 });
  }

  if (yearParam) {
    const year = Number(yearParam);
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    return NextResponse.json({ months: getYearMonthsTags(year, startParam) });
  }

  return NextResponse.json({ years: getLifetimeTimelineTags(startParam) });
}
