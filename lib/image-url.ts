import type { PhotoWithTags } from "@/lib/types";

/**
 * Builds the URL for a photo's image file, including its version as a query
 * param when known. A photo's image_version changes whenever the importer
 * regenerates its files (e.g. an orientation fix), so this gives a brand
 * new URL a browser has never cached — far more reliable than hoping a
 * cache-control header gets revalidated or a hard refresh actually bypasses
 * the disk cache.
 */
export function photoImageUrl(photo: Pick<PhotoWithTags, "id" | "image_version">, size: "thumb" | "display"): string {
  const params = new URLSearchParams({ size });
  if (photo.image_version) params.set("v", photo.image_version);
  return `/api/images/${photo.id}?${params.toString()}`;
}
