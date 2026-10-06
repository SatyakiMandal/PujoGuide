/**
 * Human-edited source of truth for places. `npm run data` turns this into
 * src/data/*.json (validated). Edit THIS file, not the JSON.
 *
 * Source list: the user's pasted Bonedi Bari + Pandal list, de-duplicated.
 * Anything I was unsure about carries `needsReview` + a note.
 *
 * COORDINATES: pins are placed against a neighbourhood anchor below, so every
 * place is `coordConfidence: "area"` until verified by `npm run geocode`
 * (needs a Google key) or by hand. The UI labels these "approximate".
 */
import type { Category, Cuisine, Diet, Region, Vibe, Zone } from "../src/lib/schema";

export const zones: Zone[] = [
  { id: "north", name: "North Kolkata", region: "north" },
  { id: "shobhabazar", name: "Shobhabazar", region: "north" },
  { id: "girish_park", name: "Girish Park", region: "north" },
  { id: "mg_road", name: "MG Road", region: "north" },
  { id: "central", name: "Central Kolkata", region: "central" },
  { id: "park_street", name: "Park Street", region: "central" },
  { id: "howrah", name: "Howrah", region: "central" },
  { id: "bhowanipore", name: "Bhowanipore", region: "south" },
  { id: "kalighat", name: "Kalighat", region: "south" },
  { id: "ballygunge", name: "Ballygunge / Gariahat", region: "south" },
  { id: "jadavpur", name: "Jadavpur", region: "south" },
  { id: "alipore", name: "Alipore", region: "south" },
  { id: "kasba", name: "Kasba", region: "south" },
  { id: "behala", name: "Behala", region: "south" },
  { id: "south", name: "South Kolkata", region: "south" },
  { id: "salt_lake", name: "Salt Lake", region: "saltlake" },
  { id: "newtown", name: "New Town", region: "saltlake" },
];

/** Neighbourhood anchors: approximate centres (lat, lng) + nearest metro we are confident about. */
export const areas: Record<string, { lat: number; lng: number; metro?: string[] }> = {
  hatkhola: { lat: 22.5985, lng: 88.3585 },
  baghbazar: { lat: 22.6035, lng: 88.3665 },
  shobhabazar: { lat: 22.6, lng: 88.3645, metro: ["Shobhabazar Sutanuti"] },
  kumartuli: { lat: 22.6008, lng: 88.3612 },
  ahiritola: { lat: 22.5985, lng: 88.359 },
  hatibagan: { lat: 22.5945, lng: 88.373 },
  maniktala: { lat: 22.5925, lng: 88.3785 },
  chaltabagan: { lat: 22.5975, lng: 88.3665 },
  lalabagan: { lat: 22.5995, lng: 88.3805 },
  tala: { lat: 22.6035, lng: 88.3885 },
  dumdum_park: { lat: 22.6195, lng: 88.4015 },
  shreebhumi: { lat: 22.6085, lng: 88.4 },
  girish_park: { lat: 22.5872, lng: 88.3638, metro: ["Girish Park"] },
  jorasanko: { lat: 22.5832, lng: 88.3597 },
  pathuriaghata: { lat: 22.5885, lng: 88.3565 },
  chorbagan: { lat: 22.5855, lng: 88.3595 },
  mg_road: { lat: 22.5815, lng: 88.3655, metro: ["MG Road"] },
  college_square: { lat: 22.5745, lng: 88.364 },
  central: { lat: 22.5725, lng: 88.3645, metro: ["Central"] },
  kolutolla: { lat: 22.5707, lng: 88.3573 },
  janbazar: { lat: 22.564, lng: 88.356 },
  mohammed_ali_park: { lat: 22.567, lng: 88.36 },
  taltala: { lat: 22.559, lng: 88.36 },
  sealdah: { lat: 22.566, lng: 88.37 },
  bhowanipore: { lat: 22.533, lng: 88.347 },
  kalighat: { lat: 22.5205, lng: 88.345, metro: ["Kalighat"] },
  deshapriya_park: { lat: 22.5112, lng: 88.35 },
  chetla: { lat: 22.5175, lng: 88.338 },
  ballygunge: { lat: 22.525, lng: 88.364, metro: ["Jatin Das Park"] },
  gariahat: { lat: 22.5165, lng: 88.3595, metro: ["Jatin Das Park"] },
  jadavpur: { lat: 22.499, lng: 88.371 },
  naktala: { lat: 22.493, lng: 88.36 },
  alipore: { lat: 22.533, lng: 88.332 },
  kasba: { lat: 22.515, lng: 88.389 },
  bosepukur: { lat: 22.51, lng: 88.387 },
  behala: { lat: 22.4975, lng: 88.318 },
  barisha: { lat: 22.4835, lng: 88.317 },
  salt_lake: { lat: 22.58, lng: 88.415, metro: ["Salt Lake Sector V"] },
  park_street: { lat: 22.5525, lng: 88.352 },
  new_market: { lat: 22.5612, lng: 88.3515 },
  esplanade: { lat: 22.565, lng: 88.3515 },
  park_circus: { lat: 22.543, lng: 88.368 },
};

