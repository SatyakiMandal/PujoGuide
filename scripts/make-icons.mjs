// Renders src/app/icon.svg to the PNG sizes an installable app needs. Run: node scripts/make-icons.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("src/app/icon.svg");
for (const size of [192, 512]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}
// Maskable: the glyph needs padding so OS masks don't clip it. Place the icon at 80% on the brand colour.
const pad = Math.round(512 * 0.1);
const inner = await sharp(svg, { density: 384 }).resize(512 - pad * 2, 512 - pad * 2).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#c8402a" } })
  .composite([{ input: inner, top: pad, left: pad }])
  .png()
  .toFile("public/icons/maskable-512.png");
console.log("icons written");
