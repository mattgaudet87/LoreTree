import { valueSegment, type PathSegment } from "@/lib/queries/filters";
import type { NetworkNode, CenterNode } from "@/lib/queries/network";
import type { TimelineStartType } from "@/lib/queries/timeline";
import type { NetworkNodeType, PhotoWithTags } from "@/lib/types";

export type View = "map" | "timeline";
export type StartType = TimelineStartType;

export const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "map", label: "Map" },
  { value: "timeline", label: "Timeline" },
];

export const TIMELINE_START_OPTIONS: { value: StartType; label: string; dot: string }[] = [
  { value: "person", label: "People", dot: "bg-node-people" },
  { value: "place", label: "Place", dot: "bg-node-places" },
  { value: "event", label: "Event", dot: "bg-node-events" },
];

export const START_DOT: Record<StartType, string> = {
  person: "bg-node-people",
  place: "bg-node-places",
  event: "bg-node-events",
};

/** Updates the Lore page's URL query params; null or "" removes a param. */
export type SetParams = (updates: Record<string, string | null>) => void;

/** What the Map's /api/network call returns. */
export interface NetworkData {
  total: number;
  center: CenterNode | null;
  effectiveType: NetworkNodeType | null;
  nodes: NetworkNode[];
  more: NetworkNode[];
}

// The most photos the grid loads at once (the feed API's own cap).
export const GRID_LIMIT = 200;

/** The full-screen photo grid that opens from the Map or Timeline. */
export interface GridState {
  // Changes on every open so the grid resets its selection and bulk-tag box.
  id: number;
  photos: PhotoWithTags[];
  total: number;
  backHref: string;
  onClose: () => void;
}

export type OpenGrid = (opts: { path?: string; year?: number; month?: number }, onClose?: () => void) => unknown;

function segmentToString(segment: PathSegment): string {
  return segment.kind === "group" ? `group:${segment.nodeType}` : valueSegment(segment.nodeType, segment.value);
}

export function segmentsToPath(segments: PathSegment[]): string {
  return segments.map(segmentToString).join(",");
}
