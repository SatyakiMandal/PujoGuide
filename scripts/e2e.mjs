// Builds the app into .next-e2e (so it never clashes with `next dev`), then runs Playwright against it.
// Usage: node scripts/e2e.mjs [playwright args...]   e.g.  node scripts/e2e.mjs --project=phone-light
import { spawnSync } from "node:child_process";

const env = { ...process.env, NEXT_DIST_DIR: ".next-e2e" };
const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit", env, shell: true });

if (!process.env.E2E_SKIP_BUILD) {
  const b = run("npx", ["next", "build"]);
  if (b.status !== 0) process.exit(b.status ?? 1);
}
const t = run("npx", ["playwright", "test", ...process.argv.slice(2)]);
process.exit(t.status ?? 1);
