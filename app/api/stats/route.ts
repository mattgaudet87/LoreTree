import { NextResponse } from "next/server";
import { ESTIMATED_COST_PER_PHOTO } from "@/lib/ai";
import { db, DEFAULT_USER_ID } from "@/lib/db";

function countWhere(clause: string, ...params: unknown[]): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM photos WHERE user_id = ?${clause}`).get(...params) as { c: number })
    .c;
}

export async function GET() {
  const userId = DEFAULT_USER_ID;
  // The most common reasons photos failed, so Settings can say why.
  const errorReasons = db
    .prepare(
      `SELECT COALESCE(ai_error, 'Unknown error') as reason, COUNT(*) as count
       FROM photos WHERE user_id = ? AND ai_status = 'error'
       GROUP BY reason ORDER BY count DESC LIMIT 5`
    )
    .all(userId) as { reason: string; count: number }[];

  return NextResponse.json({
    imported: countWhere("", userId),
    analyzed: countWhere(" AND ai_status = 'done'", userId),
    waiting: countWhere(" AND ai_status = 'none'", userId),
    errors: countWhere(" AND ai_status = 'error'", userId),
    errorReasons,
    estimatedCostPerPhoto: ESTIMATED_COST_PER_PHOTO,
  });
}
