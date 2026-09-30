"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import type { TouchEvent as ReactTouchEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoCard from "@/components/PhotoCard";
import FeedTopBar from "@/components/FeedTopBar";
import PeopleRow from "@/components/PeopleRow";
import FeedActionRail from "@/components/FeedActionRail";
import type { PersonSummary } from "@/lib/queries/people";
import DetailPanel from "@/components/DetailPanel";
import type { PhotoWithTags } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";
import { decodeSegmentValue } from "@/lib/queries/filters";
import { useImageMode } from "@/lib/use-image-mode";

function filterLabel(filter: string | null, year: string | null, ids: string | null): string | null {
  if (filter) {
    return filter
      .split(",")
      .map((segment) => decodeSegmentValue(segment.split(":")[1] ?? segment))
      .filter(Boolean)
      .join(" > ");
  }
  if (year) return year;
  if (ids) return "Filtered photos";
  return null;
}

export default function FeedClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const year = searchParams.get("year");
  const start = searchParams.get("start");
  const ids = searchParams.get("ids");
  const back = searchParams.get("back");

  const [photos, setPhotos] = useState<PhotoWithTags[] | null>(null);
  const [index, setIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContextOpen, setDetailContextOpen] = useState(false);
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  // "fit" shows the whole photo, in its original orientation, letterboxed on
  // black. That's the default so nothing gets cropped unless Matt asks for it.
  const [imageMode, selectImageMode] = useImageMode();

  useEffect(() => {
    let cancelled = false;
    setPhotos(null);
    setError(null);
    setDetailOpen(false);

    const params = new URLSearchParams();
    if (filter) params.set("path", filter);
    if (year) params.set("year", year);
    if (ids) params.set("ids", ids);
    params.set("limit", "200");

    fetch(`/api/feed?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load photos");
        return res.json();
      })
      .then(({ photos: loaded }: { photos: PhotoWithTags[] }) => {
        if (cancelled) return;
        setPhotos(loaded);
        const startIndex = start ? loaded.findIndex((p) => p.id === start) : -1;
        setIndex(startIndex >= 0 ? startIndex : 0);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      });

    return () => {
      cancelled = true;
    };
  }, [filter, year, start, ids]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/people?limit=60")
      .then((res) => (res.ok ? res.json() : { people: [] }))
      .then(({ people: loaded }: { people: PersonSummary[] }) => {
        if (!cancelled) setPeople(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Preload the neighboring photos so next/previous feels instant.
  useEffect(() => {
    if (!photos) return;
    [index - 1, index + 1].forEach((i) => {
      const p = photos[i];
      if (p) {
        const img = new window.Image();
        img.src = photoImageUrl(p, "display");
      }
    });
  }, [photos, index]);

  const goNext = useCallback(() => {
    setIndex((i) => (photos && i < photos.length - 1 ? i + 1 : i));
  }, [photos]);
  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const cooldownRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  const withCooldown = useCallback((fn: () => void) => {
    if (cooldownRef.current) return;
    fn();
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 450);
  }, []);

  useEffect(() => {
    // Navigation stays live while the detail view is open — DetailPanel
    // stops propagation on its own scrollable text card, so scrolling the
    // caption/tags doesn't also flip photos; scrolling the image itself
    // still does.
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < 12) return;
      withCooldown(() => (e.deltaY > 0 ? goNext() : goPrev()));
    }
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") withCooldown(goNext);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") withCooldown(goPrev);
    }
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [goNext, goPrev, withCooldown]);

  function onTouchStart(e: ReactTouchEvent<HTMLDivElement>) {
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: ReactTouchEvent<HTMLDivElement>) {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (Math.abs(delta) < 40) return;
    withCooldown(() => (delta < 0 ? goNext() : goPrev()));
  }

  function goBack() {
    // searchParams has already decoded `back` once; decoding again would
    // mangle names that contain commas. Only in-app addresses are allowed.
    router.push(back && back.startsWith("/") && !back.startsWith("//") ? back : "/lore");
  }

  const label = filterLabel(filter, year, ids);
  const currentPhoto = photos?.[index] ?? null;

  function updatePhoto(updated: PhotoWithTags) {
    setPhotos((prev) => (prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev));
  }

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-surface"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <FeedTopBar
        year={currentPhoto?.year ?? null}
        filterLabel={label}
        onClearFilter={() => router.push("/feed")}
        onBack={back ? goBack : null}
      >
        <PeopleRow
          people={people.slice(0, 8)}
          activeNames={currentPhoto?.tags.filter((t) => t.type === "person").map((t) => t.name) ?? []}
        />
      </FeedTopBar>

      {!error && photos === null && (
        <div className="absolute inset-0 z-20">
          <LoadingScreen />
        </div>
      )}

      {error && (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-muted">
          {error}
        </div>
      )}

      {!error && photos && photos.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          {label ? (
            <p className="text-sm text-text-muted">No photos match this filter. Use the × at the top to clear it.</p>
          ) : (
            <>
              <p className="text-sm text-text-muted">No photos yet.</p>
              <Link href="/add-lore/photos" className="text-sm text-accent underline">
                Add photos from Apple Photos
              </Link>
            </>
          )}
        </div>
      )}

      {!error && currentPhoto && (
        <PhotoCard
          key={currentPhoto.id}
          photo={currentPhoto}
          index={index}
          total={photos!.length}
          fitMode={imageMode}
          people={people}
          onOpenDetail={() => {
            setDetailContextOpen(false);
            setDetailOpen(true);
          }}
        />
      )}

      {!error && currentPhoto && (
        <FeedActionRail
          photo={currentPhoto}
          imageMode={imageMode}
          onImageModeChange={selectImageMode}
          onPhotoChange={updatePhoto}
          onAddContext={() => {
            setDetailContextOpen(true);
            setDetailOpen(true);
          }}
        />
      )}

      {detailOpen && currentPhoto && (
        <DetailPanel
          photo={currentPhoto}
          onClose={() => setDetailOpen(false)}
          onPhotoChange={updatePhoto}
          initialContextOpen={detailContextOpen}
        />
      )}
    </div>
  );
}
