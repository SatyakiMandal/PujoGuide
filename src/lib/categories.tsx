import { BowlFood, Bank, Coffee, Cookie, FlowerLotus, ForkKnife, type Icon } from "@phosphor-icons/react";
import type { Category, Cuisine, Diet, Vibe } from "./schema";

/** Icons carry the category; colour only groups (heritage gold, pandal red, food teal). */
export const CATEGORY_META: Record<Category, { label: string; plural: string; icon: Icon; cssVar: string }> = {
  bonedi_bari: { label: "Bonedi Bari", plural: "Bonedi Baris", icon: Bank, cssVar: "--c-bari" },
  pandal: { label: "Pandal", plural: "Pandals", icon: FlowerLotus, cssVar: "--c-pandal" },
  cafe: { label: "Cafe", plural: "Cafes", icon: Coffee, cssVar: "--c-food" },
  restaurant: { label: "Restaurant", plural: "Restaurants", icon: ForkKnife, cssVar: "--c-food" },
  sweets: { label: "Sweets", plural: "Sweets", icon: Cookie, cssVar: "--c-food" },
  street_food: { label: "Street food", plural: "Street food", icon: BowlFood, cssVar: "--c-food" },
};

export const CUISINE_LABEL: Record<Cuisine, string> = {
  bengali: "Bengali",
  mughlai: "Mughlai",
  chinese: "Chinese",
  asian: "Asian",
  continental: "Continental",
  italian: "Italian",
  north_indian: "North Indian",
  biryani: "Biryani",
  bbq: "BBQ & grills",
  rolls: "Rolls",
  mishti: "Mishti",
  dessert: "Dessert",
  street_food: "Street food",
  coffee: "Coffee",
  bakery: "Bakery",
};

export const VIBE_LABEL: Record<Vibe, string> = {
  heritage: "Heritage",
  adda: "Adda",
  family: "Family",
  quick_bite: "Quick bite",
  aesthetic: "Aesthetic",
  rooftop: "Rooftop",
  bar: "Bar & pub",
  late_night: "Late night",
};

export const DIET_LABEL: Record<Diet, string> = { veg: "Veg", nonveg: "Non-veg" };
export const PRICE = (n: number) => "₹".repeat(n);
