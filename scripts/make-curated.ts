/**
 * Builds data/lists/curated.json (the "best of Kolkata" picks that are not on the user's two lists) from
 * a hand-written table of what each place is, plus pins and Google Maps facts from the crawl
 * (data/lists/curated.raw2.json, data/lists/curated.ll.json). Also writes their snapshot records.
 * Run: `npx tsx scripts/make-curated.ts && npm run data`.
 *
 * Only facts found in sources are written: LBB lists, the Kolkata EazyDiner Foodie Awards 2026, the
 * Conde Nast India x District awards 2025, and Google Maps itself. Anything not sourced is left out.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { Place } from "../src/lib/schema";

type Meta = {
  slug: string;
  category: Place["category"];
  cuisines: NonNullable<Place["cuisines"]>;
  vibes: NonNullable<Place["vibes"]>;
  tags?: string[];
  priceLevel?: number;
  openLate?: boolean;
  blurb: string;
  dishes?: string[];
  tips?: Place["tips"];
  /** Overrides what the crawl found, where the crawl read the wrong page. */
  fix?: { r?: number; c?: number };
};

const META: Meta[] = [
  // ── Cafes ──
  { slug: "raa-bistro", category: "cafe", cuisines: ["coffee", "continental"], vibes: ["aesthetic", "quick_bite"], tags: ["quiet", "date"],
    blurb: "A new cafe in Park Circus with a relaxed vibe, elegant interiors and a comforting menu of coffee and hearty bites.",
    tips: { expect: "A calm, stylish coffee stop.", tip: "Handy between the Central and South Kolkata circuits." } },
  { slug: "ampm-park-street", category: "cafe", cuisines: ["coffee", "continental"], vibes: ["bar", "adda", "aesthetic"], tags: ["foodie"], openLate: true,
    blurb: "A Park Street cafe by day that turns into a bar by night. Named Best Bar in Kolkata and ranked No. 12 on the 30 Best Bars India list.",
    dishes: ["Before PM Martini (Bengali chilli liqueur, tequila, espresso)", "Park Street Negroni with coffee-infused whisky"],
    tips: { expect: "A seamless day-to-night format with live energy after dark.", good: "The coffee-led cocktails.", tip: "A good Park Street stop before or after the Central pandals." } },
  { slug: "the-bhawanipur-house", category: "cafe", cuisines: ["coffee", "continental"], vibes: ["aesthetic", "family"], tags: ["foodie"],
    blurb: "An all-day cafe in Bhowanipore that won Best All Day Cafe at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "A comfortable all-day sit-down.", tip: "Close to the Bhowanipore and Kalighat routes." } },
  { slug: "cafe-icanflyy", category: "cafe", cuisines: ["coffee"], vibes: ["aesthetic", "quick_bite"], tags: ["quiet", "photogenic"],
    blurb: "A tea and coffee cafe run by staff with special needs, with exposed brick walls and motivational quotes.",
    dishes: ["BBQ spicy chicken poppers", "Cheese pots", "Chicken cheese maggi"],
    tips: { expect: "A small, warm, feel-good cafe.", tip: "Near Ballygunge, so easy to add to the Gariahat and Ballygunge pandals." } },
  { slug: "travelistan", category: "cafe", cuisines: ["coffee", "continental"], vibes: ["aesthetic", "adda"], tags: ["photogenic"],
    blurb: "A travel-themed cafe at Golf Green with a world-map ceiling and Tintin characters on the walls.",
    tips: { expect: "A playful, themed room for a long chat.", watch: "It is on the far south side, so plan it with the Jadavpur and Naktala pandals." } },
  { slug: "artsy-cafe", category: "cafe", cuisines: ["coffee", "continental"], vibes: ["aesthetic"], tags: ["photogenic", "date", "quiet"],
    blurb: "Billed as Kolkata's first art cafe: whitewashed walls hung with artworks, an indoor faux gazebo and a European-piazza feel.",
    tips: { expect: "Pretty and calm, good for photos.", tip: "A quiet pause on the Bhowanipore side." } },
  // ── Restaurants and bars ──
  { slug: "perimas", category: "restaurant", cuisines: ["south_indian"], vibes: ["aesthetic", "quick_bite"], tags: ["foodie"],
    blurb: "A fun-dining bistro rooted in South Indian flavours.",
    dishes: ["Sabakki-Moz Vada", "Maddur Falafel", "Uttapam Tacos", "Banana Doffle", "Filter Kappi"],
    tips: { expect: "Playful South Indian plates.", tip: "A light change from rich Puja food." } },
  { slug: "park-street-social", category: "restaurant", cuisines: ["continental", "north_indian"], vibes: ["bar", "adda", "late_night"], tags: ["foodie"], openLate: true,
    blurb: "A lively all-day cafe-bar on Park Street with a creative menu and co-working-meets-cafe energy.",
    tips: { expect: "Busy and social, loud on weekends.", tip: "On the Park Street strip with AMPM, Mocambo and Trincas." } },
  { slug: "mintelaa", category: "restaurant", cuisines: ["continental"], vibes: ["family", "aesthetic"], tags: ["foodie", "date"], priceLevel: 3,
    blurb: "A Salt Lake Sector 1 restaurant that won Best Fine Dining and Best All Day Cafe at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "A polished sit-down meal.", watch: "Book ahead on Puja weekends.", tip: "A good dinner after the Salt Lake block pandals." }, fix: { r: 4.6, c: 236 } },
  { slug: "sonar-tori", category: "restaurant", cuisines: ["bengali"], vibes: ["family", "heritage"], tags: ["foodie", "family"],
    blurb: "A Salt Lake Bengali restaurant that won Best Bengali Food Experience at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "A proper Bengali sit-down meal.", tip: "Close to the Salt Lake pandals." } },
  { slug: "oh-calcutta", category: "restaurant", cuisines: ["bengali"], vibes: ["family", "heritage"], tags: ["foodie", "family"],
    blurb: "A well-known Bengali restaurant at Forum Mall on Elgin Road, among the city's top-rated restaurants.",
    tips: { expect: "Refined Bengali food in a mall setting.", watch: "Mall hours apply, and it fills up on Puja weekends.", tip: "Handy for the Elgin Road and Bhowanipore side." } },
  { slug: "bhojohori-manna-ballygunge", category: "restaurant", cuisines: ["bengali"], vibes: ["family"], tags: ["foodie", "family"], priceLevel: 2,
    blurb: "The Ballygunge outlet of the Bengali chain that won Taste of Bengal at the Kolkata EazyDiner Foodie Awards 2026. About ₹390 a head on Google.",
    tips: { expect: "Reliable home-style Bengali plates.", tip: "A practical lunch near the Gariahat and Ballygunge pandals." } },
  { slug: "kasturi-restaurant", category: "restaurant", cuisines: ["bengali"], vibes: ["family", "quick_bite"], tags: ["foodie", "family"],
    blurb: "Kasturi Food Plaza in Ballygunge, listed among the best Bengali restaurants for home-style thalis and Bangladeshi cooking.",
    tips: { expect: "A busy, no-frills Bengali meal.", tip: "Near Gariahat." } },
  { slug: "calcutta-nostalgia", category: "restaurant", cuisines: ["bengali"], vibes: ["family", "heritage"], tags: ["foodie"],
    blurb: "A Bengali restaurant near Mudiali and Lake Market, listed among the best Bengali restaurants.",
    tips: { expect: "Old-Calcutta flavours.", tip: "Close to Mudiali Club and the Kalighat pandals." } },
  { slug: "allen-kitchen", category: "restaurant", cuisines: ["bengali"], vibes: ["heritage", "family", "quick_bite"], tags: ["heritage", "foodie"],
    blurb: "A long-standing Bengali eatery in North Kolkata, rated about 4.3 from nearly 2,800 reviews.",
    tips: { expect: "Straightforward Bengali food.", tip: "A natural meal stop on the Baghbazar and Hatibagan circuit." } },
  { slug: "dilkhusha-cabin", category: "restaurant", cuisines: ["bengali"], vibes: ["heritage", "adda", "quick_bite"], tags: ["heritage"],
    blurb: "An old-style cabin eatery by College Street.",
    tips: { expect: "A no-frills cabin from old Calcutta.", tip: "Pair it with the College Street baris and the Indian Coffee House." } },
  { slug: "kwality-park-street", category: "restaurant", cuisines: ["north_indian", "mughlai"], vibes: ["heritage", "family"], tags: ["heritage", "family"],
    blurb: "Kwality on Park Street, an old-school Indian restaurant (Google lists it as a heritage Indian restaurant).",
    tips: { expect: "Classic North Indian and Mughlai plates.", tip: "On the Park Street stretch." } },
  { slug: "mocambo", category: "restaurant", cuisines: ["continental"], vibes: ["heritage", "family", "bar"], tags: ["heritage", "foodie"],
    blurb: "A Park Street classic, named in the Conde Nast India x District Top Restaurant Awards 2025. Rated about 4.3 from over 17,000 reviews.",
    tips: { expect: "A retro dining room and bar.", watch: "Very popular. Book for Puja evenings.", tip: "Part of the Park Street cluster." } },
  { slug: "shiraz-golden-restaurant", category: "restaurant", cuisines: ["biryani", "mughlai"], vibes: ["family", "heritage"], tags: ["foodie"],
    blurb: "A Mughlai restaurant at Park Circus, rated about 4.1 from nearly 9,000 reviews.",
    tips: { expect: "A busy Mughlai and biryani meal.", tip: "A Park Circus stop between the central and south circuits." } },
  { slug: "zeeshan", category: "restaurant", cuisines: ["mughlai"], vibes: ["family", "quick_bite"], tags: ["foodie"],
    blurb: "A Mughlai restaurant at Park Circus, rated about 4.0 from nearly 5,000 reviews.",
    tips: { expect: "Quick, filling Mughlai food.", tip: "Near Shiraz and Park Circus." } },
  { slug: "pa-pa-ya", category: "restaurant", cuisines: ["asian"], vibes: ["aesthetic", "bar"], tags: ["foodie", "date"],
    blurb: "PaPaYa, a modern Asian bistro on Park Street that won Best Sushi at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "Polished pan-Asian plates and sushi.", tip: "On Park Street." } },
  { slug: "yauatcha", category: "restaurant", cuisines: ["asian"], vibes: ["aesthetic", "family"], tags: ["foodie", "date"], priceLevel: 3,
    blurb: "A dim sum restaurant at Quest Mall that won Best Pan-Asian at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "Upscale dim sum and Asian plates.", watch: "Mall hours apply.", tip: "Combine with the Ballygunge pandals." } },
  { slug: "someplace-else", category: "restaurant", cuisines: ["continental"], vibes: ["bar", "adda", "late_night"], tags: ["foodie"], openLate: true,
    blurb: "A pub at The Park on Park Street, known for rock and live music.",
    tips: { expect: "A classic Park Street pub night.", tip: "Part of the Park Street bar strip." } },
  { slug: "roots-chowringhee", category: "restaurant", cuisines: ["continental"], vibes: ["rooftop", "bar", "adda"], tags: ["foodie"], openLate: true,
    blurb: "A rooftop pub on Chowringhee that won Best Rooftop Bar at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "A rooftop drinks-and-bites crowd.", tip: "Close to Elgin Road and the Esplanade end of the Central circuit." } },
  { slug: "glook-the-sky-lounge", category: "restaurant", cuisines: ["continental", "north_indian"], vibes: ["rooftop", "bar", "aesthetic"], tags: ["date"],
    blurb: "A sky lounge that won Best View at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "City views from a rooftop lounge.", watch: "It is out in New Town, away from the main Puja circuits.", tip: "Only worth it if you are already out that way." } },
  { slug: "ambrosia-restaurant-and-bar", category: "restaurant", cuisines: ["continental"], vibes: ["bar", "aesthetic"], tags: ["date"], openLate: true,
    blurb: "A Salt Lake bar and restaurant that won Best Cocktail Bar at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "Cocktails in a polished setting.", tip: "A Salt Lake evening stop after the block pandals." } },
  { slug: "la-soiree", category: "restaurant", cuisines: ["continental"], vibes: ["bar", "aesthetic"], tags: ["date"], openLate: true,
    blurb: "A new fine-dining and lounge space in Bhowanipore that won Best Cocktail Bar at the Kolkata EazyDiner Foodie Awards 2026.",
    tips: { expect: "A stylish lounge and cocktails.", tip: "A drink on the Bhowanipore side." } },
  { slug: "little-bit-sober", category: "restaurant", cuisines: ["continental"], vibes: ["bar", "aesthetic"], tags: ["date"], openLate: true,
    blurb: "A Bhowanipore cocktail bar that builds drinks around Bengal ingredients such as gondhoraj lemon and nolen gur.",
    tips: { expect: "Local-flavour cocktails.", tip: "Near Bhowanipore." } },
  { slug: "the-junction-alipore", category: "restaurant", cuisines: ["continental"], vibes: ["bar", "heritage"], tags: ["heritage"], openLate: true,
    blurb: "A historic Alipore whisky bar with rare single malts and a British-era feel.",
    tips: { expect: "A quiet, old-school whisky bar.", watch: "Only a few reviews (about 60), so check before you go.", tip: "Near the Alipore pandals." } },
  { slug: "olterra", category: "restaurant", cuisines: ["continental"], vibes: ["bar", "adda", "aesthetic"], tags: ["foodie"], openLate: true,
    blurb: "An artisanal brewery and cocktail bar on Park Street with Greek-myth decor. Rated about 4.8 from over 2,700 reviews.",
    tips: { expect: "Craft beer and cocktails in a showy room.", tip: "On the Park Street strip." } },
  // ── Sweets ──
  { slug: "sen-mahasay", category: "sweets", cuisines: ["mishti"], vibes: ["quick_bite", "heritage"], tags: ["heritage"], priceLevel: 1,
    blurb: "A North Kolkata sweet shop rated about 4.3 from over 900 reviews.",
    tips: { expect: "Counter-service mishti.", tip: "A sweet stop on the Hatibagan and Maniktala side." } },
  { slug: "girish-chandra-dey-nakur-chandra-nandy", category: "sweets", cuisines: ["mishti"], vibes: ["quick_bite", "heritage"], tags: ["heritage", "foodie"], priceLevel: 1,
    blurb: "A famous Bagbazar sweet shop, rated about 4.6 from nearly 11,000 reviews.",
    tips: { expect: "Classic Bengali sweets.", good: "The very high rating from many reviewers.", tip: "Slot it into the Baghbazar and Kumartuli loop." } },
  { slug: "putiram", category: "sweets", cuisines: ["mishti", "street_food"], vibes: ["quick_bite", "heritage"], tags: ["heritage"], priceLevel: 1,
    blurb: "Putiram Sweets on College Street, rated about 4.3 from nearly 4,000 reviews.",
    tips: { expect: "A busy counter with sweets and savouries.", tip: "Pair with College Square and the Indian Coffee House." } },
  { slug: "bhim-chandra-nag", category: "sweets", cuisines: ["mishti"], vibes: ["quick_bite", "heritage"], tags: ["heritage"], priceLevel: 1,
    blurb: "A traditional mishti shop in Bowbazar, rated about 4.4.",
    tips: { expect: "Classic sandesh-and-sweets counter.", tip: "Near the Central heritage circuit." } },
  { slug: "balaram-mullick-radharaman-mullick", category: "sweets", cuisines: ["mishti"], vibes: ["quick_bite", "heritage"], tags: ["heritage", "foodie"], priceLevel: 1,
    blurb: "A Bhowanipore mishti institution that won Best Mishti at the Kolkata EazyDiner Foodie Awards 2026. Rated about 4.3 from nearly 9,700 reviews.",
    tips: { expect: "A long-standing sweet shop.", tip: "Near the Bhowanipore and Kalighat routes." } },
];

type Crawl = { nm?: string; r?: number; c?: number; cl?: string; h?: string[]; img?: string; ll?: [number, number]; p?: string; t?: string };
const crawl: Record<string, Crawl> = JSON.parse(readFileSync("data/lists/curated.raw2.json", "utf8"));
const llFile: Record<string, [number, number]> = JSON.parse(readFileSync("data/lists/curated.ll.json", "utf8"));

const tidy = (n: string) =>
  n.replace(/,\s*Kolkata.*$/i, "").replace(/\s+-\s+Salt Lake$/i, "").replace(/\bKafi\b/, "Kafi").trim();
const NAME_OVERRIDE: Record<string, string> = {
  "zeeshan": "Zeeshan",
  "kasturi-restaurant": "Kasturi Food Plaza",
  "ampm-park-street": "AMPM (Park Street)",
  "mintelaa": "Mintelaa - By the Air",
  "roots-chowringhee": "Roots (Chowringhee)",
  "sonar-tori": "Sonar Tori (Salt Lake)",
  "bhojohori-manna-ballygunge": "Bhojohori Manna (Ballygunge)",
  "olterra": "Olterra (Park Street)",
  "mocambo": "Mocambo",
  "the-junction-alipore": "The Junction (Alipore)",
  "kwality-park-street": "Kwality (Park Street)",
};

const curated = META.map((m) => {
  const c = crawl[m.slug];
  const ll = llFile[m.slug] ?? c?.ll;
  if (!ll) throw new Error(`No pin for ${m.slug}`);
  const { slug, fix, ...rest } = m;
  void fix;
  return { slug, name: NAME_OVERRIDE[slug] ?? tidy(c?.nm ?? slug), lat: ll[0], lng: ll[1], ...rest };
});
writeFileSync("data/lists/curated.json", JSON.stringify(curated, null, 1));

// Snapshot records for the picks (merged into data/snapshot.json).
const snap: Record<string, unknown> = JSON.parse(readFileSync("data/snapshot.json", "utf8"));
for (const m of META) {
  const c = crawl[m.slug];
  if (!c?.nm) continue;
  const rec: Record<string, unknown> = { nm: NAME_OVERRIDE[m.slug] ?? c.nm };
  const wrongPage = m.fix !== undefined;
  const r = m.fix?.r ?? c.r;
  const n = m.fix?.c ?? c.c;
  if (r) rec.r = r;
  if (n) rec.c = n;
  if (!wrongPage) {
    if (c.cl) rec.cl = c.cl;
    if (c.h && c.h.length === 7) rec.h = c.h;
    if (c.img) rec.img = c.img;
  }
  snap[m.slug] = rec;
}
writeFileSync("data/snapshot.json", JSON.stringify(snap).replace(/},"/g, "},\n\""));
console.log(`wrote ${curated.length} curated picks`);
