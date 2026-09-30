import { db, DEFAULT_USER_ID } from "@/lib/db";
import { HIGHLIGHT_SQL } from "@/lib/queries/highlight";
import { buildFilterSQL, isNetworkNodeType, parsePath, valueFilters, type ValueFilter } from "@/lib/queries/filters";
import { MAP_TYPES } from "@/lib/node-types";
import type { NetworkNodeType } from "@/lib/types";

export interface NetworkNode {
  type: NetworkNodeType;
  value: string;
  label: string;
  count: number;
  // The node's best photo within the current path, for the picture in its circle.
  coverId: string | null;
  coverVersion: string | null;
}

export interface CenterNode {
  type: NetworkNodeType;
  value: string;
  label: string;
  count: number;
}

export interface NetworkResponse {
  total: number;
  center: CenterNode | null;
  effectiveType: NetworkNodeType | null;
  // The first MAX_MAP_NODES values, largest first, each with a cover photo.
  nodes: NetworkNode[];
  // Any further values, shown as a plain list behind the "+N" chip.
  more: NetworkNode[];
}

// How many values get a circle on the map.
const MAX_MAP_NODES = 12;
// How many values are looked at in all (the rest of the list is cut off).
const MAX_VALUES = 100;

function coverPhoto(filters: ValueFilter[], userId: string): { coverId: string | null; coverVersion: string | null } {
  const { sql, params } = buildFilterSQL(filters, userId, "p");
  const row = db
    .prepare(
      `SELECT p.id as id, p.images_updated_at as version FROM photos p
       WHERE p.user_id = ? AND p.thumb_path IS NOT NULL${sql}
       ORDER BY ${HIGHLIGHT_SQL} DESC, p.taken_at DESC LIMIT 1`
    )
    .get(userId, ...params) as { id: string; version: string | null } | undefined;
  return { coverId: row?.id ?? null, coverVersion: row?.version ?? null };
}

function toNodes(
  type: NetworkNodeType,
  values: { value: string; count: number }[],
  filters: ValueFilter[],
  userId: string
): { nodes: NetworkNode[]; more: NetworkNode[] } {
  const make = (v: { value: string; count: number }, withCover: boolean): NetworkNode => ({
    type,
    value: v.value,
    label: v.value,
    count: v.count,
    ...(withCover
      ? coverPhoto([...filters, { nodeType: type, value: v.value }], userId)
      : { coverId: null, coverVersion: null }),
  });
  return {
    nodes: values.slice(0, MAX_MAP_NODES).map((v) => make(v, true)),
    more: values.slice(MAX_MAP_NODES).map((v) => make(v, false)),
  };
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

// A breakdown only earns a spot on the map if it actually helps sort the
// photos: more than one option, fewer options than photos (otherwise
// you're just looking at one node per photo), and at least one option that
// doesn't cover every single photo (otherwise every option is a no-op).
function isHelpful(values: { count: number }[], total: number): boolean {
  return values.length > 0 && values.length < total && values.some((v) => v.count < total);
}

export function getMapLevel(
  pathParam: string | null | undefined,
  showParam: string | null | undefined,
  userId = DEFAULT_USER_ID
): NetworkResponse {
  const segments = parsePath(pathParam).filter((s): s is Extract<typeof s, { kind: "value" }> => s.kind === "value");
  const filters = valueFilters(segments);
  const total = countMatchingPhotos(filters, userId);

  const last = segments[segments.length - 1];
  const center: CenterNode | null = last ? { type: last.nodeType, value: last.value, label: last.value, count: total } : null;

  const usedTypes = new Set(segments.map((s) => s.nodeType));
  const candidateTypes = MAP_TYPES.filter((t) => !usedTypes.has(t));

  let effectiveType: NetworkNodeType | null = null;
  let nodes: NetworkNode[] = [];
  let more: NetworkNode[] = [];

  if (showParam && isNetworkNodeType(showParam) && candidateTypes.includes(showParam)) {
    const values = valuesForType(showParam, filters, userId, MAX_VALUES);
    effectiveType = showParam;
    if (isHelpful(values.slice(0, MAX_MAP_NODES), total)) {
      ({ nodes, more } = toNodes(showParam, values, filters, userId));
    }
  } else {
    for (const type of candidateTypes) {
      const values = valuesForType(type, filters, userId, MAX_VALUES);
      if (isHelpful(values.slice(0, MAX_MAP_NODES), total)) {
        effectiveType = type;
        ({ nodes, more } = toNodes(type, values, filters, userId));
        break;
      }
    }
  }

  return { total, center, effectiveType, nodes, more };
}
