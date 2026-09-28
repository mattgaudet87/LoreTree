import { db, DEFAULT_USER_ID } from "@/lib/db";
import { buildFilterSQL, isNetworkNodeType, parsePath, valueFilters, type ValueFilter } from "@/lib/queries/filters";
import type { NetworkNodeType } from "@/lib/types";

// The Map view only ever drills through these four dimensions — never
// "category", which doesn't have a place in the People/Location/Event/Date
// taxonomy the map is built around. Order here is the default cascade order:
// the first type in this list that isn't already used in the path, and
// whose values actually help distinguish the current set of photos, is what
// gets shown.
export const MAP_TYPES: NetworkNodeType[] = ["person", "place", "event", "year"];

const TYPE_LABELS: Record<NetworkNodeType, string> = {
  person: "People",
  category: "Categories",
  place: "Location",
  event: "Event",
  year: "Date",
};

export interface NetworkNode {
  type: NetworkNodeType;
  value: string;
  label: string;
  count: number;
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
  nodes: NetworkNode[];
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

  if (showParam && isNetworkNodeType(showParam) && candidateTypes.includes(showParam)) {
    const values = valuesForType(showParam, filters, userId, 12);
    effectiveType = showParam;
    if (isHelpful(values, total)) {
      nodes = values.map((v) => ({ type: showParam, value: v.value, label: v.value, count: v.count }));
    }
  } else {
    for (const type of candidateTypes) {
      const values = valuesForType(type, filters, userId, 12);
      if (isHelpful(values, total)) {
        effectiveType = type;
        nodes = values.map((v) => ({ type, value: v.value, label: v.value, count: v.count }));
        break;
      }
    }
  }

  return { total, center, effectiveType, nodes };
}

export { TYPE_LABELS as MAP_TYPE_LABELS };
