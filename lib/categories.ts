export const CATEGORIES = [
  "Family",
  "Friends",
  "Travel",
  "Outdoors",
  "Nature",
  "Food",
  "Work",
  "Music",
  "Home",
  "Pets",
  "Celebrations",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

// Maps common Apple Photos scene / object labels (lowercase) to LoreTree's
// fixed category list. Anything not found here falls back to "Other".
const APPLE_LABEL_TO_CATEGORY: Record<string, Category> = {
  dog: "Pets",
  cat: "Pets",
  pet: "Pets",
  bird: "Pets",

  beach: "Travel",
  airport: "Travel",
  hotel: "Travel",
  landmark: "Travel",
  city: "Travel",
  skyline: "Travel",

  mountain: "Outdoors",
  hiking: "Outdoors",
  trail: "Outdoors",
  camping: "Outdoors",
  snow: "Outdoors",
  ski: "Outdoors",
  lake: "Outdoors",
  river: "Outdoors",
  bike: "Outdoors",
  cycling: "Outdoors",

  flower: "Nature",
  plant: "Nature",
  tree: "Nature",
  garden: "Nature",
  sunset: "Nature",
  sunrise: "Nature",
  sky: "Nature",
  landscape: "Nature",

  food: "Food",
  meal: "Food",
  restaurant: "Food",
  drink: "Food",
  coffee: "Food",
  dessert: "Food",
  cooking: "Food",

  office: "Work",
  meeting: "Work",
  computer: "Work",
  desk: "Work",
  conference: "Work",

  concert: "Music",
  guitar: "Music",
  piano: "Music",
  band: "Music",

  house: "Home",
  room: "Home",
  kitchen: "Home",
  furniture: "Home",
  bedroom: "Home",

  birthday: "Celebrations",
  wedding: "Celebrations",
  party: "Celebrations",
  holiday: "Celebrations",
  graduation: "Celebrations",
  christmas: "Celebrations",

  family: "Family",
  baby: "Family",
  kids: "Family",
  children: "Family",

  friends: "Friends",
  group: "Friends",
};

export function categoryForAppleLabel(label: string): Category {
  return APPLE_LABEL_TO_CATEGORY[label.trim().toLowerCase()] ?? "Other";
}
