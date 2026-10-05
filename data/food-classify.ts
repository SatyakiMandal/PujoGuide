/**
 * Turns a place name (+ the Google place type, when we have one) into category / cuisines / vibes.
 * These are SUGGESTIONS inferred from the name: good enough to make the filters useful, not facts.
 * Correct any of them in data/food-overrides.json (slug -> fields) and re-run `npm run food`.
 */
import type { Category, Cuisine, Diet, Vibe } from "../src/lib/schema";

export type Tags = {
  category: Category;
  cuisines: Cuisine[];
  vibes: Vibe[];
  diet?: Diet[];
  openLate?: boolean;
};

/** Google's own type labels (shown in the new list) -> tags. */
const TYPE_TAGS: Record<string, Partial<Tags>> = {
  Cafe: { category: "cafe", cuisines: ["coffee"] },
  "Coffee shop": { category: "cafe", cuisines: ["coffee"] },
  Bar: { vibes: ["bar", "late_night"], openLate: true },
  Pub: { vibes: ["bar", "late_night"], openLate: true },
  "Italian restaurant": { cuisines: ["italian"] },
  "Chinese restaurant": { cuisines: ["chinese"] },
  "Momo restaurant": { cuisines: ["chinese"], vibes: ["quick_bite"] },
  "Vegetarian restaurant": { diet: ["veg"] },
  "Dessert restaurant": { category: "sweets", cuisines: ["dessert"] },
  "Dessert shop": { category: "sweets", cuisines: ["dessert"] },
  "4-star hotel": { vibes: ["heritage"] },
  "Cultural landmark": { category: "cafe", cuisines: ["bengali"], vibes: ["adda"] },
  Bistro: { cuisines: ["continental"] },
  "Eclectic restaurant": { cuisines: ["continental"] },
};

type Rule = { re: RegExp; tags: Partial<Tags> };

