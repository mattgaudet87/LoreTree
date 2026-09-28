import { NextResponse } from "next/server";
import { getLifetimeTimeline } from "@/lib/queries/timeline";

export async function GET() {
  const years = getLifetimeTimeline();
  return NextResponse.json({ years });
}
