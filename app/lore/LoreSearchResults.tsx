import { photoImageUrl } from "@/lib/image-url";
import { valueSegment } from "@/lib/queries/filters";
import type { SearchResult } from "@/lib/queries/search";
import type { TagType } from "@/lib/types";

const FACET_LABELS: Record<TagType, string> = {
  person: "People",
  place: "Places",
  event: "Events",
  category: "Categories",
  keyword: "Details",
};

interface LoreSearchResultsProps {
  query: string;
  // null while a search is still loading.
  result: SearchResult | null;
  // True when the last search request failed (server down, error).
  failed: boolean;
  // Where the feed's back button returns to (this same search).
  backHref: string;
}

/** Search results: filter chips by tag type, a thumbnail grid, and a "View photos" button. */
export default function LoreSearchResults({ query, result, failed, backHref }: LoreSearchResultsProps) {
  const idsParam = result ? result.photos.map((p) => p.id).join(",") : "";
  const feedHref = (extra = "") => `/feed?ids=${encodeURIComponent(idsParam)}${extra}&back=${encodeURIComponent(backHref)}`;

  return (
    <div className="flex flex-1 flex-col px-4 pb-4">
      {!result && (
        <p className="px-2 py-8 text-center text-sm text-text-muted">
          {failed ? "Search failed. Check that LoreTree is running, then try again." : "Searching…"}
        </p>
      )}

      {result && result.total === 0 && (
        <p className="px-2 py-8 text-center text-sm text-text-muted">Nothing matches &ldquo;{query}&rdquo;.</p>
      )}

      {result && result.total > 0 && (
        <>
          {Object.entries(result.facets).map(([type, values]) => (
            <div key={type} className="mb-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                {FACET_LABELS[type as TagType]}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {values!.map((v) => (
                  <a
                    key={v.value}
                    href={feedHref(`&filter=${encodeURIComponent(valueSegment(type, v.value))}`)}
                    className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text transition-colors hover:border-accent"
                  >
                    {v.value} <span className="text-text-muted">({v.count})</span>
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {result.photos.map((p) => (
              <a
                key={p.id}
                href={feedHref(`&start=${p.id}`)}
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
            href={feedHref()}
            className="banner-gradient mx-0 mt-4 rounded-2xl px-4 py-4 text-center text-sm font-medium text-white shadow-lg"
          >
            {result.total > result.photos.length
              ? `View ${result.photos.length} of ${result.total.toLocaleString()} photos`
              : `View ${result.total} photo${result.total === 1 ? "" : "s"}`}
          </a>
        </>
      )}
    </div>
  );
}