type Opts = { aliases?: string[]; tags?: string[]; notes?: string; review?: boolean };
type Row = {
  name: string;
  category: Category;
  zones: string[];
  area: string;
  opts: Opts;
  food?: {
    cuisines: Cuisine[];
    vibes: Vibe[];
    priceLevel: 1 | 2 | 3 | 4;
    diet: Diet[];
    openLate?: boolean;
    blurb: string;
  };
};

const regionOf = (zoneIds: string[]): Region => {
  const z = zones.find((x) => x.id === zoneIds[0]);
  if (!z) throw new Error(`Unknown zone ${zoneIds[0]}`);
  return z.region;
};
export { regionOf };

const rows: Row[] = [];
const bari = (name: string, zs: string[], area: string, opts: Opts = {}) =>
  rows.push({ name, category: "bonedi_bari", zones: zs, area, opts });
const pandal = (name: string, zs: string[], area: string, opts: Opts = {}) =>
  rows.push({ name, category: "pandal", zones: zs, area, opts });
const food = (
  name: string,
  category: Category,
  area: string,
  zs: string[],
  f: NonNullable<Row["food"]>,
  opts: Opts = {},
) => rows.push({ name, category, zones: zs, area, opts, food: f });

// ───────────────────────── Bonedi Baris (27 after de-dupe) ─────────────────────────
const INFERRED = "Neighbourhood inferred from the name; confirm.";
bari("Hathkhola Dutta Bari", ["north"], "hatkhola", { notes: INFERRED, review: true });
bari("Baghbazar Haldar Bari", ["north"], "baghbazar");

bari("Chorbagan Sil Bari", ["mg_road"], "chorbagan");
bari("Chorbagan Mitra Bari", ["mg_road"], "chorbagan");
bari("Thantania Dutta Bari", ["mg_road"], "mg_road", { aliases: ["Thanthania Dutta Bari"] });

// Listed twice in the source (ungrouped + Central). One record.
bari("Badan Chand Roy Bari", ["central"], "kolutolla", {
  aliases: ["Kolutolla Rajbari", "Colootola Rajbari"],
  tags: ["rajbari"],
});
bari("Ramgopal Saha Bari", ["central"], "central");
// Pin from the user's own Google Maps link (Google names it "Nilmani Dey's Thakur Bari"). A separate stop from Darjipara Mitra Bari, about 3 km away.
bari("Nilmani Mitra Bari", ["central"], "central", { aliases: ["Nilmani Dey's Thakur Bari"] });
bari("Rani Roshmoni Bari", ["central"], "janbazar", { aliases: ["Rani Rashmoni Bari"] });

bari("Mallick Bari", ["bhowanipore"], "bhowanipore");

