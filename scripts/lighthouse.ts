/**
 * Lighthouse against a running production build: `npm run build && npx next start -p 3100`, then `npm run perf`.
 * Prints scores and the metrics that matter, once for a phone and once for a desktop. Exits 1 if a score
 * falls under the floors below. Uses the Chrome already installed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const URL_UNDER_TEST = process.env.PERF_URL ?? "http://localhost:3100/";
const FLOOR = { performance: Number(process.env.PERF_MIN ?? 0.6), accessibility: 0.95, "best-practices": 0.9, seo: 0.9 };

type Cat = keyof typeof FLOOR;

async function run(formFactor: "mobile" | "desktop") {
  const chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
  try {
    const result = await lighthouse(
      URL_UNDER_TEST,
      { port: chrome.port, output: "json", logLevel: "error" },
      {
        extends: "lighthouse:default",
        settings: {
          formFactor,
          screenEmulation:
            formFactor === "mobile"
              ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
              : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
          throttlingMethod: "simulate",
        },
      },
    );
    return result!.lhr;
  } finally {
    await chrome.kill();
  }
}

const rows: string[] = [];
let failed = false;
mkdirSync("e2e-report", { recursive: true });

for (const ff of ["mobile", "desktop"] as const) {
  const lhr = await run(ff);
  writeFileSync(`e2e-report/lighthouse-${ff}.json`, JSON.stringify(lhr, null, 1));
  const score = (c: Cat) => lhr.categories[c]?.score ?? 0;
  const audit = (id: string) => lhr.audits[id]?.displayValue ?? "n/a";
  rows.push(
    `${ff.padEnd(8)} perf ${Math.round(score("performance") * 100)}  a11y ${Math.round(score("accessibility") * 100)}  ` +
      `best-practices ${Math.round(score("best-practices") * 100)}  seo ${Math.round(score("seo") * 100)}  | ` +
      `FCP ${audit("first-contentful-paint")}  LCP ${audit("largest-contentful-paint")}  TBT ${audit("total-blocking-time")}  ` +
      `CLS ${audit("cumulative-layout-shift")}  size ${audit("total-byte-weight")}`,
  );
  for (const c of Object.keys(FLOOR) as Cat[]) {
    if (score(c) < FLOOR[c]) {
      failed = true;
      rows.push(`  ✗ ${ff} ${c} ${Math.round(score(c) * 100)} is under ${FLOOR[c] * 100}`);
    }
  }
}

console.log(rows.join("\n"));
process.exit(failed ? 1 : 0);
