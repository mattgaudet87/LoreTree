"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MAP_TYPE_COLOR } from "@/lib/node-types";
import { photoImageUrl } from "@/lib/image-url";
import type { NetworkNode } from "@/lib/queries/network";

interface OrbitMapProps {
  centerLabel: string;
  centerCount: number;
  nodes: NetworkNode[];
  onSelect: (node: NetworkNode) => void;
  onViewImages: () => void;
}

const INNER_RADIUS = 105;
const OUTER_RADIUS = 150;

function shortenName(name: string, max: number): string {
  return name.length <= max ? name : name.slice(0, max).trimEnd() + "…";
}

// Circle size grows with the square root of the photo count, from `min` (the
// ring's smallest count) to `max` (its largest), so one huge node doesn't shrink the rest.
function sizeFor(count: number, counts: number[], min: number, max: number): number {
  const lo = Math.sqrt(Math.min(...counts));
  const hi = Math.sqrt(Math.max(...counts));
  if (hi === lo) return Math.round((min + max) / 2);
  return Math.round(min + ((Math.sqrt(count) - lo) / (hi - lo)) * (max - min));
}

interface Placed {
  node: NetworkNode;
  x: number;
  y: number;
  size: number;
}

/** Puts the biggest nodes on the inner ring and the rest on the outer ring, in the gaps between. */
function layout(nodes: NetworkNode[]): Placed[] {
  const sorted = [...nodes].sort((a, b) => b.count - a.count).slice(0, 12);
  const crowded = sorted.length > 8;
  const perRing = crowded ? 6 : 4;
  const step = crowded ? 60 : 90;
  const innerStart = -120;
  const outerStart = crowded ? -90 : -75;

  const inner = sorted.slice(0, perRing);
  const outer = sorted.slice(perRing);
  const place = (ring: NetworkNode[], radius: number, start: number, min: number, max: number): Placed[] => {
    const counts = ring.map((n) => n.count);
    return ring.map((node, i) => {
      const angle = ((start + i * step) * Math.PI) / 180;
      return {
        node,
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
        size: sizeFor(node.count, counts, min, max),
      };
    });
  };
  return [...place(inner, INNER_RADIUS, innerStart, 48, 64), ...place(outer, OUTER_RADIUS, outerStart, 34, 40)];
}

/** The Map: a center circle with the photos' people / places / events orbiting it. */
export default function OrbitMap({ centerLabel, centerCount, nodes, onSelect, onViewImages }: OrbitMapProps) {
  const reduceMotion = useReducedMotion();
  const placed = layout(nodes);

  return (
    <div className="relative mx-auto h-[380px] w-full max-w-[358px]">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-border"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-surface-2"
      />

      <button
        type="button"
        onClick={onViewImages}
        aria-label={`View ${centerCount} photos of ${centerLabel}`}
        className="banner-gradient absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full text-center outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{ boxShadow: "0 0 50px rgba(90,174,234,.3)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-[30px] w-[30px] rounded-lg shadow-md" />
        <span className="max-w-[80px] truncate text-[15px] font-bold leading-tight text-white">
          {shortenName(centerLabel, 12)}
        </span>
        <span className="text-[11px] leading-none text-white/85">{centerCount.toLocaleString()} photos</span>
      </button>

      {placed.map(({ node, x, y, size }, i) => (
        <div
          key={`${node.type}:${node.value}`}
          className="absolute"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
          }}
        >
          <motion.button
            type="button"
            onClick={() => onSelect(node)}
            aria-label={`${node.label}, ${node.count} photo${node.count === 1 ? "" : "s"}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: reduceMotion ? 0 : i * 0.03 }}
            className="relative h-full w-full rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span
              className="block h-full w-full overflow-hidden rounded-full border-2 bg-surface-2"
              style={{ borderColor: MAP_TYPE_COLOR[node.type] }}
            >
              {node.coverId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoImageUrl({ id: node.coverId, image_version: node.coverVersion }, "thumb")}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              )}
            </span>
            <span className="absolute -bottom-1 -right-1.5 flex h-5 min-w-[22px] items-center justify-center rounded-full bg-text px-1 text-[10px] font-bold text-bg">
              {node.count}
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-text">
              {shortenName(node.label, 10)}
            </span>
          </motion.button>
        </div>
      ))}
    </div>
  );
}
