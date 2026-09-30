import { NextRequest, NextResponse } from "next/server";
import { getFeed } from "@/lib/queries/feed";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const idsParam = searchParams.get("ids");
  const limitParam = searchParams.get("limit");

  try {
    const { photos, total } = getFeed({
      path,
      year: yearParam ? Number(yearParam) : null,
      month: monthParam ? Number(monthParam) : null,
      ids: idsParam ? idsParam.split(",").filter(Boolean) : null,
      limit: limitParam ? Number(limitParam) : undefined,
    });
    return NextResponse.json({ photos, total });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
