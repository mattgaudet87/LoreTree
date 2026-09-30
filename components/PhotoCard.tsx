"use client";

import { useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent, MouseEvent as ReactMouseEvent } from "react";
import type { PhotoWithTags } from "@/lib/types";
import { photoImageUrl } from "@/lib/image-url";
import Link from "next/link";
import { captionTagsFor, joinNames, shortCaption } from "@/lib/caption";
import { valueSegment } from "@/lib/queries/filters";
import type { PersonSummary } from "@/lib/queries/people";
import { formatPhotoDate } from "@/lib/format";
import type { ImageFitMode } from "@/lib/image-mode";

export type { ImageFitMode };

interface PhotoCardProps {
  photo: PhotoWithTags;
  index: number;
  total: number;
  fitMode: ImageFitMode;
  onOpenDetail: () => void;
  // Cover photos for people, used for the little avatars above the caption.
  people: PersonSummary[];
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

export default function PhotoCard({ photo, index, total, fitMode, onOpenDetail, people }: PhotoCardProps) {
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

  const tags = captionTagsFor(photo.tags);
  const caption = shortCaption(tags);
  const peopleNames = tags.peopleNames;
  const heading = caption ?? photo.description;
  const showDescription = !!caption && !!photo.description && photo.description !== caption;
  const pills = (["place", "event", "category"] as const)
    .map((type) => ({ type, name: photo.tags.find((t) => t.type === type)?.name }))
    .filter((p): p is { type: "place" | "event" | "category"; name: string } => !!p.name);
  const pillDot = { place: "bg-node-places", event: "bg-node-events", category: "bg-node-categories" } as const;
  const thumbTop = total > 1 ? (index / (total - 1)) * (120 - 14) : 0;

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
        className={`absolute inset-0 h-full w-full motion-reduce:!transition-none ${fitMode === "fit" ? "object-contain" : "object-cover"}`}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: interacting ? "none" : "transform 150ms ease-out",
        }}
        draggable={false}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[190px]"
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,.7), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px]"
        style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,.88), rgba(0,0,0,.45) 55%, transparent)" }}
      />

      {/* Progress through the feed */}
      <div className="pointer-events-none absolute right-1 h-[120px] w-[3px] rounded-full bg-white/15" style={{ top: 260 }}>
        <div className="absolute left-0 h-3.5 w-[3px] rounded-full bg-text" style={{ top: thumbTop }} />
      </div>

      <div className="pointer-events-none absolute bottom-[100px] left-4 right-[72px] flex flex-col gap-2.5">
        {peopleNames.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="flex">
              {peopleNames.slice(0, 4).map((name, i) => {
                const person = people.find((p) => p.name === name);
                return person ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={name}
                    src={photoImageUrl({ id: person.coverId, image_version: person.coverVersion }, "thumb")}
                    alt=""
                    className={`h-7 w-7 rounded-full border-2 border-black object-cover ${i > 0 ? "-ml-2" : ""}`}
                    draggable={false}
                  />
                ) : (
                  <span
                    key={name}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-surface-2 text-[11px] font-semibold text-text ${i > 0 ? "-ml-2" : ""}`}
                  >
                    {name.charAt(0)}
                  </span>
                );
              })}
            </div>
            <span className="truncate text-sm font-semibold text-text">{joinNames(peopleNames)}</span>
          </div>
        )}

        {heading ? (
          <p className="font-serif text-xl leading-tight text-text">{heading}</p>
        ) : (
          <Link
            href="/settings"
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto text-sm text-text-soft underline"
          >
            No description yet — analyze it in Settings
          </Link>
        )}

        {showDescription && <p className="line-clamp-2 text-[13px] leading-snug text-white/80">{photo.description}</p>}

        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pills.map((pill) => (
              <Link
                key={pill.type}
                href={`/feed?filter=${encodeURIComponent(valueSegment(pill.type, pill.name))}`}
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto flex h-[26px] max-w-full items-center gap-1.5 rounded-full bg-glass px-2.5 text-xs text-text outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pillDot[pill.type]}`} />
                <span className="truncate">{pill.name}</span>
              </Link>
            ))}
          </div>
        )}

        <p className="text-xs text-text-muted">
          {formatPhotoDate(photo.taken_at)} · {index + 1} of {total}
        </p>
      </div>
    </div>
  );
}
