import { Suspense } from "react";
import FeedClient from "./feed-client";

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100dvh-5rem)] w-full bg-surface" />}>
      <FeedClient />
    </Suspense>
  );
}
