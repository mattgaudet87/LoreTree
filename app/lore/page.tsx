import { Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import LoreClient from "./lore-client";

export default function LorePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoreClient />
    </Suspense>
  );
}
