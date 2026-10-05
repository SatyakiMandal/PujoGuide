import {
  Bank,
  BeerStein,
  BowlFood,
  BowlSteam,
  Bread,
  Cake,
  Coffee,
  CookingPot,
  Cookie,
  Fire,
  Fish,
  FlowerLotus,
  ForkKnife,
  Hamburger,
  IceCream,
  Martini,
  Pizza,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import type { Cuisine, Place } from "./schema";

/** One glyph per cuisine, used on filter chips and as the basis for a food place's map icon. */
export const CUISINE_ICON: Record<Cuisine, Icon> = {
  bengali: Fish,
  mughlai: CookingPot,
  chinese: BowlSteam,
  asian: BowlSteam,
  continental: ForkKnife,
  italian: Pizza,
  north_indian: Bread,
  south_indian: BowlFood,
  biryani: CookingPot,
  bbq: Fire,
  rolls: Hamburger,
  mishti: Cookie,
  dessert: IceCream,
  street_food: BowlFood,
  coffee: Coffee,
  bakery: Cake,
};

/** Which cuisine wins when a restaurant has several. Specific beats generic. */
const RESTAURANT_ORDER: Cuisine[] = ["bbq", "italian", "chinese", "asian", "biryani", "mughlai", "bengali", "north_indian", "rolls", "continental"];

type Key =
  | "bari" | "pandal" | "coffee" | "cake" | "iceCream" | "cookie" | "pizza" | "burger" | "martini" | "stein"
  | "fire" | "bowlSteam" | "pot" | "fish" | "bread" | "bowl" | "fork";

const ICONS: Record<Key, Icon> = {
  bari: Bank, pandal: FlowerLotus, coffee: Coffee, cake: Cake, iceCream: IceCream, cookie: Cookie, pizza: Pizza,
  burger: Hamburger, martini: Martini, stein: BeerStein, fire: Fire, bowlSteam: BowlSteam, pot: CookingPot,
  fish: Fish, bread: Bread, bowl: BowlFood, fork: ForkKnife,
};

const CUISINE_KEY: Record<Cuisine, Key> = {
  bengali: "fish", mughlai: "pot", chinese: "bowlSteam", asian: "bowlSteam", continental: "fork", italian: "pizza",
  north_indian: "bread", south_indian: "bowl", biryani: "pot", bbq: "fire", rolls: "burger", mishti: "cookie", dessert: "iceCream",
  street_food: "bowl", coffee: "coffee", bakery: "cake",
};

/**
 * Which glyph a place gets on the map, in lists and in the detail view.
 * Colour is decided elsewhere (by group: heritage gold, pandal red, food teal); only the glyph varies.
 */
function iconKey(p: Place): Key {
  if (p.category === "bonedi_bari") return "bari";
  if (p.category === "pandal") return "pandal";

  const has = (c: Cuisine) => p.cuisines?.includes(c) ?? false;
  const isBar = p.vibes?.includes("bar") ?? false;

  if (p.category === "street_food") return has("rolls") ? "burger" : "bowl";
  if (p.category === "sweets") return has("mishti") ? "cookie" : "iceCream";
  // A bar that isn't mainly a cafe. Brewery / beer names get a stein instead of a cocktail.
  if (isBar && !has("coffee")) return /brew|beer|pub|taproom/i.test(p.name.en) ? "stein" : "martini";
  if (p.category === "cafe") return has("bakery") && !has("coffee") ? "cake" : "coffee";

  for (const c of RESTAURANT_ORDER) if (has(c)) return CUISINE_KEY[c];
  if (has("dessert")) return "iceCream";
  if (has("bakery")) return "cake";
  if (has("coffee")) return "coffee";
  return "fork";
}

/** A place's glyph. A component (not a function returning one) so it can be used freely in render. */
export function PlaceIcon({ place, size = 20, weight = "duotone" }: { place: Place; size?: number; weight?: IconWeight }) {
  const Glyph = ICONS[iconKey(place)];
  return <Glyph size={size} weight={weight} />;
}
