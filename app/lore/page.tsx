import { Suspense } from "react";
import LoreClient from "./lore-client";

export default function LorePage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100dvh-5rem)] w-full" />}>
      <LoreClient />
    </Suspense>
  );
}
