import { Suspense } from "react";
import NetworkClient from "./network-client";

export default function NetworkPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100dvh-5rem)] w-full" />}>
      <NetworkClient />
    </Suspense>
  );
}
