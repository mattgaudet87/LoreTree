import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import Breadcrumb from "@/components/Breadcrumb";
import { getYearTimeline } from "@/lib/queries/timeline";
import { photoImageUrl } from "@/lib/image-url";

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const yearNum = Number(year);
  const data = Number.isInteger(yearNum) ? getYearTimeline(yearNum) : null;

  return (
    <FadeIn>
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-4">
        <div className="mb-6 pr-12">
          <Breadcrumb items={[{ label: "Lifetime", href: "/timeline" }, { label: year }]} />
        </div>

        {!data || data.months.length === 0 ? (
          <p className="px-2 py-12 text-center text-sm text-text-muted">No photos in {year}.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {data.months.map((month) => (
              <div key={month.month}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-lg font-medium text-text">{month.name}</h2>
                  <span className="text-xs text-text-muted">
                    {month.count} photo{month.count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {month.weeks.map((week) => (
                    <Link
                      key={week.week_start}
                      href={`/feed?year=${data.year}&week=${week.week_start}`}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-2"
                    >
                      <div className="h-10 w-10 flex-none overflow-hidden rounded-lg bg-surface-2">
                        {week.thumb_path && week.id && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoImageUrl({ id: week.id, image_version: week.image_version }, "thumb")}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="pr-1 text-left">
                        <p className="text-xs font-medium text-text">{week.label}</p>
                        <p className="text-[10px] text-text-muted">
                          {week.count} photo{week.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {data.hiddenEmptyMonths > 0 && (
              <p className="text-xs text-text-muted">
                {data.hiddenEmptyMonths} month{data.hiddenEmptyMonths === 1 ? "" : "s"} with no photos hidden
              </p>
            )}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