/** Applied in order; every matching rule contributes (cuisines/vibes are unioned). */
const RULES: Rule[] = [
  { re: /coffee|caf[eé](?![a-z])|caafe|kafe|espresso|roast|beanshot|brew(?!ing co|ery)|mugs|chai |matcha|filter fusion|barista|bunaphile|steamin/i, tags: { category: "cafe", cuisines: ["coffee"] } },
  { re: /bakery|bakes|bake shop|patisserie|pinkk sugars|just buns|madi'?s/i, tags: { category: "cafe", cuisines: ["bakery"], vibes: ["quick_bite"] } },
  { re: /dessert|gelato|snowberry|ibaco|dulcie|lille|bonne femme|sugar/i, tags: { category: "sweets", cuisines: ["dessert"] } },
  { re: /modak|mishti|sweets|nobin chandra|k\.?c\.? das/i, tags: { category: "sweets", cuisines: ["mishti"], vibes: ["heritage"] } },
  { re: /tea stall|rose syrup|paranthe wali|phuchka|chaat|roll centre|\bstall\b/i, tags: { category: "street_food", cuisines: ["street_food"], vibes: ["quick_bite", "adda"] } },

  { re: /bengali|bangla|bhojohori|aaheli|sonargaon|rajbari|jorasanko|kasturi|golbari|rupa hotel|bengal dhaba|oh! calcutta|6 ballygunge|pancham|abar baithak|uttorer adda/i, tags: { cuisines: ["bengali"] } },
  { re: /kareem|riyasat|oudh|biryani|royal indian|aminia|arsalan|kebab|moti mahal|mughlai/i, tags: { cuisines: ["mughlai"] } },
  { re: /biryani|riyasat|arsalan/i, tags: { cuisines: ["biryani"] } },
  { re: /dhaba|punjab|tandoor|handi|balwant|honey da/i, tags: { cuisines: ["north_indian"], vibes: ["family"] } },
  { re: /momo|chow|\bwok|dim sum|eau chew|noodle|china|chinese|wokaholic|miss ginko/i, tags: { cuisines: ["chinese"] } },
  { re: /thai|thakali|\bpho\b|japan|sushi|wasabee|aajisai|oriental|nomnom|asia|wafira|mandala|friends of pho|baan thai/i, tags: { cuisines: ["asian"] } },
  { re: /pizza|pizzeria|italian|pasta|olio|fabbrica|la letizia|bianco|veneto|sorano|naanzza/i, tags: { cuisines: ["italian"] } },
  { re: /continental|european|bistro|steak|trincas|peter cat|gazeboo|diner|tavern|spanish|mehico|mexic|kouzina|farzi|casa miami|eloise|chapter 2|mqxt|mabrooks|sienna|marbella|conclave|gusto|hatari|harry'?s|babu culture|pronto/i, tags: { cuisines: ["continental"] } },
  { re: /barbecue|bar-?b-?q|\bbbq\b|grill|smoke|hickory/i, tags: { cuisines: ["bbq"] } },
  { re: /burger/i, tags: { cuisines: ["continental"], vibes: ["quick_bite"] } },
  { re: /\broll\b|\brolls\b/i, tags: { cuisines: ["rolls"], vibes: ["quick_bite"] } },

  { re: /(?<!coffee )\bbar\b(?!-)|\bpub\b|brew(ery|ing co)|taproom|beer|sky ?bar|lounge|conversation room|yokocho|cobo|cove\b|drunken|afterhours|pour house|deck 88|trapeze|lmnoq|refinery|irish house|hard rock|lords and barons|desi lane|motorworks|canteen pub|sabka club|level seven|the grid|soul - the sky/i, tags: { vibes: ["bar", "late_night"], openLate: true } },
  { re: /\bsky\b|rooftop|roof top|terrace|altair|botanik|soul - the sky|up there|la vue|boho the sky|capella/i, tags: { vibes: ["rooftop"] } },
  { re: /glasshouse|boho|courtyard|garden|retro|wabi sabi|casa miami|tram world|aesthetic|library|studio|bageecha|mud -|day room|cafe 82|the daily cafe/i, tags: { vibes: ["aesthetic"] } },
  { re: /adda|baithak|coffee house|tea stall|uttorer/i, tags: { vibes: ["adda"] } },
  { re: /multicuisine|family|dhaba|buffet|absolute barbecues/i, tags: { vibes: ["family"] } },
  { re: /fairlawn|trincas|flurys|oberoi|rajbari|heritage|indian coffee house|peter cat|nobin|haridas|rupa hotel|aaheli|sonargaon|golbari/i, tags: { vibes: ["heritage"] } },
];

/** Hand-set tags where the name alone misleads. Keys are lower-cased display names. */
const MANUAL: Record<string, Partial<Tags>> = {
  "just buns": { category: "cafe", cuisines: ["bakery", "rolls"], vibes: ["quick_bite"] },
  "uttorer adda": { category: "cafe", cuisines: ["bengali", "coffee"], vibes: ["adda"] },
  "the elgin fairlawn - kolkata - heritage hotel (since 1783)": { category: "cafe", cuisines: ["continental"], vibes: ["heritage"] },
  "golbari": { category: "restaurant", cuisines: ["bengali"], vibes: ["heritage", "adda"] },
  "mutton golbari": { category: "restaurant", cuisines: ["bengali"] },
  "indian coffee house": { category: "cafe", cuisines: ["coffee"], vibes: ["heritage", "adda"] },
  "adi haridas modak": { category: "sweets", cuisines: ["mishti"], vibes: ["heritage"] },
  "nobin chandra das": { category: "sweets", cuisines: ["mishti"], vibes: ["heritage"] },
  "hard rock cafe": { category: "restaurant", cuisines: ["continental"], vibes: ["bar", "late_night"] },
  "burger you!!": { category: "cafe", cuisines: ["continental"], vibes: ["quick_bite"] },
  "lille dessert bar": { category: "sweets", cuisines: ["dessert"], vibes: [] },
  "bijoli grill": { category: "restaurant", cuisines: ["bengali", "bbq"] },
};

const uniq = <T,>(a: T[]) => [...new Set(a)];

export function classify(name: string, typeHint?: string): Tags {
  const tags: Tags = { category: "restaurant", cuisines: [], vibes: [] };
  const merge = (t: Partial<Tags>) => {
    if (t.category) tags.category = t.category;
    if (t.cuisines) tags.cuisines = uniq([...tags.cuisines, ...t.cuisines]);
    if (t.vibes) tags.vibes = uniq([...tags.vibes, ...t.vibes]);
    if (t.diet) tags.diet = t.diet;
    if (t.openLate) tags.openLate = true;
  };

  if (typeHint && TYPE_TAGS[typeHint]) merge(TYPE_TAGS[typeHint]);
  for (const r of RULES) if (r.re.test(name)) merge(r.tags);
  const manual = MANUAL[name.toLowerCase()];
  if (manual) {
    // Manual entries replace rather than add, because they exist to correct the rules.
    if (manual.category) tags.category = manual.category;
    if (manual.cuisines) tags.cuisines = manual.cuisines;
    if (manual.vibes) tags.vibes = manual.vibes;
  }
  // A cafe or street stall is not a "family restaurant" just because the name says dhaba etc.
  if (tags.category === "street_food") tags.vibes = tags.vibes.filter((v) => v !== "family");
  return tags;
}
