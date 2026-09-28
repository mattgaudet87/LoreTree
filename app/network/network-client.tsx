"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import NodeGraph from "@/components/NodeGraph";
import { parsePath, type PathSegment } from "@/lib/queries/filters";
import type { NetworkNode } from "@/lib/queries/network";
import type { NetworkNodeType } from "@/lib/types";

const HIDDEN_KEY = "loretree:network-hidden";

const LEGEND: { type: NetworkNodeType; label: string; dot: string }[] = [
  { type: "person", label: "People", dot: "bg-node-people" },
  { type: "category", label: "Categories", dot: "bg-node-categories" },
  { type: "place", label: "Places", dot: "bg-node-places" },
  { type: "event", label: "Events", dot: "bg-node-events" },
  { type: "year", label: "Years", dot: "bg-node-years" },
];

const TYPE_LABELS: Record<NetworkNodeType, string> = {
  person: "People",
  category: "Categories",
  place: "Places",
  event: "Events",
  year: "Years",
};

function segmentToString(segment: PathSegment): string {
  return segment.kind === "group" ? `group:${segment.nodeType}` : `${segment.nodeType}:${segment.value}`;
}

function segmentsToPath(segments: PathSegment[]): string {
  return segments.map(segmentToString).join(",");
}

interface NetworkData {
  center: NetworkNode | null;
  nodes: NetworkNode[];
  total: number;
}

export default function NetworkClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const path = searchParams.get("path") ?? "";

  const [hidden, setHidden] = useState<Set<NetworkNodeType>>(new Set());
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HIDDEN_KEY);
      if (stored) setHidden(new Set(JSON.parse(stored) as NetworkNodeType[]));
    } catch {
      // Private browsing or blocked storage: legend just starts with everything on.
    }
  }, []);

  function toggleType(type: NetworkNodeType) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      try {
        window.localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore — the toggle just won't persist across visits.
      }
      return next;
    });
  }

  const segments = useMemo(() => {
    try {
      return parsePath(path);
    } catch {
      return [];
    }
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    const params = new URLSearchParams();
    if (path) params.set("path", path);
    if (hidden.size > 0) params.set("hidden", [...hidden].join(","));

    fetch(`/api/network?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load the network");
        return res.json();
      })
      .then((result: NetworkData) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      });

    return () => {
      cancelled = true;
    };
  }, [path, hidden]);

  const goToPath = useCallback(
    (newPath: string) => {
      router.push(newPath ? `/network?path=${encodeURIComponent(newPath)}` : "/network");
    },
    [router]
  );

  function selectNode(node: NetworkNode) {
    if (node.value === null) {
      goToPath(segmentsToPath([{ kind: "group", nodeType: node.type }]));
      return;
    }

    const last = segments[segments.length - 1];
    const nextSegments =
      last && last.kind === "group"
        ? [...segments.slice(0, -1), { kind: "value" as const, nodeType: node.type, value: node.value }]
        : [...segments, { kind: "value" as const, nodeType: node.type, value: node.value }];

    goToPath(segmentsToPath(nextSegments));
  }

  const crumbs = useMemo(() => {
    const items: { label: string; path: string }[] = [{ label: "Home", path: "" }];
    segments.forEach((segment, i) => {
      const label = segment.kind === "group" ? TYPE_LABELS[segment.nodeType] : segment.value;
      items.push({ label, path: segmentsToPath(segments.slice(0, i + 1)) });
    });
    return items;
  }, [segments]);

  const feedHref = path ? `/feed?filter=${encodeURIComponent(path)}` : "/feed";

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      <div className="flex flex-col gap-2 px-4 pb-2 pr-16 pt-4">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => {
            const isCurrent = i === crumbs.length - 1;
            return (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <span className="text-text-muted">/</span>}
                <button
                  onClick={() => goToPath(crumb.path)}
                  disabled={isCurrent}
                  className={isCurrent ? "font-semibold text-text" : "text-text-muted hover:text-text"}
                >
                  {i === 0 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                      <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />
                    </svg>
                  ) : (
                    crumb.label
                  )}
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {LEGEND.map((item) => {
            const on = !hidden.has(item.type);
            return (
              <button
                key={item.type}
                onClick={() => toggleType(item.type)}
                className={`flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-opacity ${
                  on ? "text-text" : "text-text-muted opacity-40 line-through"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 py-4">
        {error && <p className="text-sm text-text-muted">{error}</p>}

        {!error && data && data.nodes.length === 0 && (
          <p className="max-w-xs text-center text-sm text-text-muted">
            Nothing here yet. Try a different branch, or toggle the legend back on.
          </p>
        )}

        {!error && data && data.nodes.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={path}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <NodeGraph center={data.center} nodes={data.nodes} onSelect={selectNode} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {data && (
        <a
          href={feedHref}
          className="banner-gradient mx-4 mb-4 rounded-2xl px-4 py-4 text-center text-sm font-medium text-white shadow-lg"
        >
          View {data.total} photo{data.total === 1 ? "" : "s"}
        </a>
      )}
    </div>
  );
}
