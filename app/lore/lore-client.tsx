"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import NodeGraph from "@/components/NodeGraph";
import { parsePath, type PathSegment } from "@/lib/queries/filters";
import type { NetworkNode } from "@/lib/queries/network";
import type { PhotoWithTags } from "@/lib/types";
import { MAP_TYPES, MAP_TYPE_COLOR } from "@/lib/node-types";
import type { YearTagSummary, MonthTagSummary } from "@/lib/queries/timeline";
import type { SearchResult } from "@/lib/queries/search";
import LorePhotoGrid from "./LorePhotoGrid";
import LoreSearchResults from "./LoreSearchResults";
import LoreTimeline from "./LoreTimeline";
import LoreToolbar from "./LoreToolbar";
import { BackButton } from "./lore-ui";
import {
  GRID_LIMIT,
  TIMELINE_START_OPTIONS,
  VIEW_OPTIONS,
  segmentsToPath,
  type GridState,
  type NetworkData,
  type SetParams,
  type StartType,
  type View,
} from "./lore-shared";
import { useSavedFilters, type SavedFilter } from "./use-saved-filters";

// Search runs once typing pauses, not on every keystroke, since each search
// scans the whole library on the server.
const SEARCH_DELAY_MS = 300;

export default function LoreClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Unknown values in the address (e.g. ?view=foo) fall back to the defaults instead of a blank page.
  const viewParam = searchParams.get("view");
  const view: View = VIEW_OPTIONS.some((o) => o.value === viewParam) ? (viewParam as View) : "map";
  const startParam = searchParams.get("start");
  const start: StartType = TIMELINE_START_OPTIONS.some((o) => o.value === startParam)
    ? (startParam as StartType)
    : "person";
  const path = searchParams.get("path") ?? "";
  const show = searchParams.get("show");
  const yearParam = searchParams.get("year");
  // The search box state lives in the address (search=1, q=...) so the Search
  // tab can light up and the feed's back button returns to the same search.
  const searchOpen = searchParams.get("search") === "1";

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [data, setData] = useState<NetworkData | null>(null);
  const [timelineYears, setTimelineYears] = useState<YearTagSummary[] | null>(null);
  const [timelineMonths, setTimelineMonths] = useState<MonthTagSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<GridState | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();

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

  const setParams: SetParams = useCallback(
    (updates) => {
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

  // Bumped after a bulk tag so the Map counts / Timeline chips behind the
  // grid reload and show the new tags.
  const [dataVersion, setDataVersion] = useState(0);

  // The map effect below needs the latest openGrid/mapBack without re-running
  // every time they're re-created, so it reads them through refs.
  const openGridRef = useRef(openGrid);
  const mapBackRef = useRef(mapBack);
  const gridOpenRef = useRef(false);
  openGridRef.current = openGrid;
  mapBackRef.current = mapBack;
  gridOpenRef.current = grid !== null;

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
        if (result.nodes.length === 0 && result.total > 0 && !gridOpenRef.current) {
          openGridRef.current({ path }, () => mapBackRef.current());
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      });

    return () => {
      cancelled = true;
    };
  }, [view, path, show, dataVersion]);

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
  }, [view, start, yearParam, dataVersion]);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      setSearchResult(null);
      setSearchFailed(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(runSearch, SEARCH_DELAY_MS);

    function runSearch() {
      // Keep the query in the address (replacing, not adding history steps)
      // so coming back from the feed restores this search.
      const next = new URLSearchParams(window.location.search);
      if (next.get("q") !== trimmedQuery) {
        next.set("q", trimmedQuery);
        router.replace(`/lore?${next.toString()}`, { scroll: false });
      }

      fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Search failed");
          return res.json();
        })
        .then((result: SearchResult) => {
          if (!cancelled) {
            setSearchResult(result);
            setSearchFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResult(null);
            setSearchFailed(true);
          }
        });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, router]);

  function changeQuery(next: string) {
    setQuery(next);
    // Emptying the box by typing drops the old query from the address, so
    // coming back doesn't bring it back. (Buttons that clear it do this themselves.)
    if (!next.trim() && searchParams.has("q")) setParams({ q: null });
  }

  function toggleSearch() {
    // Closing the box also clears the search, so its results don't linger behind a hidden box.
    if (searchOpen) setQuery("");
    setParams({ search: searchOpen ? null : "1", q: null });
  }

  // Where the feed's back button should return to from a search result.
  const searchBackHref = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("search", "1");
    next.set("q", trimmedQuery);
    return `/lore?${next.toString()}`;
  }, [searchParams, trimmedQuery]);

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
    const params = new URLSearchParams({ limit: String(GRID_LIMIT) });
    if (opts.path) params.set("path", opts.path);
    if (opts.year !== undefined) params.set("year", String(opts.year));
    if (opts.month !== undefined) params.set("month", String(opts.month));

    try {
      const res = await fetch(`/api/feed?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load photos");
      const { photos: loaded, total } = (await res.json()) as { photos: PhotoWithTags[]; total: number };
      setGrid({
        id: Date.now(),
        photos: loaded,
        total,
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
  // button, and to back a dead-end map drill (see the effect above) out to
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
    setParams({ path: null, show: null, year: null, q: null });
  }

  function applyFilter(sf: SavedFilter) {
    setQuery(sf.query);
    setParams({
      view: sf.view,
      path: sf.path || null,
      show: sf.show || null,
      start: sf.start,
      year: sf.year || null,
      search: sf.query ? "1" : null,
      q: sf.query || null,
    });
  }

  const centerLabel = data?.center ? data.center.label : "All";
  const centerCount = data?.center ? data.center.count : (data?.total ?? 0);
  const centerColor = data?.center ? MAP_TYPE_COLOR[data.center.type] : "var(--accent)";

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      <LoreToolbar
        view={view}
        start={start}
        path={path}
        show={show}
        yearParam={yearParam}
        candidateTypes={candidateTypes}
        effectiveType={data?.effectiveType ?? null}
        crumbs={crumbs}
        setParams={setParams}
        searchOpen={searchOpen}
        onToggleSearch={toggleSearch}
        query={query}
        onQueryChange={changeQuery}
        savedFilters={savedFilters}
        onSaveFilter={(label) =>
          saveFilter({ view, path, show: show ?? "", start, year: yearParam ?? "", query: trimmedQuery }, label)
        }
        onApplyFilter={applyFilter}
        onDeleteFilter={deleteFilter}
        onClearFilters={clearFilters}
      />

      {trimmedQuery && <LoreSearchResults query={trimmedQuery} result={searchResult} failed={searchFailed} backHref={searchBackHref} />}

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
        <LoreTimeline
          start={start}
          yearParam={yearParam}
          years={timelineYears}
          months={timelineMonths}
          error={error}
          gridLoading={gridLoading}
          openGrid={openGrid}
          setParams={setParams}
          onBack={timelineBack}
        />
      )}

      {grid && <LorePhotoGrid key={grid.id} grid={grid} onTagged={() => setDataVersion((v) => v + 1)} />}
    </div>
  );
}