bari("Sabarna Roy Chowdhury Atchala Bari", ["behala"], "barisha", {
  aliases: ["Sabarna Roy Choudhury Atchala"],
});
bari("Amarendra Bhavan (Roy Bari)", ["behala"], "behala", { aliases: ["Roy Bari Behala"] });

bari("Shobhabazar Rajbari (Radha Kanta Dev Estate)", ["shobhabazar"], "shobhabazar", {
  aliases: ["Shovabazar Raj Bari 1", "Shobhabazar Rajbari 1", "Radha Kanta Dev Bari"],
  tags: ["rajbari"],
});
bari("Shobhabazar Rajbari (Maharaja Naba Krishna Dev Bari)", ["shobhabazar"], "shobhabazar", {
  aliases: ["Shobhabazar Rajbari 2", "Naba Krishna Dev Bari"],
  tags: ["rajbari"],
});
bari("Shobhabazar Rajbari Thakur Dalan", ["shobhabazar"], "shobhabazar", {
  aliases: ["Sobhabajar Rajbari Thakur Dalan"],
  tags: ["rajbari", "thakur_dalan"],
});
bari("Darjipara Mitra Bari", ["shobhabazar"], "shobhabazar", { aliases: ["Darjipara Mitra House"] });
bari("Chatu Babu Latu Babu Bari", ["shobhabazar"], "ahiritola", {
  aliases: ["Chhatu Babu Latu Babu Bari"],
});

bari("Bholanath Dham Dutta Bari", ["girish_park"], "maniktala", { notes: "Goa Bagan, Maniktala (not Girish Park itself)." });
bari("Maniktala Saha Bari", ["girish_park"], "maniktala");
bari("Lala Bari", ["girish_park"], "girish_park");
bari("Shamul Dhone Dutta Bari", ["girish_park"], "girish_park");
bari("Daw Bari Bandook Wala", ["girish_park"], "jorasanko", { aliases: ["Bandookwala Daw Bari"] });
// One house: Google Maps lists it as "Jorasanko Shib Krishna Daw's Bari" (confirmed from the user's link).
bari("Shib Krishna Daw Bari", ["girish_park"], "jorasanko", {
  aliases: ["Jorasanko Daw Bari", "Jorasanko Shub Krishna Daw Bari"],
});
bari("Harakutir Ray Banerjee Bari", ["girish_park"], "girish_park");
// One house: Google Maps lists it as "Pathuriaghata Rajbari (Khelat Ghose's Residence)" (confirmed from the user's link).
bari("Pathuriaghata Rajbari", ["girish_park", "north"], "pathuriaghata", {
  aliases: ["Khelat Ghosh Babu Bari", "Khelat Ghose's Residence"],
  tags: ["rajbari", "dhunuchi_nach"],
  notes: "47 Pathuriaghata Street. Dhunuchi Nach every evening at approx. 7 pm. Suggested on Saptami.",
});

// ───────────────────────── Pandals (54 after de-dupe) ─────────────────────────
// Kalighat group (Metro: Kalighat). Several also appear under South Kolkata in the source.
pandal("Kalighat Milan Sangha", ["kalighat"], "kalighat");
pandal("64 Pally", ["kalighat"], "kalighat");
pandal("66 Pally", ["kalighat", "south"], "kalighat");
pandal("Mudiali Club", ["kalighat", "south"], "kalighat", {
  aliases: ["Mudiali Park"],
  notes: "Mudiali Park and Mudiali Club are the same pandal.",
});
pandal("Tridhara Sammilani", ["kalighat", "south"], "kalighat", {
  aliases: ["Tridhara Sammalani"],
});
pandal("Deshapriya Park", ["kalighat", "south"], "deshapriya_park");

