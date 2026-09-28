import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import Breadcrumb from "@/components/Breadcrumb";
import { getLifetimeTimeline } from "@/lib/queries/timeline";
import { photoImageUrl } from "@/lib/image-url";

export default function TimelinePage() {
  const years = getLifetimeTimeline();

  return (
    <FadeIn>
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-4">
        <div className="mb-4 pr-12">
          <Breadcrumb items={[{ label: "Lifetime" }]} />
        </div>

        {years.length === 0 ? (
          <p className="px-2 py-12 text-center text-sm text-text-muted">No photos yet.</p>
        ) : (
          <div className="flex flex-col">
            {years.map(({ year, count, highlights }) => (
              <div key={year} className="flex items-center justify-between gap-4 border-b border-border py-4">
                <Link href={`/timeline/${year}`} className="block">
                  <span className="text-3xl font-semibold text-text">{year}</span>
                  <p className="text-xs text-text-muted">
                    {count} photo{count === 1 ? "" : "s"}
                  </p>
                </Link>
                <div className="flex gap-2">
                  {highlights.map((h) => (
                    <Link
                      key={h.id}
                      href={`/feed?year=${year}&start=${h.id}`}
                      className="relative block h-14 w-14 overflow-hidden rounded-lg border border-border bg-surface-2"
                    >
                      {h.thumb_path && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoImageUrl(h, "thumb")} alt="" className="h-full w-full object-cover" />
                      )}
                      {h.is_favorite && (
                        <span className="absolute right-1 top-1 text-xs leading-none text-node-events">♥</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
