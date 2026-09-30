import { useEffect, useRef } from "react";
import { photoImageUrl } from "@/lib/image-url";
import type { TimelineMonth, TimelineYear } from "@/lib/queries/timeline";
import { START_DOT, type OpenGrid, type SetParams, type StartType } from "./lore-shared";

interface LoreTimelineProps {
  start: StartType;
  // Null while loading.
  years: TimelineYear[] | null;
  selectedYear: number | null;
  months: TimelineMonth[] | null;
  error: string | null;
  gridLoading: boolean;
  openGrid: OpenGrid;
  setParams: SetParams;
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** The lifetime timeline: a row of year buttons, then that year's twelve months as photo tiles. */
export default function LoreTimeline({
  start,
  years,
  selectedYear,
  months,
  error,
  gridLoading,
  openGrid,
  setParams,
}: LoreTimelineProps) {
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Keep the chosen year in view when there are more years than fit across.
  useEffect(() => {
    const row = scrubberRef.current;
    const selected = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !selected) return;
    row.scrollTo({ left: selected.offsetLeft - (row.clientWidth - selected.offsetWidth) / 2, behavior: "smooth" });
  }, [selectedYear, years]);

  if (error) return <p className="px-6 py-12 text-center text-sm text-text-muted">{error}</p>;
  if (!years) return <p className="px-6 py-12 text-center text-sm text-text-muted">Loading…</p>;
  if (years.length === 0) return <p className="px-6 py-12 text-center text-sm text-text-muted">No photos yet.</p>;

  const current = years.find((y) => y.year === selectedYear) ?? years[0];

  return (
    <div className="px-4 pt-4">
      <div
        ref={scrubberRef}
        className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {years.map(({ year, count }) => {
          const active = year === current.year;
          return (
            <button
              key={year}
              onClick={() => setParams({ year: String(year) })}
              aria-pressed={active}
              className={`min-w-[72px] flex-1 rounded-[14px] py-2.5 text-center transition-colors ${focusRing} ${
                active ? "bg-text text-bg" : "bg-surface text-text"
              }`}
            >
              <span className="block text-base font-bold leading-tight">{year}</span>
              <span className="block text-[11px] leading-tight opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-text">
            {current.year} · {current.count.toLocaleString()} photo{current.count === 1 ? "" : "s"}
          </p>
          {current.topTags.length > 0 && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${START_DOT[start]}`} />
              <span className="truncate">{current.topTags.join(" · ")}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => openGrid({ year: current.year })}
          disabled={gridLoading}
          className={`banner-gradient h-[34px] shrink-0 rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60 ${focusRing}`}
        >
          View all
        </button>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {(months ?? []).map(({ month, name, count, coverId, coverVersion }) => {
          const empty = count === 0;
          return (
            <button
              key={month}
              onClick={() => openGrid({ year: current.year, month })}
              disabled={empty || gridLoading}
              aria-label={`${name}, ${count} photo${count === 1 ? "" : "s"}`}
              className={`relative aspect-square overflow-hidden rounded-2xl bg-surface text-left ${focusRing} ${
                empty ? "opacity-35" : gridLoading ? "opacity-60" : ""
              }`}
            >
              {coverId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoImageUrl({ id: coverId, image_version: coverVersion }, "thumb")}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />
              )}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[40%]"
                style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,.65), transparent)" }}
              />
              <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/45 px-1.5 text-[11px] font-semibold text-white">
                {count}
              </span>
              <span className="absolute bottom-2 left-2.5 text-[13px] font-semibold text-white">{name}</span>
            </button>
          );
        })}
      </div>

      {/* Fades the tiles out under the floating nav. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[110px]"
        style={{ backgroundImage: "linear-gradient(to top, var(--bg), transparent)" }}
      />
    </div>
  );
}
