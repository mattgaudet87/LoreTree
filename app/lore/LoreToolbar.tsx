import { useState } from "react";
import { MAP_TYPE_DOT, MAP_TYPE_LABEL } from "@/lib/node-types";
import type { NetworkNodeType } from "@/lib/types";
import { ShowToggle } from "./lore-ui";
import { TIMELINE_START_OPTIONS, VIEW_OPTIONS, type SetParams, type StartType, type View } from "./lore-shared";
import type { SavedFilter } from "./use-saved-filters";

interface Crumb {
  label: string;
  path: string | null;
}

interface LoreToolbarProps {
  view: View;
  start: StartType;
  path: string;
  show: string | null;
  yearParam: string | null;
  // The map's "Show" options: the types not already used in the current path.
  candidateTypes: NetworkNodeType[];
  effectiveType: NetworkNodeType | null;
  crumbs: Crumb[];
  setParams: SetParams;
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

/** Everything above the Lore content: view switch, show toggle, filters, search box, breadcrumbs. */
export default function LoreToolbar({
  view,
  start,
  path,
  show,
  yearParam,
  candidateTypes,
  effectiveType,
  crumbs,
  setParams,
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
  // Naming a filter happens in a small box right here, not a browser pop-up.
  const [naming, setNaming] = useState(false);
  const [filterName, setFilterName] = useState("");

  function saveNamedFilter() {
    const label = filterName.trim();
    if (!label) return;
    onSaveFilter(label);
    setNaming(false);
    setFilterName("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 pb-2 pr-16 pt-4 md:pr-4">
      <div className="flex flex-wrap items-end justify-center gap-5">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">View</p>
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-1">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => view !== opt.value && setParams({ view: opt.value, path: null, show: null, year: null })}
                aria-pressed={view === opt.value}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === opt.value ? "bg-accent text-bg" : "text-text-muted hover:text-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {view === "timeline" && (
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Show</p>
            <ShowToggle options={TIMELINE_START_OPTIONS} value={start} onChange={(v) => setParams({ start: v })} />
          </div>
        )}

        {view === "map" && !trimmedQuery && candidateTypes.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Show</p>
            <ShowToggle
              options={candidateTypes.map((t) => ({ value: t, label: MAP_TYPE_LABEL[t], dot: MAP_TYPE_DOT[t] }))}
              value={effectiveType ?? show}
              onChange={(v) => setParams({ show: v })}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          {(path || yearParam || show || trimmedQuery) && (
            <button
              onClick={onClearFilters}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              Clear filters
            </button>
          )}
          {naming ? (
            <div className="flex items-center gap-1">
              <input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNamedFilter();
                  if (e.key === "Escape") setNaming(false);
                }}
                autoFocus
                placeholder="Filter name"
                className="w-28 rounded-full border border-accent bg-surface-2 px-2.5 py-1 text-xs text-text placeholder:text-text-muted"
              />
              <button
                onClick={saveNamedFilter}
                disabled={!filterName.trim()}
                className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-bg disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => setNaming(false)}
                aria-label="Cancel"
                className="px-1 text-xs text-text-muted hover:text-text"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setNaming(true)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              Save filter
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleSearch}
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
              <button onClick={() => onApplyFilter(sf)}>{sf.label}</button>
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
      )}

      {searchOpen && (
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
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
  );
}
