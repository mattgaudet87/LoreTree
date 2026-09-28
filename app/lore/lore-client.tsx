"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import NodeGraph from "@/components/NodeGraph";
import { parsePath, type PathSegment } from "@/lib/queries/filters";
import type { NetworkNode, CenterNode } from "@/lib/queries/network";
import type { NetworkNodeType, PhotoWithTags, TagType } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";
import type { YearTagSummary, MonthTagSummary, TimelineStartType } from "@/lib/queries/timeline";
import type { SearchResult } from "@/lib/queries/search";

const FACET_LABELS: Record<TagType, string> = {
  person: "People",
  place: "Places",
  event: "Events",
  category: "Categories",
  keyword: "Keywords",
};

const SAVED_FILTERS_KEY = "loretree:saved-filters";

type View = "map" | "timeline";
type StartType = TimelineStartType;

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "map", label: "Map" },
  { value: "timeline", label: "Timeline" },
];

// The map drills through these four in cascading order; "category" isn't
// part of the People/Location/Event/Date taxonomy the map is built around.
const MAP_TYPES: NetworkNodeType[] = ["person", "place", "event", "year"];

const MAP_TYPE_LABEL: Record<NetworkNodeType, string> = {
  person: "People",
  place: "Location",
  event: "Event",
  year: "Date",
  category: "Categories",
};

const MAP_TYPE_DOT: Record<NetworkNodeType, string> = {
  person: "bg-node-people",
  place: "bg-node-places",
  event: "bg-node-events",
  year: "bg-node-years",
  category: "bg-node-categories",
};

const MAP_TYPE_COLOR: Record<NetworkNodeType, string> = {
  person: "var(--node-people)",
  place: "var(--node-places)",
  event: "var(--node-events)",
  year: "var(--node-years)",
  category: "var(--node-categories)",
};

const TIMELINE_START_OPTIONS: { value: StartType; label: string; dot: string }[] = [
  { value: "person", label: "People", dot: "bg-node-people" },
  { value: "place", label: "Location", dot: "bg-node-places" },
  { value: "event", label: "Event", dot: "bg-node-events" },
];

const START_DOT: Record<StartType, string> = {
  person: "bg-node-people",
  place: "bg-node-places",
  event: "bg-node-events",
};

interface SavedFilter {
  id: string;
  label: string;
  view: View;
  path: string;
  show: string;
  start: StartType;
  year: string;
  query: string;
}

function segmentToString(segment: PathSegment): string {
  return segment.kind === "group" ? `group:${segment.nodeType}` : `${segment.nodeType}:${segment.value}`;
}

function segmentsToPath(segments: PathSegment[]): string {
  return segments.map(segmentToString).join(",");
}

interface NetworkData {
  total: number;
  center: CenterNode | null;
  effectiveType: NetworkNodeType | null;
  nodes: NetworkNode[];
}

interface GridState {
  photos: PhotoWithTags[];
  backHref: string;
  onClose: () => void;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="mb-2 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full border border-border bg-surface-2 text-text-muted transition-colors hover:text-text"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

function ShowToggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; dot: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-accent text-bg" : "text-text-muted hover:text-text"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function LoreClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as View) ?? "map";
  const start = (searchParams.get("start") as StartType) ?? "person";
  const path = searchParams.get("path") ?? "";
  const show = searchParams.get("show");
  const yearParam = searchParams.get("year");

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [data, setData] = useState<NetworkData | null>(null);
  const [timelineYears, setTimelineYears] = useState<YearTagSummary[] | null>(null);
  const [timelineMonths, setTimelineMonths] = useState<MonthTagSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [grid, setGrid] = useState<GridState | null>(null);
  const [gridLoading, setGridLoading] = useState(false);

  useEffect(() => {
    try {
      const storedFilters = window.localStorage.getItem(SAVED_FILTERS_KEY);
      if (storedFilters) setSavedFilters(JSON.parse(storedFilters) as SavedFilter[]);
    } catch {
      // Ignore — saved filters just start empty.
    }
  }, []);

  const segments = useMemo(() => {
    try {
      return parsePath(path).filter(
        (s): s is Extract<PathSegment, { kind: "value" }> => s.kind === "value"
      );
    } catch {
      return [];
    }
  }, [path]);

  const usedTypes = useMemo(() => new Set(segments.map((s) => s.nodeType)), [segments]);
  const candidateTypes = useMemo(() => MAP_TYPES.filter((t) => !usedTypes.has(t)), [usedTypes]);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.push(qs ? `/lore?${qs}` : "/lore");
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (view !== "map") return;
    let cancelled = false;
    setError(null);
    setData(null);

