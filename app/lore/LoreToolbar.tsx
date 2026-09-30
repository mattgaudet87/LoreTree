import Link from "next/link";
import { useState } from "react";
import { useEscape } from "@/lib/use-escape";
import { MAP_TYPE_COLOR, MAP_TYPE_LABEL } from "@/lib/node-types";
import type { NetworkNodeType } from "@/lib/types";
import { VIEW_OPTIONS, type SetParams, type View } from "./lore-shared";
import type { SavedFilter } from "./use-saved-filters";

interface Crumb {
  label: string;
  path: string | null;
}

interface LoreToolbarProps {
  view: View;
  path: string;
  show: string | null;
  yearParam: string | null;
  // The map's type chips: the types not already used in the current path.
  candidateTypes: NetworkNodeType[];
  effectiveType: NetworkNodeType | null;
  crumbs: Crumb[];
  setParams: SetParams;
  onMapBack: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  savedFilters: SavedFilter[];
  onSaveFilter: (label: string) => void;
  onApplyFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
  onClearFilters: () => void;
}

const circleButton =
  "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-surface text-text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent";

const scrollRow = "flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** The Lore header: Map / Timeline titles, search and menu buttons, then the map's type chips and breadcrumbs. */
export default function LoreToolbar({
  view,
  path,
  show,
  yearParam,
  candidateTypes,
  effectiveType,
  crumbs,
  setParams,
  onMapBack,
  searchOpen,
  onToggleSearch,
  query,
  onQueryChange,
  savedFilters,
  onSaveFilter,
  onApplyFilter,
  onDeleteFilter,
  onClearFilters,
}: LoreToolbarProps) {
  const trimmedQuery = query.trim();
  const [menuOpen, setMenuOpen] = useState(false);
  // Naming a filter happens in a small box right here, not a browser pop-up.
  const [naming, setNaming] = useState(false);
  const [filterName, setFilterName] = useState("");
  const hasFilters = !!(path || yearParam || show || trimmedQuery);

  function saveNamedFilter() {
    const label = filterName.trim();
    if (!label) return;
    onSaveFilter(label);
    setNaming(false);
    setFilterName("");
  }

  function closeMenu() {
    setMenuOpen(false);
    setNaming(false);
  }
  useEscape(closeMenu, menuOpen);

  return (
    <div className="flex w-full flex-col px-4" style={{ paddingTop: "max(52px, calc(env(safe-area-inset-top) + 12px))" }}>
      <div className="flex items-center gap-4">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => view !== opt.value && setParams({ view: opt.value, path: null, show: null, year: null })}
            aria-pressed={view === opt.value}
            className={`rounded-lg text-[28px] font-bold tracking-[-0.02em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
              view === opt.value ? "text-text" : "text-text-inactive hover:text-text-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onToggleSearch} aria-label="Search" aria-pressed={searchOpen} className={circleButton}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="More" className={circleButton}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>
        </div>
      </div>

      {searchOpen && (
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoFocus
          placeholder="Try fall mountain hike…"
          className="mt-3.5 h-11 w-full rounded-full bg-surface px-4 text-sm text-text outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent"
        />
      )}

      {view === "map" && !trimmedQuery && candidateTypes.length > 0 && (
        <div className={`${scrollRow} mt-3.5`}>
          {candidateTypes.map((type) => {
            const active = (effectiveType ?? show) === type;
            return (
              <button
                key={type}
                onClick={() => setParams({ show: type })}
                aria-pressed={active}
                className={`flex h-[30px] shrink-0 items-center gap-[7px] rounded-full border px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  active ? "border-text bg-text text-bg" : "border-border text-text-muted hover:text-text"
                }`}
              >
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: MAP_TYPE_COLOR[type] }} />
                {MAP_TYPE_LABEL[type]}
              </button>
            );
          })}
        </div>
      )}

      {view === "map" && !trimmedQuery && crumbs.length > 1 && (
        <div className={`${scrollRow} mt-3 items-center`}>
          <button
            onClick={onMapBack}
            aria-label="Back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {crumbs.map((crumb, i) => {
            const isCurrent = i === crumbs.length - 1;
            return (
              <span key={crumb.path ?? "root"} className="flex shrink-0 items-center gap-2">
                {i > 0 && <span className="text-text-muted">›</span>}
                <button
                  onClick={() => setParams({ path: crumb.path, show: null })}
                  disabled={isCurrent}
                  className={`h-7 rounded-full px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isCurrent ? "bg-surface font-semibold text-text" : "bg-surface-2 text-text-muted hover:text-text"
                  }`}
                >
                  {crumb.label}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 md:items-center" onClick={closeMenu}>
          <div
            className="mb-28 w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-xl md:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 px-1 text-sm font-semibold text-text">Filters</p>
            <div className="flex flex-col gap-2">
              {naming ? (
                <div className="flex items-center gap-2">
                  <input
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveNamedFilter();
                      if (e.key === "Escape") setNaming(false);
                    }}
                    autoFocus
                    placeholder="Filter name"
                    className="h-10 min-w-0 flex-1 rounded-full border border-accent bg-surface-2 px-3.5 text-sm text-text placeholder:text-text-muted"
                  />
                  <button
                    onClick={() => {
                      saveNamedFilter();
                      closeMenu();
                    }}
                    disabled={!filterName.trim()}
                    className="h-10 rounded-full bg-accent px-4 text-sm font-medium text-bg disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setNaming(true)}
                  className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm font-medium text-text transition-colors hover:border-accent"
                >
                  Save filter
                </button>
              )}
              {hasFilters && (
                <button
                  onClick={() => {
                    onClearFilters();
                    closeMenu();
                  }}
                  className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm font-medium text-text transition-colors hover:border-accent"
                >
                  Clear filters
                </button>
              )}
            </div>

            {savedFilters.length > 0 && (
              <>
                <p className="mb-2 mt-4 px-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Saved filters</p>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.map((sf) => (
                    <span key={sf.id} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-xs text-text">
                      <button
                        onClick={() => {
                          onApplyFilter(sf);
                          closeMenu();
                        }}
                      >
                        {sf.label}
                      </button>
                      <button
                        onClick={() => onDeleteFilter(sf.id)}
                        aria-label={`Delete ${sf.label}`}
                        className="px-1 text-text-muted hover:text-text"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}

            <Link
              href="/settings"
              className="mt-4 block rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-medium text-text transition-colors hover:border-accent"
            >
              Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
