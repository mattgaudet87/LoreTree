import type { NetworkNodeType } from "@/lib/types";

const VALID_TYPES: readonly NetworkNodeType[] = [
  "person",
  "category",
  "place",
  "event",
  "year",
];

export function isNetworkNodeType(value: string): value is NetworkNodeType {
  return (VALID_TYPES as readonly string[]).includes(value);
}

export type PathSegment =
  | { kind: "group"; nodeType: NetworkNodeType }
  | { kind: "value"; nodeType: NetworkNodeType; value: string };

export type ValueFilter = { nodeType: NetworkNodeType; value: string };

/**
 * Parses a network path like "group:person" or "person:Alex,place:Kelowna"
 * into ordered segments. Throws on an unrecognized node type so bad input
 * fails loudly instead of silently matching everything.
 */
export function parsePath(path: string | null | undefined): PathSegment[] {
  if (!path) return [];
  return path
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment): PathSegment => {
      const colonIndex = segment.indexOf(":");
      if (colonIndex === -1) {
        throw new Error(`Invalid path segment "${segment}"`);
      }
      const head = segment.slice(0, colonIndex).trim();
      const rest = segment.slice(colonIndex + 1).trim();

      if (head === "group") {
        if (!isNetworkNodeType(rest)) {
          throw new Error(`Invalid node type "${rest}" in path segment "${segment}"`);
        }
        return { kind: "group", nodeType: rest };
      }

      if (!isNetworkNodeType(head)) {
        throw new Error(`Invalid node type "${head}" in path segment "${segment}"`);
      }
      if (!rest) {
        throw new Error(`Missing value in path segment "${segment}"`);
      }
      return { kind: "value", nodeType: head, value: rest };
    });
}

export function valueFilters(segments: PathSegment[]): ValueFilter[] {
  return segments
    .filter((s): s is Extract<PathSegment, { kind: "value" }> => s.kind === "value")
    .map(({ nodeType, value }) => ({ nodeType, value }));
}

/**
 * Builds " AND ..." SQL fragments (with bound params) that restrict a
 * `photos p`-aliased query to rows matching every filter, AND-ed together.
 * Each filter gets its own uniquely-aliased EXISTS subquery so repeated
 * filters of the same tag type (e.g. two different people) don't collide.
 */
export function buildFilterSQL(
  filters: ValueFilter[],
  userId: string,
  alias = "p"
): { sql: string; params: unknown[] } {
  let sql = "";
  const params: unknown[] = [];

  filters.forEach((filter, index) => {
    if (filter.nodeType === "year") {
      sql += ` AND ${alias}.year = ?`;
      params.push(Number(filter.value));
      return;
    }

    const ptAlias = `pt_f${index}`;
    const tAlias = `t_f${index}`;
    sql += ` AND EXISTS (SELECT 1 FROM photo_tags ${ptAlias} JOIN tags ${tAlias} ON ${tAlias}.id = ${ptAlias}.tag_id WHERE ${ptAlias}.photo_id = ${alias}.id AND ${ptAlias}.user_id = ? AND ${tAlias}.type = ? AND ${tAlias}.name = ?)`;
    params.push(userId, filter.nodeType, filter.value);
  });

  return { sql, params };
}
