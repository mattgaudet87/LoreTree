"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent, MouseEvent as ReactMouseEvent } from "react";
import type { PhotoWithTags } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";
import { shortCaption } from "@/lib/caption";
import { formatPhotoDate } from "@/lib/format";
import type { ImageFitMode } from "@/lib/image-mode";

export type { ImageFitMode };

interface PhotoCardProps {
  photo: PhotoWithTags;
  index: number;
  total: number;
  fitMode: ImageFitMode;
  onOpenDetail: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touches: React.TouchList): number {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

type Gesture =
  | { mode: "pinch"; startDist: number; startScale: number }
  | { mode: "pan"; startX: number; startY: number; startTranslate: { x: number; y: number } };

export default function PhotoCard({ photo, index, total, fitMode, onOpenDetail }: PhotoCardProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [interacting, setInteracting] = useState(false);
  const gestureRef = useRef<Gesture | null>(null);
  const justInteractedRef = useRef(false);

  function resetZoom() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  function handleTouchStart(e: ReactTouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      e.stopPropagation();
      justInteractedRef.current = true;
      setInteracting(true);
      gestureRef.current = { mode: "pinch", startDist: touchDistance(e.touches), startScale: scale };
    } else if (e.touches.length === 1 && scale > 1.01) {
      e.stopPropagation();
      justInteractedRef.current = true;
      setInteracting(true);
      gestureRef.current = {
        mode: "pan",
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTranslate: translate,
      };
    }
  }

  function handleTouchMove(e: ReactTouchEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (gesture.mode === "pinch" && e.touches.length === 2) {
      e.stopPropagation();
      const nextScale = clamp((gesture.startScale * touchDistance(e.touches)) / gesture.startDist, MIN_SCALE, MAX_SCALE);
      setScale(nextScale);
    } else if (gesture.mode === "pan" && e.touches.length === 1) {
      e.stopPropagation();
      const maxOffset = (scale - 1) * 220;
      setTranslate({
        x: clamp(gesture.startTranslate.x + (e.touches[0].clientX - gesture.startX), -maxOffset, maxOffset),
        y: clamp(gesture.startTranslate.y + (e.touches[0].clientY - gesture.startY), -maxOffset, maxOffset),
      });
    }
  }

  function handleTouchEnd(e: ReactTouchEvent<HTMLDivElement>) {
    if (!gestureRef.current) return;
    e.stopPropagation();
    gestureRef.current = null;
    setInteracting(false);
    if (scale <= 1.01) resetZoom();
    setTimeout(() => {
      justInteractedRef.current = false;
    }, 250);
  }

  function handleClick(e: ReactMouseEvent<HTMLDivElement>) {
    if (justInteractedRef.current) {
      e.preventDefault();
      return;
    }
    onOpenDetail();
  }

  const eventName = photo.tags.find((t) => t.type === "event")?.name ?? null;
  const peopleNames = photo.tags.filter((t) => t.type === "person").map((t) => t.name);
  const caption = shortCaption({ eventName, placeName: photo.place_name, peopleNames });

  return (
    <div
      className="relative h-full w-full cursor-pointer bg-black"
      style={{ touchAction: "none" }}
      onClick={handleClick}
      onDoubleClick={resetZoom}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoImageUrl(photo, "display")}
        alt={photo.description ?? "Photo"}
        className={`absolute inset-0 h-full w-full ${fitMode === "fit" ? "object-contain" : "object-cover"}`}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: interacting ? "none" : "transform 150ms ease-out",
        }}
        draggable={false}
      />

      {photo.year && (
        <span className="pointer-events-none absolute right-4 top-16 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-medium text-text backdrop-blur">
          {photo.year}
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-6 pt-16 md:inset-x-auto md:inset-y-auto md:bottom-6 md:right-6 md:left-auto md:top-auto md:w-80 md:max-w-[calc(100%-3rem)] md:rounded-2xl md:border md:border-white/10 md:bg-none md:bg-black/60 md:p-4 md:pt-4 md:backdrop-blur-md md:shadow-2xl">
        {caption ? (
          <p className="text-sm text-text">{caption}</p>
        ) : photo.description ? (
          <p className="line-clamp-2 text-sm text-text">{photo.description}</p>
        ) : (
          <p className="pointer-events-auto text-sm text-text-muted">
            No description yet —{" "}
            <Link href="/settings" onClick={(e) => e.stopPropagation()} className="underline">
              analyze it in Settings
            </Link>
          </p>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
          <span>{formatPhotoDate(photo.taken_at)}</span>
          <span>
            {index + 1} of {total}
          </span>
        </div>
      </div>
    </div>
  );
}
