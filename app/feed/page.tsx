import { Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import FeedClient from "./feed-client";

export default function FeedPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <FeedClient />
    </Suspense>
  );
}
