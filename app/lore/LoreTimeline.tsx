import { valueSegment } from "@/lib/queries/filters";
import type { MonthTagSummary, YearTagSummary } from "@/lib/queries/timeline";
import { BackButton } from "./lore-ui";
import { START_DOT, viewPhotosLabel, type OpenGrid, type SetParams, type StartType } from "./lore-shared";

// The small tag chips under each year or month; tapping one opens the grid for that tag in that period.
function TagChips({
  tags,
  hasMore,
  year,
  month,
  start,
  openGrid,
}: {
  tags: { value: string }[];
  hasMore: boolean;
  year: number;
  month?: number;
  start: StartType;
  openGrid: OpenGrid;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <button
          key={t.value}
          onClick={(e) => {
            e.stopPropagation();
            openGrid({ path: valueSegment(start, t.value), year, ...(month !== undefined ? { month } : {}) });
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
  );
}

interface LoreTimelineProps {
  start: StartType;
  yearParam: string | null;
  years: YearTagSummary[] | null;
  months: MonthTagSummary[] | null;
  error: string | null;
  gridLoading: boolean;
  openGrid: OpenGrid;
  setParams: SetParams;
  onBack: () => void;
}

/** The lifetime timeline: a list of years, or the months inside one year. */
export default function LoreTimeline({
  start,
  yearParam,
  years,
  months,
  error,
  gridLoading,
  openGrid,
  setParams,
  onBack,
}: LoreTimelineProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4 pt-2">
      {yearParam && <BackButton onClick={onBack} />}
      {error && <p className="px-2 py-12 text-center text-sm text-text-muted">{error}</p>}

      {!error && !yearParam && years && years.length === 0 && (
        <p className="px-2 py-12 text-center text-sm text-text-muted">No photos yet.</p>
      )}

      {!error && !yearParam && years && years.length > 0 && (
        <div className="flex flex-col">
          {years.map(({ year, count, tags, hasMore }) => (
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
              <TagChips tags={tags} hasMore={hasMore} year={year} start={start} openGrid={openGrid} />
            </div>
          ))}

          <button
            onClick={() => openGrid({})}
            disabled={gridLoading}
            className="banner-gradient mt-4 rounded-2xl px-4 py-4 text-center text-sm font-medium text-white shadow-lg disabled:opacity-60"
          >
            {viewPhotosLabel(years.reduce((sum, y) => sum + y.count, 0))}
          </button>
        </div>
      )}

      {!error && yearParam && months && months.length === 0 && (
        <p className="px-2 py-12 text-center text-sm text-text-muted">No photos in {yearParam}.</p>
      )}

      {!error && yearParam && months && months.length > 0 && (
        <div className="flex flex-col">
          {months.map(({ month, name, count, tags, hasMore }) => (
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
              <TagChips tags={tags} hasMore={hasMore} year={Number(yearParam)} month={month} start={start} openGrid={openGrid} />
            </div>
          ))}

          <button
            onClick={() => openGrid({ year: Number(yearParam) })}
            disabled={gridLoading}
            className="banner-gradient mt-4 rounded-2xl px-4 py-4 text-center text-sm font-medium text-white shadow-lg disabled:opacity-60"
          >
            {viewPhotosLabel(months.reduce((sum, m) => sum + m.count, 0))}
          </button>
        </div>
      )}
    </div>
  );
}
