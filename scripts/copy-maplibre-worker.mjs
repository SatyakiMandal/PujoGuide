// MapLibre 6 ships its web worker as an ES module + shared chunk. Turbopack can't bundle it,
// so serve both from /public/maplibre and point MapLibre at them (see FreeMapCanvas).
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("public/maplibre", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  cpSync(`node_modules/maplibre-gl/dist/${f}`, `public/maplibre/${f}`);
}