// Ballygunge / Gariahat (Metro: Jatin Das Park)
pandal("Ballygunge Cultural Association", ["ballygunge", "south"], "ballygunge", {
  aliases: ["Ballygunge Cultural"],
});
pandal("Singhi Park", ["ballygunge", "south"], "ballygunge");
pandal("Hindustan Park", ["ballygunge"], "gariahat");
pandal("Maddox Square", ["ballygunge", "south"], "ballygunge");
pandal("Dover Lane", ["ballygunge"], "gariahat");

// Jadavpur
pandal("Jadavpur 8B", ["jadavpur"], "jadavpur");
pandal("Suruchi Sangha", ["jadavpur", "south"], "jadavpur");
pandal("Ekdalia Evergreen", ["jadavpur", "south"], "ballygunge");
pandal("Aikatan", ["jadavpur"], "jadavpur");

// Alipore
pandal("Alipore 78 Pally", ["alipore"], "alipore");
pandal("Deshbandhu Park", ["alipore"], "alipore", {
  notes: "No Deshbandhu Park pandal was found in Alipore on Google Maps (the link given resolved to Jharkhand). A Deshbandhu Park exists in Shyambazar (north). Confirm which one you mean.",
  review: true,
});
pandal("Netaji Sangha", ["alipore"], "alipore");

// Kasba
pandal("Kasba 14 Pally", ["kasba"], "kasba");
pandal("Natun Dal", ["kasba"], "kasba");
pandal("Udichi", ["kasba"], "kasba");

// North Kolkata
pandal("Baghbazar Sarbojanin", ["north"], "baghbazar");
pandal("Hatibagan Sarbojanin", ["north"], "hatibagan");
pandal("Kumartuli Park", ["north"], "kumartuli", { aliases: ["Kumartuli Sarbojanin", "Kumartuli Park Sarbojanin"] });
pandal("Kashi Bose Lane", ["north"], "baghbazar", { notes: INFERRED, review: true });
pandal("Chaltabagan Lohapatty", ["north"], "chaltabagan", { aliases: ["Maniktala Chaltabagan", "Maniktala Chaltabagan Lohapatty"] });
pandal("Ahritola Sarbojanin", ["north"], "ahiritola", { aliases: ["Ahiritola Sarbojanin"] });
pandal("Tala Prattay", ["north"], "tala");
pandal("Dum Dum Park", ["north"], "dumdum_park");
pandal("Shreebhumi Sporting Club", ["north"], "shreebhumi");
pandal("Lalabagan Nabankur", ["north"], "lalabagan");

// Central Kolkata
pandal("Santosh Mitra Square", ["central"], "sealdah");
pandal("College Square", ["central"], "college_square");
pandal("Mohammed Ali Park", ["central"], "mohammed_ali_park");
pandal("Taltala Sarbojanin", ["central"], "taltala");
pandal("Chorbagan Sarbojanin", ["central"], "chorbagan");

// South Kolkata (only the ones not already listed above)
pandal("Chetla Agrani", ["south"], "chetla");
pandal("Badamtala Ashar Sangha", ["south"], "kalighat");
pandal("Naktala Udayan Sangha", ["south"], "naktala", { aliases: ["Naktala Udayan Sandha"] });
pandal("Bosepukur Sitala Mandir", ["south", "kasba"], "bosepukur");
pandal("68 Pally", ["south"], "kalighat", { notes: "Distinct from 64 and 66 Pally." });
pandal("Alipore Sarbojanin", ["south", "alipore"], "alipore", { aliases: ["Alipore Sarbojanin Durgapuja"] });

// Salt Lake (Metro: Sector V). 'Laboni Estate' is a locality, kept as listed.
for (const b of ["FD", "AK", "AE", "BJ", "AB", "IB", "GD", "FE", "CE"]) {
  pandal(`${b} Block`, ["salt_lake"], "salt_lake");
}
pandal("Laboni Estate", ["salt_lake"], "salt_lake");

