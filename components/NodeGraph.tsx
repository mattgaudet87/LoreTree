"use client";

import { motion } from "framer-motion";
import type { NetworkNodeType } from "@/lib/types";
import type { NetworkNode } from "@/lib/queries/network";

interface NodeGraphProps {
  centerLabel: string;
  centerCount: number;
  centerColor: string;
  nodes: NetworkNode[];
  onSelect: (node: NetworkNode) => void;
  onViewImages: () => void;
}

const TYPE_COLOR: Record<NetworkNodeType, string> = {
  person: "var(--node-people)",
  category: "var(--node-categories)",
  place: "var(--node-places)",
  event: "var(--node-events)",
  year: "var(--node-years)",
};

// Names longer than this are shortened so they still fit inside a circle.
const MAX_NAME_LENGTH = 9;

function shortenName(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name;
  return name.slice(0, MAX_NAME_LENGTH - 1).trimEnd() + "…";
}

// Node diameter, as a percentage of the graph container's width, growing
// with photo count on a square-root curve so a handful of huge outliers
// don't shrink everything else to dots.
function nodeSizePct(count: number, isCenter: boolean): number {
  const base = isCenter ? 30 : 16;
  const grown = base + Math.min(14, Math.sqrt(count) * 2.2);
  return grown;
}

export default function NodeGraph({ centerLabel, centerCount, centerColor, nodes, onSelect, onViewImages }: NodeGraphProps) {
  const ringRadiusPct = 36;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {nodes.map((node, i) => {
          const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
          const x = 50 + ringRadiusPct * Math.cos(angle);
          const y = 50 + ringRadiusPct * Math.sin(angle);
          return (
            <line
              key={`${node.type}:${node.value}`}
              x1={50}
              y1={50}
              x2={x}
              y2={y}
              stroke={TYPE_COLOR[node.type]}
              strokeWidth={0.4}
              strokeOpacity={0.5}
            />
          );
        })}
      </svg>

      <motion.button
        layout
        onClick={onViewImages}
        className="absolute flex flex-col items-center justify-center rounded-full border-2 bg-surface-2 text-center"
        style={{
          left: "50%",
          top: "50%",
          width: `${nodeSizePct(centerCount, true)}%`,
          aspectRatio: "1 / 1",
          transform: "translate(-50%, -50%)",
          borderColor: centerColor,
        }}
      >
        <span className="px-1 text-sm font-medium text-text">{shortenName(centerLabel)}</span>
        <span className="text-xs text-text-muted">{centerCount}</span>
      </motion.button>

      {nodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
        const x = ringRadiusPct * Math.cos(angle);
        const y = ringRadiusPct * Math.sin(angle);
        const size = nodeSizePct(node.count, false);

        return (
          <motion.button
            key={`${node.type}:${node.value}`}
            layout
            onClick={() => onSelect(node)}
            className="absolute flex flex-col items-center justify-center rounded-full border bg-surface text-center shadow-sm"
            style={{
              left: `calc(50% + ${x}%)`,
              top: `calc(50% + ${y}%)`,
              width: `${size}%`,
              aspectRatio: "1 / 1",
              transform: "translate(-50%, -50%)",
              borderColor: TYPE_COLOR[node.type],
            }}
          >
            <span className="px-1 text-xs font-medium leading-tight text-text">{shortenName(node.label)}</span>
            <span className="text-[10px] text-text-muted">{node.count}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
