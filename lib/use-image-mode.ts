import { useEffect, useState } from "react";
import { loadImageMode, saveImageMode, type ImageFitMode } from "@/lib/image-mode";

/** The Fit/Zoom choice, remembered in this browser and shared by the feed and detail views. */
export function useImageMode(): [ImageFitMode, (mode: ImageFitMode) => void] {
  // Starts at the default so server and browser render the same, then loads the saved choice.
  const [mode, setMode] = useState<ImageFitMode>("fit");

  useEffect(() => {
    setMode(loadImageMode());
  }, []);

  function select(next: ImageFitMode) {
    setMode(next);
    saveImageMode(next);
  }

  return [mode, select];
}