// ───────────────────────── Food: UNVERIFIED seed (replace via Places API) ─────────────────────────
// Well-known institutions, placed at neighbourhood level. Run the enrichment/geocode
// pass before trusting any of these (hours, outlets, and exact spots change).
const SEED = "Unverified seed entry. Confirm the exact outlet, hours and location.";
food("Paramount Sharbat", "cafe", "college_square", ["central"], {
  cuisines: ["street_food"], vibes: ["heritage", "quick_bite"], priceLevel: 1, diet: ["veg"],
  blurb: "College Street institution for cold sharbats.",
}, { notes: SEED, review: true });
food("Flurys", "cafe", "park_street", ["central"], {
  cuisines: ["bakery", "continental"], vibes: ["heritage", "family"], priceLevel: 3, diet: ["veg", "nonveg"],
  blurb: "Old-world Park Street tea room and bakery.",
}, { notes: SEED, review: true });
food("Peter Cat", "restaurant", "park_street", ["central"], {
  cuisines: ["continental", "mughlai"], vibes: ["heritage", "family"], priceLevel: 3, diet: ["nonveg", "veg"],
  blurb: "Park Street classic known for chelo kebab.",
}, { notes: SEED, review: true });
food("Nizam's", "restaurant", "new_market", ["central"], {
  cuisines: ["rolls", "mughlai"], vibes: ["heritage", "quick_bite"], priceLevel: 1, diet: ["nonveg", "veg"],
  blurb: "Home of the Kolkata kathi roll.",
}, { notes: SEED, review: true });
food("Aminia", "restaurant", "new_market", ["central"], {
  cuisines: ["mughlai", "biryani"], vibes: ["heritage", "family"], priceLevel: 2, diet: ["nonveg"],
  blurb: "Mughlai and biryani institution near New Market.",
}, { notes: SEED, review: true });
food("Royal Indian Hotel", "restaurant", "kolutolla", ["central"], {
  cuisines: ["mughlai", "biryani"], vibes: ["heritage"], priceLevel: 1, diet: ["nonveg"],
  blurb: "Old-Kolkata Mughlai near the Bonedi Bari belt.",
}, { notes: SEED, review: true });
food("Arsalan", "restaurant", "park_circus", ["central"], {
  cuisines: ["biryani", "mughlai"], vibes: ["family", "late_night"], priceLevel: 2, diet: ["nonveg"], openLate: true,
  blurb: "Biryani favourite that stays busy through Puja nights.",
}, { notes: SEED, review: true });
food("K.C. Das", "sweets", "esplanade", ["central"], {
  cuisines: ["mishti"], vibes: ["heritage", "quick_bite"], priceLevel: 1, diet: ["veg"],
  blurb: "Famous for rosogolla and mishti doi.",
}, { notes: SEED, review: true });
food("Mitra Cafe", "restaurant", "shobhabazar", ["shobhabazar"], {
  cuisines: ["bengali"], vibes: ["heritage", "adda"], priceLevel: 1, diet: ["nonveg", "veg"],
  blurb: "Cabin-style Bengali fare in Shobhabazar.",
}, { notes: SEED, review: true });
food("6 Ballygunge Place", "restaurant", "ballygunge", ["ballygunge"], {
  cuisines: ["bengali"], vibes: ["family", "heritage"], priceLevel: 3, diet: ["nonveg", "veg"],
  blurb: "Elegant, long-standing Bengali dining.",
}, { notes: SEED, review: true });
food("Kewpie's Kitchen", "restaurant", "bhowanipore", ["bhowanipore"], {
  cuisines: ["bengali"], vibes: ["family", "heritage"], priceLevel: 3, diet: ["nonveg", "veg"],
  blurb: "Home-style Bengali in a heritage house.",
}, { notes: SEED, review: true });
food("Vivekananda Park phuchka stalls", "street_food", "bhowanipore", ["bhowanipore"], {
  cuisines: ["street_food"], vibes: ["quick_bite", "adda"], priceLevel: 1, diet: ["veg"],
  blurb: "Phuchka and chaat cluster around the park.",
}, { notes: SEED, review: true });

export { rows };
export type { Row };
