import { z } from "zod";

export const REGIONS = ["north", "central", "south", "saltlake"] as const;
export type Region = (typeof REGIONS)[number];

export const CATEGORIES = [
  "bonedi_bari",
  "pandal",
  "cafe",
  "restaurant",
  "sweets",
  "street_food",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const FOOD_CATEGORIES: Category[] = ["cafe", "restaurant", "sweets", "street_food"];
export const isFood = (c: Category) => FOOD_CATEGORIES.includes(c);

export const CUISINES = [
  "bengali",
  "mughlai",
  "chinese",
  "asian",
  "continental",
  "italian",
  "north_indian",
  "south_indian",
  "biryani",
  "bbq",
  "rolls",
  "mishti",
  "dessert",
  "street_food",
  "coffee",
  "bakery",
] as const;
export type Cuisine = (typeof CUISINES)[number];

export const VIBES = [
  "heritage",
  "classic",
  "fine_dining",
  "adda",
  "family",
  "quick_bite",
  "aesthetic",
  "rooftop",
  "bar",
  "late_night",
] as const;

/** Where a food place came from. "old" = the user's older list, where places may have closed; "curated" = picked as a best-of for Kolkata. */
export const SOURCES = ["seed", "new", "old", "curated"] as const;
export type Source = (typeof SOURCES)[number];
export type Vibe = (typeof VIBES)[number];

export const DIETS = ["veg", "nonveg"] as const;
export type Diet = (typeof DIETS)[number];

/**
 * area   = the neighbourhood anchor the pin is placed against.
 * zone   = the user-facing filter group (a place can belong to several).
 * `coordConfidence`:
 *   area     – placed near its neighbourhood centre, NOT the real spot
 *   osm      – matched by name on OpenStreetMap, near the expected neighbourhood
 *   verified – an exact pin: saved by the user in Google Maps, or confirmed in data/overrides.json
 */
export const CROWDS = ["low", "medium", "high", "extreme"] as const;
export type Crowd = (typeof CROWDS)[number];

export const OPENS_ON = ["mahalaya", "panchami", "shashthi", "saptami"] as const;
export type OpensOn = (typeof OPENS_ON)[number];

/** Short, practical notes shown in "Know before you go". Any field may be missing. */
export const tipsSchema = z.object({
  expect: z.string().optional(),
  good: z.string().optional(),
  watch: z.string().optional(),
  tip: z.string().optional(),
});
export type Tips = z.infer<typeof tipsSchema>;

/**
 * Weekly opening hours, Monday first (index 0) to Sunday (6). Each day is a list of
 * [open, close] windows in minutes from midnight (close may exceed 1440 when it runs past midnight),
 * or null when closed all day.
 */
export const hoursSchema = z.array(z.array(z.tuple([z.number(), z.number()])).nullable()).length(7);
export type Hours = z.infer<typeof hoursSchema>;

export const MENU_KINDS = ["food", "drink", "dessert"] as const;
export type MenuKind = (typeof MENU_KINDS)[number];

/** One dish or drink. `price` is rupees as last seen on a public listing, so treat it as a guide. */
export const menuItemSchema = z.object({
  name: z.string().min(2),
  diet: z.enum(["veg", "nonveg"]),
  kind: z.enum(MENU_KINDS),
  price: z.number().int().positive().max(20000).optional(),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

/** Must-try picks, split so a vegetarian or a drinks-only visit each get a clear answer. */
export const mustTrySchema = z.object({
  veg: z.array(z.string()),
  nonveg: z.array(z.string()),
  drinks: z.array(z.string()),
});
export type MustTry = z.infer<typeof mustTrySchema>;

export const placeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: z.enum(CATEGORIES),
  name: z.object({ en: z.string(), bn: z.string().optional() }),
  aliases: z.array(z.string()),
  zones: z.array(z.string()).min(1),
  region: z.enum(REGIONS),
  area: z.string(),
  lat: z.number(),
  lng: z.number(),
  coordConfidence: z.enum(["area", "osm", "verified"]),
  metro: z.array(z.string()),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  address: z.string().optional(),
  needsReview: z.boolean().optional(),
  // Pandal facts
  theme: z.string().optional(),
  artist: z.string().optional(),
  awards: z.array(z.string()).optional(),
  opensOn: z.enum(OPENS_ON).optional(),
  peakHours: z.string().optional(),
  pushpanjali: z.string().optional(),
  sourceNote: z.string().optional(),
  // food only
  cuisines: z.array(z.enum(CUISINES)).optional(),
  vibes: z.array(z.enum(VIBES)).optional(),
  priceLevel: z.number().int().min(1).max(4).optional(),
  diet: z.array(z.enum(DIETS)).optional(),
  openLate: z.boolean().optional(),
  /** Signature things to order / see. */
  dishes: z.array(z.string()).optional(),
  tips: tipsSchema.optional(),
  /** Typical crowd at peak Puja hours (baris and pandals). */
  crowd: z.enum(CROWDS).optional(),
  /** The web says it has closed. Hidden unless "show closed" is on. */
  closed: z.boolean().optional(),
  /** "researched" = backed by sources we found; "inferred" = guessed from the name. */
  info: z.enum(["researched", "inferred"]).optional(),
  source: z.enum(SOURCES).optional(),
  blurb: z.string().optional(),
  /** Weekly hours from a Google Maps snapshot (see data/snapshot.json). Absent = unknown, so typical hours are assumed. */
  hours: hoursSchema.optional(),
  /** Google rating at snapshot time, and how many reviews it rests on. */
  rating: z.number().min(1).max(5).optional(),
  ratingCount: z.number().int().nonnegative().optional(),
  /** A photo URL taken from the snapshot. May go stale; the UI hides it if it fails to load. */
  photo: z.string().url().optional(),
  /** ISO date the snapshot (hours, rating, photo, closed flag) was taken. */
  snapshotAt: z.string().optional(),
  /** Food only: a menu sample (not the full menu) with diet and, where seen, price. */
  menu: z.array(menuItemSchema).optional(),
  /** Hostnames the menu / status came from, e.g. "zomato.com". */
  menuSources: z.array(z.string()).optional(),
  mustTry: mustTrySchema.optional(),
  /** Every item the place serves is vegetarian. */
  pureVeg: z.boolean().optional(),
  /** ISO date someone last confirmed this place is operating. */
  checkedAt: z.string().optional(),
});
export type Place = z.infer<typeof placeSchema>;

export const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.enum(REGIONS),
});
export type Zone = z.infer<typeof zoneSchema>;

export const KOLKATA_BOUNDS = { south: 22.4, north: 22.75, west: 88.2, east: 88.52 };
