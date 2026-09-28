export type TagType = "person" | "category" | "place" | "event" | "keyword";

export type NetworkNodeType = "person" | "category" | "place" | "event" | "year";

export type TagSource = "apple" | "ai" | "user";

export interface Tag {
  id: number;
  name: string;
  type: TagType;
  source: TagSource;
}

export interface PhotoRow {
  id: string;
  user_id: string;
  taken_at: string | null;
  year: number | null;
  month: number | null;
  week_start: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  is_favorite: number;
  apple_score: number | null;
  is_profile: number;
  description: string | null;
  ai_status: "none" | "done" | "error";
  ai_error: string | null;
  analyzed_at: string | null;
  display_path: string | null;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  imported_at: string;
  images_updated_at: string | null;
}

export interface PhotoSummary {
  id: string;
  taken_at: string | null;
  year: number | null;
  is_favorite: boolean;
  description: string | null;
  thumb_path: string | null;
  display_path: string | null;
  // Changes whenever the importer regenerates this photo's image files (e.g.
  // an orientation fix). Append as a query param on image URLs so browsers
  // fetch fresh bytes instead of serving an old cached copy from the same
  // /api/images/{id} address.
  image_version: string | null;
}

export interface PhotoWithTags extends PhotoSummary {
  place_name: string | null;
  ai_status: PhotoRow["ai_status"];
  is_profile: boolean;
  tags: Tag[];
}