    const params = new URLSearchParams();
    if (path) params.set("path", path);
    if (show) params.set("show", show);

    fetch(`/api/network?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load the map");
        return res.json();
      })
      .then((result: NetworkData) => {
        if (cancelled) return;
        setData(result);
        // The map only earns a "Show" breakdown when it actually helps sort
        // the photos (see isHelpful in lib/queries/network.ts). When none of
        // the remaining facets are helpful, nodes comes back empty and the
        // graph would otherwise render as just a lone center circle — go
        // straight to the grid instead. Checked here, off the fetch result
        // itself (not a separate effect keyed on `data`), so it can never
        // act on a stale result from the previous path.
        if (result.nodes.length === 0 && result.total > 0) {
          openGrid({ path }, mapBack);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      });

    return () => {
      cancelled = true;
    };
  }, [view, path, show]);

  useEffect(() => {
    if (view !== "timeline") return;
    let cancelled = false;
    setError(null);

    const params = new URLSearchParams({ start });
    if (yearParam) params.set("year", yearParam);

    fetch(`/api/timeline?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load the timeline");
        return res.json();
      })
      .then((result: { years?: YearTagSummary[]; months?: MonthTagSummary[] }) => {
        if (cancelled) return;
        if (result.months) {
          setTimelineMonths(result.months);
          setTimelineYears(null);
        } else {
          setTimelineYears(result.years ?? []);
          setTimelineMonths(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      });

    return () => {
      cancelled = true;
    };
  }, [view, start, yearParam]);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      setSearchResult(null);
      return;
    }
    let cancelled = false;

    fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json();
      })
      .then((result: SearchResult) => {
        if (!cancelled) setSearchResult(result);
      })
      .catch(() => {
        if (!cancelled) setSearchResult(null);
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedQuery]);

  const searchIdsParam = searchResult ? searchResult.photos.map((p) => p.id).join(",") : "";

  function selectNode(node: NetworkNode) {
    const nextSegments = [...segments, { kind: "value" as const, nodeType: node.type, value: node.value }];
    setParams({ path: segmentsToPath(nextSegments), show: null });
  }

  const crumbs = useMemo(() => {
    const items: { label: string; path: string | null }[] = [{ label: "All", path: null }];
    segments.forEach((segment, i) => {
      items.push({ label: segment.value, path: segmentsToPath(segments.slice(0, i + 1)) });
    });
    return items;
  }, [segments]);

  async function openGrid(opts: { path?: string; year?: number; month?: number }, onClose?: () => void) {
    setGridLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (opts.path) params.set("path", opts.path);
    if (opts.year !== undefined) params.set("year", String(opts.year));
    if (opts.month !== undefined) params.set("month", String(opts.month));

    try {
      const res = await fetch(`/api/feed?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load photos");
      const { photos: loaded } = (await res.json()) as { photos: PhotoWithTags[] };
      setGrid({
        photos: loaded,
        backHref: `/lore?${searchParams.toString()}`,
        onClose: onClose ?? (() => setGrid(null)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGridLoading(false);
    }
  }

  // One level up in the current path/period — used by the top-left back
  // button, and to back a dead-end map drill (see the effect below) out to
  // the level that had real choices instead of reopening the same dead end.
  function mapBack() {
    if (segments.length === 0) return;
    setGrid(null);
    const parent = segments.length > 1 ? segmentsToPath(segments.slice(0, -1)) : null;
    setParams({ path: parent, show: null });
  }

  function timelineBack() {
    if (!yearParam) return;
    setGrid(null);
    setParams({ year: null });
  }

  function clearFilters() {
    setQuery("");
    setParams({ path: null, show: null, year: null });
  }

  function saveFilter() {
    const label = window.prompt("Name this filter");
    if (!label || !label.trim()) return;
    const next: SavedFilter[] = [
      ...savedFilters,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: label.trim(),
        view,
        path,
        show: show ?? "",
        start,
        year: yearParam ?? "",
        query: trimmedQuery,
      },
    ];
    setSavedFilters(next);
    try {
      window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(next));
    } catch {
      // Ignore — the save just won't persist across visits.
    }
  }

  function applyFilter(sf: SavedFilter) {
    setQuery(sf.query);
    setSearchOpen(!!sf.query);
    setParams({ view: sf.view, path: sf.path || null, show: sf.show || null, start: sf.start, year: sf.year || null });
  }

  function deleteFilter(id: string) {
    const next = savedFilters.filter((sf) => sf.id !== id);
    setSavedFilters(next);
    try {
      window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(next));
    } catch {
      // Ignore.
    }
  }

  const centerLabel = data?.center ? data.center.label : "All";
  const centerCount = data?.center ? data.center.count : (data?.total ?? 0);
  const centerColor = data?.center ? MAP_TYPE_COLOR[data.center.type] : "var(--accent)";

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 pb-2 pr-16 pt-4 md:pr-4">
        <div className="flex flex-wrap items-end justify-center gap-5">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">View</p>
            <select
              value={view}
              onChange={(e) => setParams({ view: e.target.value, path: null, show: null, year: null })}
              className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-text"
            >
              {VIEW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {view === "timeline" && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Show</p>
              <ShowToggle
                options={TIMELINE_START_OPTIONS}
                value={start}
                onChange={(v) => setParams({ start: v })}
              />
            </div>
          )}

          {view === "map" && !trimmedQuery && candidateTypes.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Show</p>
              <ShowToggle
                options={candidateTypes.map((t) => ({ value: t, label: MAP_TYPE_LABEL[t], dot: MAP_TYPE_DOT[t] }))}
                value={data?.effectiveType ?? show}
                onChange={(v) => setParams({ show: v })}
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={clearFilters}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              Clear filters
            </button>
            <button
              onClick={saveFilter}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              Save filter
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted transition-colors hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>

        {savedFilters.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {savedFilters.map((sf) => (
              <span
                key={sf.id}
                className="flex items-center gap-1 rounded-full border border-border bg-surface-2 pl-2.5 pr-1 py-1 text-xs text-text"
              >
                <button onClick={() => applyFilter(sf)}>{sf.label}</button>
                <button
                  onClick={() => deleteFilter(sf.id)}
                  aria-label={`Delete ${sf.label}`}
                  className="px-1 text-text-muted hover:text-text"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {searchOpen && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Try fall mountain hike…"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted"
          />
        )}

        {!trimmedQuery && view === "map" && (
          <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
            {crumbs.map((crumb, i) => {
              const isCurrent = i === crumbs.length - 1;
              return (
                <span key={crumb.path ?? "root"} className="flex items-center gap-1">
                  {i > 0 && <span className="text-text-muted">/</span>}
                  <button
                    onClick={() => setParams({ path: crumb.path, show: null })}
                    disabled={isCurrent}
                    className={isCurrent ? "font-semibold text-text" : "text-text-muted hover:text-text"}
                  >
                    {crumb.label}
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {trimmedQuery && (
        <div className="flex flex-1 flex-col px-4 pb-4">
          {!searchResult && <p className="px-2 py-8 text-center text-sm text-text-muted">Searching…</p>}

          {searchResult && searchResult.total === 0 && (
            <p className="px-2 py-8 text-center text-sm text-text-muted">
              Nothing matches &ldquo;{trimmedQuery}&rdquo;.
            </p>
          )}

          {searchResult && searchResult.total > 0 && (
            <>
              {Object.entries(searchResult.facets).map(([type, values]) => (
                <div key={type} className="mb-2">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                    {FACET_LABELS[type as TagType]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {values!.map((v) => (
                      <a
                        key={v.value}
                        href={`/feed?ids=${encodeURIComponent(searchIdsParam)}&filter=${encodeURIComponent(`${type}:${v.value}`)}`}
                        className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text transition-colors hover:border-accent"
                      >
                        {v.value} <span className="text-text-muted">({v.count})</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {searchResult.photos.map((p) => (
                  <a
                    key={p.id}
                    href={`/feed?ids=${encodeURIComponent(searchIdsParam)}&start=${p.id}`}
                    className="relative block aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
                  >
                    {p.thumb_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoImageUrl(p, "thumb")} alt="" className="h-full w-full object-cover" />
                    )}
                  </a>
                ))}
              </div>

              <a
                href={`/feed?ids=${encodeURIComponent(searchIdsParam)}`}
                className="banner-gradient mx-0 mt-4 rounded-2xl px-4 py-4 text-center text-sm font-medium text-white shadow-lg"
              >
                View {searchResult.total} photo{searchResult.total === 1 ? "" : "s"}
              </a>
            </>
          )}
        </div>
      )}

      {!trimmedQuery && view === "map" && (
        <div className="relative flex flex-1 flex-col px-6 py-4">
          {segments.length > 0 && <BackButton onClick={mapBack} />}
          {error && <p className="flex-1 text-sm text-text-muted">{error}</p>}

          {!error && data && (
            <AnimatePresence mode="wait">
              <motion.div
                key={path}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.3 }}
                className="flex w-full flex-1 items-center justify-center"
              >
                <NodeGraph
                  centerLabel={centerLabel}
                  centerCount={centerCount}
                  centerColor={centerColor}
                  nodes={data.nodes}
                  onSelect={selectNode}
                  onViewImages={() => openGrid({ path })}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {!trimmedQuery && view === "timeline" && (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4 pt-2">
          {yearParam && <BackButton onClick={timelineBack} />}
          {error && <p className="px-2 py-12 text-center text-sm text-text-muted">{error}</p>}

          {!error && !yearParam && timelineYears && timelineYears.length === 0 && (
            <p className="px-2 py-12 text-center text-sm text-text-muted">No photos yet.</p>
          )}

          {!error && !yearParam && timelineYears && timelineYears.length > 0 && (
            <div className="flex flex-col">
              {timelineYears.map(({ year, count, tags, hasMore }) => (
                <div
                  key={year}
                  role="button"
                  tabIndex={0}
                  onClick={() => setParams({ year: String(year) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setParams({ year: String(year) });
                  }}
                  className="flex cursor-pointer flex-col gap-2 border-b border-border py-4 text-left"
                >
                  <div>
                    <span className="text-3xl font-semibold text-text">{year}</span>
                    <p className="text-xs text-text-muted">
                      {count} photo{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <button
                        key={t.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          openGrid({ path: `${start}:${t.value}`, year });
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text transition-colors hover:border-accent"
                      >
                        <span className={`h-2 w-2 rounded-full ${START_DOT[start]}`} />
                        {t.value}
                      </button>
                    ))}
                    {hasMore && (
                      <span className="flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
                        +
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() => openGrid({})}
                disabled={gridLoading}
                className="banner-gradient mt-4 rounded-2xl px-4 py-4 text-center text-sm font-medium text-white shadow-lg disabled:opacity-60"
              >
                View {timelineYears.reduce((sum, y) => sum + y.count, 0)} photos
              </button>
            </div>
          )}

          {!error && yearParam && timelineMonths && timelineMonths.length === 0 && (
            <p className="px-2 py-12 text-center text-sm text-text-muted">No photos in {yearParam}.</p>
          )}

          {!error && yearParam && timelineMonths && timelineMonths.length > 0 && (
            <div className="flex flex-col">
              {timelineMonths.map(({ month, name, count, tags, hasMore }) => (
                <div
                  key={month}
                  role="button"
                  tabIndex={gridLoading ? -1 : 0}
                  onClick={() => !gridLoading && openGrid({ year: Number(yearParam), month })}
                  onKeyDown={(e) => {
                    if (!gridLoading && (e.key === "Enter" || e.key === " ")) openGrid({ year: Number(yearParam), month });
                  }}
                  className={`flex flex-col gap-2 border-b border-border py-4 text-left ${
                    gridLoading ? "cursor-default opacity-60" : "cursor-pointer"
                  }`}
                >
                  <div>
                    <span className="text-lg font-medium text-text">{name}</span>
                    <span className="ml-2 text-xs text-text-muted">
                      {count} photo{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <button
                        key={t.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          openGrid({ path: `${start}:${t.value}`, year: Number(yearParam), month });
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text transition-colors hover:border-accent"
                      >
                        <span className={`h-2 w-2 rounded-full ${START_DOT[start]}`} />
                        {t.value}
                      </button>
                    ))}
                    {hasMore && (
                      <span className="flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
                        +
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() => openGrid({ year: Number(yearParam) })}
                disabled={gridLoading}
                className="banner-gradient mt-4 rounded-2xl px-4 py-4 text-center text-sm font-medium text-white shadow-lg disabled:opacity-60"
              >
                View {timelineMonths.reduce((sum, m) => sum + m.count, 0)} photos
              </button>
            </div>
          )}
        </div>
      )}

      {grid && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg md:left-20">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={() => grid.onClose()}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text-muted hover:text-text"
            >
              ×
            </button>
            <p className="text-sm font-medium text-text">
              {grid.photos.length} photo{grid.photos.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-4 md:grid-cols-6">
            {grid.photos.map((p) => (
              <a
                key={p.id}
                href={`/feed?ids=${encodeURIComponent(grid.photos.map((gp) => gp.id).join(","))}&start=${p.id}&back=${encodeURIComponent(grid.backHref)}`}
                className="relative block aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
              >
                {p.thumb_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoImageUrl(p, "thumb")} alt="" className="h-full w-full object-cover" />
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
