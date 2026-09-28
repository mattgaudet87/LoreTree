import { NextRequest, NextResponse } from "next/server";
import { getNetwork } from "@/lib/queries/network";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const result = getNetwork(searchParams.get("path"), searchParams.get("hidden"));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid path" },
      { status: 400 }
    );
  }
}
