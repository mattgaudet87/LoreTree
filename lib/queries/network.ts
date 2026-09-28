import { db, DEFAULT_USER_ID } from "@/lib/db";
import { buildFilterSQL, parseHidden, parsePath, valueFilters, type ValueFilter } from "@/lib/queries/filters";
import type { NetworkNodeType } from "@/lib/types";

const ALL_TYPES: NetworkNodeType[] = ["person", "category", "place", "event", "year"];

const TYPE_LABELS: Record<NetworkNodeType, string> = {
  person: "People",
  category: "Categories",
  place: "Places",
  event: "Events",
  year: "Years",
};

export interface NetworkNode {
  type: NetworkNodeType;
  value: string | null;
  label: string;
  count: number;
}

export interface NetworkResponse {
  path: string;
  center: NetworkNode | null;
  nodes: NetworkNode[];
}

function countPhotosForType(type: NetworkNodeType, userId: string): number {
  if (type === "year") {
    return (
      db.prepare(`SELECT COUNT(*) as c FROM photos WHERE user_id = ? AND year IS NOT NULL`).get(userId) as {
        c: number;
      }
    ).c;
  }
  return (
    db
      .prepare(
        `SELECT COUNT(DISTINCT pt.photo_id) as c FROM photo_tags pt JOIN tags t ON t.id = pt.tag_id
         WHERE pt.user_id = ? AND t.type = ?`
      )
      .get(userId, type) as { c: number }
  ).c;
}

function countMatchingPhotos(filters: ValueFilter[], userId: string): number {
  const { sql, params } = buildFilterSQL(filters, userId, "p");
  return (
    db.prepare(`SELECT COUNT(*) as c FROM photos p WHERE p.user_id = ?${sql}`).get(userId, ...params) as {
      c: number;
    }
  ).c;
}

function valuesForType(
  type: NetworkNodeType,
  filters: ValueFilter[],
  userId: string,
  limit: number | null
): { value: string; count: number }[] {
  const { sql: filterSql, params: filterParams } = buildFilterSQL(filters, userId, "p");
  let sql: string;
  let params: unknown[];

  if (type === "year") {
    sql = `SELECT CAST(p.year AS TEXT) as value, COUNT(*) as count FROM photos p WHERE p.user_id = ? AND p.year IS NOT NULL${filterSql} GROUP BY p.year ORDER BY p.year DESC`;
    params = [userId, ...filterParams];
  } else {
    sql = `SELECT t.name as value, COUNT(DISTINCT p.id) as count
           FROM photos p
           JOIN photo_tags pt ON pt.photo_id = p.id AND pt.user_id = p.user_id
           JOIN tags t ON t.id = pt.tag_id AND t.type = ?
           WHERE p.user_id = ?${filterSql}
           GROUP BY t.name ORDER BY count DESC`;
    params = [type, userId, ...filterParams];
  }

  if (limit) {
    sql += " LIMIT ?";
    params.push(limit);
  }
  return db.prepare(sql).all(...params) as { value: string; count: number }[];
}

export function getNetwork(
  pathParam: string | null | undefined,
  hiddenParam: string | null | undefined,
  userId = DEFAULT_USER_ID
): NetworkResponse {
  const segments = parsePath(pathParam);
  const hidden = parseHidden(hiddenParam);
  const path = pathParam ?? "";

  if (segments.length === 0) {
    const nodes = ALL_TYPES.filter((t) => !hidden.has(t)).map(
      (type): NetworkNode => ({
        type,
        value: null,
        label: TYPE_LABELS[type],
        count: countPhotosForType(type, userId),
      })
    );
    return { path, center: null, nodes };
  }

  const last = segments[segments.length - 1];
  const filters = valueFilters(segments);

  if (last.kind === "group") {
    if (hidden.has(last.nodeType)) {
      return { path, center: null, nodes: [] };
    }
    const values = valuesForType(last.nodeType, filters, userId, 12);
    const nodes = values.map(
      (v): NetworkNode => ({ type: last.nodeType, value: v.value, label: v.value, count: v.count })
    );
    return { path, center: null, nodes };
  }

  // last.kind === "value": this node is the center, sub-nodes are every
  // other type/value found in its matching photos, top 10 combined by count.
  const usedKeys = new Set(filters.map((f) => `${f.nodeType}:${f.value}`));
  const center: NetworkNode = {
    type: last.nodeType,
    value: last.value,
    label: last.value,
    count: countMatchingPhotos(filters, userId),
  };

  const candidates: NetworkNode[] = [];
  for (const type of ALL_TYPES) {
    if (hidden.has(type)) continue;
    for (const v of valuesForType(type, filters, userId, null)) {
      if (usedKeys.has(`${type}:${v.value}`)) continue;
      candidates.push({ type, value: v.value, label: v.value, count: v.count });
    }
  }
  candidates.sort((a, b) => b.count - a.count);

  return { path, center, nodes: candidates.slice(0, 10) };
}
