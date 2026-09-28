"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoCard, { type ImageFitMode } from "@/components/PhotoCard";
import DetailPanel from "@/components/DetailPanel";
import type { PhotoWithTags } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";
import { formatWeekLabel } from "@/lib/queries/date-utils";

type Mode = "random" | "event" | "person" | "year";

const MODES: Mode[] = ["random", "event", "person", "year"];
const IMAGE_MODE_KEY = "loretree:feed-image-mode";

function filterLabel(filter: string | null, year: string | null, week: string | null): string | null {
  if (filter) {
    return filter
      .split(",")
      .map((segment) => segment.split(":")[1] ?? segment)
      .filter(Boolean)
      .join(" > ");
  }
  if (year && week) return `${year} > ${formatWeekLabel(week)}`;
  if (year) return year;
  if (week) return formatWeekLabel(week);
  return null;
}

export default function FeedClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const year = searchParams.get("year");
  const week = searchParams.get("week");
  const start = searchParams.get("start");

  const [photos, setPhotos] = useState<PhotoWithTags[] | null>(null);
  const [index, setIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "fit" shows the whole photo, in its original orientation, letterboxed on
  // black. That's the default so nothing gets cropped unless Matt asks for it.
  const [imageMode, setImageMode] = useState<ImageFitMode>("fit");

  const hasFilter = Boolean(filter || year || week);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(IMAGE_MODE_KEY);
      if (stored === "fit" || stored === "zoom") setImageMode(stored);
    } catch {
      // Private browsing or blocked storage: fall back to the default silently.
    }
  }, []);

  function selectImageMode(mode: ImageFitMode) {
    setImageMode(mode);
    try {
      window.localStorage.setItem(IMAGE_MODE_KEY, mode);
    } catch {
      // Ignore — the choice just won't persist across visits.
    }
  }

  useEffect(() => {
    let cancelled = false;
    setPhotos(null);
    setError(null);
    setDetailOpen(false);

    const params = new URLSearchParams();
    if (filter) params.set("path", filter);
    if (year) params.set("year", year);
    if (week) params.set("week", week);
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
  }, [filter, year, week, start]);

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
    function onWheel(e: WheelEvent) {
      if (detailOpen) return;
      if (Math.abs(e.deltaY) < 12) return;
      withCooldown(() => (e.deltaY > 0 ? goNext() : goPrev()));
    }
    function onKey(e: KeyboardEvent) {
      if (detailOpen) return;
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowDown") withCooldown(goNext);
      if (e.key === "ArrowUp") withCooldown(goPrev);
    }
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [detailOpen, goNext, goPrev, withCooldown]);

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

  function selectMode(mode: Mode) {
    if (mode === "random") {
      router.push("/feed");
    } else {
      router.push(`/network?path=group:${mode}`);
    }
  }

  const label = filterLabel(filter, year, week);
  const currentPhoto = photos?.[index] ?? null;

  function updatePhoto(updated: PhotoWithTags) {
    setPhotos((prev) => (prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev));
  }

  return (
    <div
      className="relative h-[calc(100dvh-5rem)] w-full overflow-hidden bg-surface"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute left-4 top-4 z-10 flex overflow-hidden rounded-full border border-border bg-surface/80 text-xs backdrop-blur">
        {(["fit", "zoom"] as ImageFitMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => selectImageMode(mode)}
            aria-pressed={imageMode === mode}
            className={`px-3 py-1.5 font-medium capitalize transition-colors ${
              imageMode === mode ? "bg-accent text-bg" : "text-text-muted"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 px-4 pt-4">
        <div className="pointer-events-auto flex justify-center gap-2">
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => selectMode(mode)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                mode === "random" && !hasFilter
                  ? "bg-accent text-bg"
                  : "border border-border bg-surface/80 text-text-muted backdrop-blur"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {label && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-text-muted backdrop-blur">
            <span>{label}</span>
            <button
              onClick={() => router.push("/feed")}
              aria-label="Clear filter"
              className="text-text-muted hover:text-text"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-muted">
          {error}
        </div>
      )}

      {!error && photos && photos.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm text-text-muted">No photos here yet.</p>
        </div>
      )}

      {!error && currentPhoto && (
        <PhotoCard
          key={currentPhoto.id}
          photo={currentPhoto}
          index={index}
          total={photos!.length}
          fitMode={imageMode}
          onOpenDetail={() => setDetailOpen(true)}
        />
      )}

      {detailOpen && currentPhoto && (
        <DetailPanel photo={currentPhoto} onClose={() => setDetailOpen(false)} onPhotoChange={updatePhoto} />
      )}
    </div>
  );
}
