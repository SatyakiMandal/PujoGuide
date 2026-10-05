/**
 * Validates one or more food-research files before they are merged by `npm run data`.
 * Usage: npx tsx scripts/check-research.ts data/research/menu-01.json [more files]
 * Exits non-zero and prints every problem, so a researcher can fix a file without running the full build.
 */
import { readFileSync } from "node:fs";
import { CUISINES, DIETS, VIBES, menuItemSchema, mustTrySchema } from "../src/lib/schema";

type Entry = Record<string, unknown>;
const places = JSON.parse(readFileSync("src/data/places.json", "utf8")) as { slug: string; category: string }[];
const known = new Set(places.map((p) => p.slug));
const ISO = /^\d{4}-\d{2}-\d{2}$/;

let bad = 0;
const fail = (file: string, slug: string, msg: string) => {
  bad++;
  console.error(`${file} :: ${slug} :: ${msg}`);
};

for (const file of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, Entry>;
  let ok = 0;
  for (const [slug, e] of Object.entries(data)) {
    if (!known.has(slug)) { fail(file, slug, "unknown slug"); continue; }
    const before = bad;
    if (e.closed !== true && !(typeof e.checkedAt === "string" && ISO.test(e.checkedAt))) fail(file, slug, "needs checkedAt (YYYY-MM-DD) unless closed:true");
    if (e.closed === true && typeof e.checkedAt === "string" && !ISO.test(e.checkedAt)) fail(file, slug, "bad checkedAt");
    if (e.menu !== undefined) {
      if (!Array.isArray(e.menu)) fail(file, slug, "menu must be an array");
      else e.menu.forEach((m, i) => { const r = menuItemSchema.safeParse(m); if (!r.success) fail(file, slug, `menu[${i}] ${r.error.issues[0].message} (${JSON.stringify(m)})`); });
    }
    if (e.mustTry !== undefined) {
      const r = mustTrySchema.safeParse(e.mustTry);
      if (!r.success) fail(file, slug, `mustTry ${r.error.issues[0].message}`);
    }
    if (e.menuSources !== undefined && (!Array.isArray(e.menuSources) || e.menuSources.some((s) => typeof s !== "string" || s.includes("/")))) fail(file, slug, "menuSources must be bare hostnames like zomato.com");
    if (e.cuisines !== undefined && (!Array.isArray(e.cuisines) || e.cuisines.some((c) => !(CUISINES as readonly string[]).includes(c as string)))) fail(file, slug, `cuisines must be from: ${CUISINES.join(", ")}`);
    if (e.vibes !== undefined && (!Array.isArray(e.vibes) || e.vibes.some((c) => !(VIBES as readonly string[]).includes(c as string)))) fail(file, slug, `vibes must be from: ${VIBES.join(", ")}`);
    if (e.diet !== undefined && (!Array.isArray(e.diet) || e.diet.some((c) => !(DIETS as readonly string[]).includes(c as string)))) fail(file, slug, "diet must be from: veg, nonveg");
    if (e.priceLevel !== undefined && (!Number.isInteger(e.priceLevel) || (e.priceLevel as number) < 1 || (e.priceLevel as number) > 4)) fail(file, slug, "priceLevel 1-4");
    if (e.pureVeg === true && Array.isArray(e.menu) && e.menu.some((m) => (m as { diet?: string }).diet === "nonveg")) fail(file, slug, "pureVeg:true but menu has a nonveg item");
    if (bad === before) ok++;
  }
  console.log(`${file}: ${Object.keys(data).length} entries, ${ok} clean`);
}
process.exit(bad ? 1 : 0);
