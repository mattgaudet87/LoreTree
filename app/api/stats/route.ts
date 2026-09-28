import { NextResponse } from "next/server";
import { db, DEFAULT_USER_ID } from "@/lib/db";

function countWhere(clause: string, ...params: unknown[]): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM photos WHERE user_id = ?${clause}`).get(...params) as { c: number })
    .c;
}

export async function GET() {
  const userId = DEFAULT_USER_ID;
  return NextResponse.json({
    imported: countWhere("", userId),
    analyzed: countWhere(" AND ai_status = 'done'", userId),
    waiting: countWhere(" AND ai_status = 'none'", userId),
    errors: countWhere(" AND ai_status = 'error'", userId),
  });
}
