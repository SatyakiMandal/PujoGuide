# PujoGuide PRD: next release (v1.1)

Status: draft for review. Written 6 Oct 2026, 11 days before Shashthi (Sat 17 Oct).
Owner: Satyaki. Scope: personal use, single user, phone-first.

---

## 1. Where the product stands

### 1.1 What exists today
| Area | State |
|---|---|
| Map | MapLibre on CARTO tiles, category icons, cluster counts, dark and light themes. Google Maps layer exists but only activates with `NEXT_PUBLIC_GMAPS_KEY`. |
| Data | 314 places: 25 baris, 52 pandals, 237 food. Pins for about 60 baris and pandals verified on Google Maps. Google snapshot (rating, hours, photo, closed flag) dated 5 Oct. Closed places are removed. |
| Explore | Search with aliases, filters (category, zone, cuisine, vibe, open now, minimum rating, pure veg), saved and visited chips, heart bookmarking, place detail with menus and nearby eats. |
| Plan | 30 curated plans, manual route builder, time-aware auto-planner (meals, multi-day, ritual windows, group types), route links to Google Maps, QR sharing, live tour mode (step-by-step stepper), edit-route modal. |
| Quality | 124 unit tests, 210 browser tests across 7 viewports, axe accessibility clean, PWA offline verified. Lighthouse accessibility, best practices and SEO are 100. |

### 1.2 Known gaps (the reason for this PRD)
1. About 10 baris and pandals are still pinned to an area, not the building. Deshbandhu Park is ambiguous.
2. Performance is weak on a throttled phone (Lighthouse about 47, LCP about 8 s, total blocking time over 1 s).
3. All hours, ratings and photos are a one-day snapshot. Festival-week hours differ and nothing tells us what changed.
4. Pandal facts that matter most on the day are thin: theme, opening day, Pushpanjali time, expected queue.
5. The Antigravity features (live tour, edit route, saved and visited, QR share) have no tests of their own.
6. The map has no offline tiles, so a bad signal in a crowd means a blank map.
7. Two tools edit the same repo with no agreed workflow, which already cost us a mixed-up working tree.

### 1.3 Constraints (unchanged)
- No paid API. Google key stays on hold. Anything that needs it must degrade to the free path.
- Bengali UI, road-closure layer, metro timetable and crowd reports were deferred by the user. They stay deferred unless this PRD says otherwise; section 7 lists them with a recommended trigger.
- Vercel deploy and phone testing are the user's.

---

## 2. Goals and non-goals

### Goals
- G1. On the day, the app answers "where do I go next, and is it worth it right now?" in two taps.
- G2. Every pin on the map is the real building or pandal, never an area centre.
- G3. The app is usable on a weak 4G connection and for a short time with none.
- G4. Facts that go stale (hours, closures, ratings) are visibly dated, and refreshing them is one command.
- G5. The new features are covered by tests so parallel development stops breaking things.

### Non-goals for v1.1
- Accounts, login, cloud sync or multi-user features.
- Native app store release.
- Paid APIs, ads or analytics.
- Real-time crowd data from other people.

### Success measures (personal, checked after Dashami)
- Zero pins more than 100 m from the true location among planned stops.
- A full day plan built and followed without opening another map app, apart from the hand-off links.
- Cold load under 3 s on the user's phone over 4G (measured on the Vercel build).
- No console error and no failed e2e run on the release commit.

---

## 3. Priorities and timeline

Priority key: P0 = before Shashthi (17 Oct), P1 = during the Puja, P2 = after.

| # | Feature | Pri | Effort | Section |
|---|---|---|---|---|
| F1 | Pin every pandal and bari exactly | P0 | 0.5 day | 4.1 |
| F2 | Startup performance pass | P0 | 1 day | 4.2 |
| F3 | Pandal facts: theme, opening day, queue and Pushpanjali | P0 | 1.5 days | 4.3 |
| F4 | Test coverage for live tour, edit route, saved and visited, QR | P0 | 1 day | 4.4 |
| F5 | Data refresh pipeline and freshness labels | P0 | 0.5 day | 4.5 |
| F6 | Offline map and "Puja day" mode | P0 | 1.5 days | 4.6 |
| F7 | Smarter live tour (current position, next-stop timing) | P1 | 1 day | 4.7 |
| F8 | Planner improvements (weather, rest, budget, group) | P1 | 1.5 days | 4.8 |
| F9 | Personal data: backup, restore, notes | P1 | 0.5 day | 4.9 |
| F10 | Print and share itinerary | P2 | 0.5 day | 4.10 |
| F11 | Repo hygiene and workflow with Antigravity | P0 | 0.5 day | 4.11 |
| F12 | Deploy readiness checklist | P0 | 0.5 day | 4.12 |
| F13 | Deferred items (Bengali, road closures, metro, crowd reports, Google key) | P2 | see 7 | 7 |

Total P0: about 6.5 working days. With 11 days left that fits, but F6 and F3 are the first to drop if time runs short (see section 8).

---

## 4. Feature specifications

### 4.1 F1: Pin every pandal and bari exactly (P0)

**Problem.** About 10 entries are placed at an area or OSM level. A wrong pin sends the route, the distance estimates and the "nearby eats" list to the wrong place.

**Scope.** Lala Bari, Daw Bari Bandook Wala, Deshbandhu Park, Netaji Sangha, Kasba 14 Pally, Natun Dal, Udichi, AB Block, IB Block and Dover Lane.

**Requirements.**
- R1.1 Each entry gets a Google Maps verified pin in `data/overrides.json` with `src` noting the origin.
- R1.2 Entries with no findable Google listing stay marked `review: true` and show an "approximate location" label in the detail view.
- R1.3 Deshbandhu Park: needs the user's answer (Shyambazar or another). The link supplied earlier resolved to Jharkhand and is unusable.
- R1.4 Netaji Sangha: re-check, since an earlier pass flagged the Google match as a possible mismatch.

**Acceptance.**
- Zero baris and pandals have a pin source of `area`, apart from the ones explicitly labelled approximate.
- A unit test fails if any non-approximate sight has no override or verified source.
- The place detail shows "Approximate location" for the labelled ones, and the route hand-off warns when a stop is approximate.

**Dependency.** User input on Deshbandhu Park and any other link the user can supply.

---

### 4.2 F2: Startup performance pass (P0)

**Problem.** Lighthouse performance is about 47 on a phone profile and 34 on desktop. LCP is about 8 s and total blocking time 1.0 to 1.4 s, mostly from about 2.6 s of script evaluation at startup. The festival crowd means weak signal, so this matters more than usual.

**Requirements.**
- R2.1 Split the places data. Load a light index (slug, name, category, coordinates, zone, a few tags) first, and fetch full details (research notes, menus, hours) when a place is opened.
- R2.2 Render the first screen of the list only (about 20 rows), then add more as the user scrolls.
- R2.3 Load the map after the first paint of the list and panel, which already uses a lazy import. Make sure the placeholder is the same size so layout does not shift (CLS stays under 0.05).
- R2.4 Move heavy modules (QR generator, live tour, edit-route modal, auto-planner) to dynamic imports.
- R2.5 Audit the bundle for libraries that can be removed or replaced with lighter ones.
- R2.6 Cache the data and shell with the service worker so repeat loads do not go to the network.

**Acceptance.**
- Lighthouse phone profile: performance at least 75, LCP under 3.5 s, total blocking time under 300 ms, CLS under 0.05.
- Accessibility, best practices and SEO stay at 100.
- The e2e suite and axe checks still pass on all 7 viewports.
- The `perf` script floor (`PERF_MIN`) is raised from 0.3 to 0.7 so regressions fail.

**Risk.** Splitting data touches search, filter and the planner. Keep one data module as the only entry point, and cover with the existing unit tests.

---

### 4.3 F3: Pandal facts that matter on the day (P0)

**Problem.** A pandal card says where it is but not why to go, when it opens, how bad the queue is, or when Pushpanjali happens. The auto-planner has to guess.

**Requirements.**
- R3.1 New optional fields on baris and pandals: `theme` (short text), `opensOn` (Mahalaya, Panchami, Shashthi, Saptami), `queue` (low, medium, high, extreme), `peakHours` (windows to avoid), `pushpanjali` (per-day start time when known), `sourceNote`.
- R3.2 Research the 2026 themes and opening days for the top 30 pandals from public sources and record the source and date for each. If a fact cannot be confirmed, leave it empty. No guessing and no fabricated themes.
- R3.3 Queue levels follow a documented rule: public reports from previous years plus location, labelled "typical, not live".
- R3.4 The planner uses `opensOn` (do not route to a pandal that is not open yet), `queue` (dwell time) and `peakHours` (avoid, or flag).
- R3.5 The detail view shows theme, opening day, typical queue and best time to visit, each with a freshness date.

**Acceptance.**
- At least 30 pandals have a researched theme and opening day with a source note.
- No place shows a theme or queue without a source.
- Planner test: a pandal opening on Saptami is never scheduled on Shashthi.
- Planner test: a stop with `queue: "extreme"` gets the longest dwell and is flagged.

**Dependency.** Web research. Facts are time-sensitive, so each is dated.

---

### 4.4 F4: Test coverage for the new features (P0)

**Problem.** The live tour, edit-route modal, saved and visited chips, heart bookmarking and QR sharing were added without tests. The last two changes broke existing e2e helpers.

**Requirements.**
- R4.1 Unit tests: saved and visited store actions, the saved and visited filter bypass in `src/lib/filter.ts`, QR payload round trip (encode a route, decode it back), route link encoding and decoding.
- R4.2 E2E tests: heart a place, see it under the Saved chip, reload and confirm it persists; mark visited from the live tour; edit a route (remove, reorder, add) and confirm the schedule recomputes; open the QR modal and check it renders and closes; live tour walks through every stop and finishes.
- R4.3 Accessibility checks on the live tour, edit-route modal and QR modal (focus trap, escape to close, labelled controls).
- R4.4 Clear the 11 unused-import lint warnings.

**Acceptance.**
- New tests pass on all 7 viewports.
- `npm run lint` reports zero warnings.
- Coverage of the new files is at least 70 per cent on statements.

---

### 4.5 F5: Data refresh pipeline and freshness labels (P0)

**Problem.** The Google snapshot was collected by hand through a browser crawler. Hours and closures move around the festival, and there is no single command to refresh.

**Requirements.**
- R5.1 One documented command, `npm run refresh`, that: reads the slug list, queues places older than N days, ingests a new raw snapshot, rebuilds `places.json`, and prints a diff of changes (new closures, hours changes, rating moves of 0.3 or more).
- R5.2 Document the browser-crawler method in the README so it can be rerun (receiver script and fragment transfer already exist).
- R5.3 Every place shows "Checked on <date>" in the detail view. Anything older than 14 days shows a mild "may be out of date" label.
- R5.4 A closure found in a refresh moves the place out of the default list and into a "possibly closed" bucket, not silently deleted. Currently closed places are removed from `places.json`; keep a separate `data/closed.json` so the removal is reversible and reviewable.
- R5.5 Refresh once on 16 Oct (day before Shashthi) and once on 20 Oct.

**Acceptance.**
- `npm run refresh -- --dry` prints a diff and writes nothing.
- A unit test covers the diff logic (closed, reopened, hours changed, rating moved).
- Detail view shows the checked date for every place with Google data.

---

### 4.6 F6: Offline map and "Puja day" mode (P0)

**Problem.** In a crowd the signal drops. The service worker already keeps the app shell and the planned route, but the map tiles do not load offline, so the map goes blank.

**Requirements.**
- R6.1 Cache tiles for the Kolkata bounding box at zooms 11 to 15 in the service worker (about 40 to 60 MB; verify against CARTO terms and the browser quota before shipping). If the tile terms do not allow bulk caching, fall back to caching only tiles the user has viewed.
- R6.2 A "Download map for offline" button in the essentials sheet with progress, size and a delete option.
- R6.3 "Puja day" mode (auto-suggested between 17 and 21 Oct, toggle available any time): a single screen with today's date and festival day, the next ritual, the current plan's next stop with its leg and time, "open now" food nearby, and the Essentials sheet one tap away.
- R6.4 When offline, the UI shows a banner, disables live features (weather, OSRM routing) and falls back to straight-line distances with a label.
- R6.5 Respect storage limits: show how much space the cache uses.

**Acceptance.**
- With the cache downloaded and the network blocked, the map renders at zooms 11 to 15 around central Kolkata, and a saved plan opens with all stops.
- Offline e2e test extended to cover the map canvas and the banner.
- The cache can be cleared from the UI.

**Risk.** Tile provider terms and quota. Confirm before building; this is the first thing to cut if the terms forbid it.

---

### 4.7 F7: Smarter live tour (P1)

**Current.** A stepper: the user moves through stops by hand, can mark visited, and opens a per-leg Google Maps link.

**Requirements.**
- R7.1 "Locate me" (one tap, no continuous tracking, so no battery drain and no standing privacy issue). Show distance and walking time to the next stop from the current position.
- R7.2 If the user is within 100 m of a stop, offer "Arrived" to mark it visited and advance.
- R7.3 If the user is running late versus the schedule by more than 20 minutes, offer "Re-plan the rest of the day", which reruns the auto-planner from the current time and position, keeping visited stops out.
- R7.4 Warn when the next stop's ritual or opening window will be missed at the current pace.
- R7.5 Keep the current stop in view on the lock screen link: the QR and route links already exist; no new service needed.

**Acceptance.**
- Unit test: replanning from a given time and position drops visited stops and respects the same rules as the auto-planner.
- E2E with a mocked geolocation: arrival within 100 m marks visited.
- No geolocation prompt appears until the user taps "Locate me".

---

### 4.8 F8: Planner improvements (P1)

**Requirements.**
- R8.1 Weather: use the existing Open-Meteo data. If rain probability for a block is above 50 per cent, prefer indoor stops (baris, cafes) in that block and show the reason.
- R8.2 Rest breaks: after three hours of walking or four sight stops without a seat, insert a rest or a cafe stop (group profile "elderly" or "kids" shortens that to two hours).
- R8.3 Budget: optional per-head food budget (low, mid, high) that filters meal stops using the price tier already in the food data.
- R8.4 Transport: let the user pick a base mode (walk, cab, metro, mixed). Metro uses the existing OSM station data; no timetable required.
- R8.5 "Why this stop?" tooltip on every planned stop (score parts: distance, rating, theme, ritual fit).
- R8.6 Late-night mode: from 10 pm, prefer open stops, supper places and pandals known for night crowds; show last-metro warnings using a fixed typical last-train time labelled "approximate".

**Acceptance.**
- Unit tests for each rule with a fixed request and seed data.
- Plans still never repeat a stop across days and never schedule a closed place.

---

### 4.9 F9: Personal data: backup, restore, notes (P1)

**Problem.** Saved, visited and routes live in browser storage only. Clearing site data or changing phone loses them.

**Requirements.**
- R9.1 Export to a JSON file and import from it (saved, visited, current route, notes, settings).
- R9.2 Per-place private note (text, local only), shown on the card and in the live tour.
- R9.3 Version the stored data so a later release can migrate it.
- R9.4 Share-by-QR already moves a route between phones; extend the QR or link payload to optionally include saved places.

**Acceptance.**
- Round-trip test: export, clear storage, import, state is identical.
- Import rejects a malformed or foreign file with a clear message and changes nothing.

---

### 4.10 F10: Print and share itinerary (P2)

- R10.1 A print stylesheet and a "Download PDF/print" view of the plan: stops, times, addresses, leg modes, ritual timings and the Google Maps links.
- R10.2 A plain-text version for pasting into a chat.

**Acceptance.** Print preview fits one page per day with legible text and QR codes intact.

---

### 4.11 F11: Repo hygiene and workflow with Antigravity (P0)

**Problem.** Two tools edit the same checkout. One of them committed my uncommitted work under its own message, and `next dev` and `next build` clash over `.next`.

**Requirements.**
- R11.1 Add `CONTRIBUTING.md` (short): one branch per tool or feature, small commits, never commit generated data without running `npm run data` first, run `npm run test:all` before merging to `main`.
- R11.2 Add a CI workflow on GitHub (lint, typecheck, unit tests, build; e2e on pull requests) so `main` cannot go red unnoticed.
- R11.3 Add a pre-push check script (`npm run check`) that runs the same.
- R11.4 Keep `AGENTS.md` and `CLAUDE.md` accurate, including the e2e `NEXT_DIST_DIR` rule and the data rebuild rule.
- R11.5 Protect the data: a test that fails when `data/*.json` and `src/data/places.json` are out of sync.

**Acceptance.** A pull request with a failing test or a stale `places.json` cannot be merged without an override.

---

### 4.12 F12: Deploy readiness checklist (P0, for the user)

Vercel deploy is the user's. This feature is the checklist the app must satisfy first:
- Production build passes (`next build`) with no key set.
- `NEXT_PUBLIC_GMAPS_KEY` is absent and the app shows no Google branding or broken placeholders.
- Manifest, icons and service worker work over HTTPS (installable on Android and iOS).
- Open Graph image and title for link previews.
- A `/` smoke test against the preview URL (a script, `npm run smoke -- <url>`).
- Phone pass on the real device: install to home screen, offline reload, geolocation prompt, QR scan, share link, dark mode, tap targets.

---

## 5. Cross-cutting requirements

- **Accessibility.** WCAG 2.2 AA. Every new screen passes axe on all viewports. Modals trap focus and close on Escape.
- **Performance budget.** Initial JS under 250 KB gzipped, no layout shift above 0.05.
- **Privacy.** Location only on an explicit tap. Nothing leaves the device. No analytics, no third-party scripts beyond the map tiles, OSRM and Open-Meteo.
- **Data honesty.** Every fact has a source and a date. If unknown, say "not confirmed". No invented themes, timings or ratings.
- **Resilience.** Any free service failing (tiles, OSRM, weather) degrades to a labelled fallback, never a blank screen.
- **Browser support.** Current Chrome and Safari on Android and iOS, plus desktop Chrome and Edge.

---

## 6. Test plan for this release

| Layer | Additions |
|---|---|
| Unit | Pandal-fact rules in planner, replan from position, refresh diff, backup round trip, data/places sync, QR round trip |
| E2E | Saved/visited flow, edit route, QR modal, live tour completion, offline map, Puja day mode, backup import |
| Accessibility | New modals and screens on all 7 viewports |
| Performance | Raise `PERF_MIN` to 0.7 and track LCP and TBT per run |
| Manual (user) | Phone install, offline, geolocation, real-world walk of one planned route |

Exit criteria: all of the above pass on the release commit, lint has zero warnings, and the data-sync test is green.

---

## 7. Deferred items, with a recommended trigger

| Item | User decision | Recommended trigger to revisit |
|---|---|---|
| Bengali UI | Not needed now | After Dashami, if the app is shared with family |
| Road-closure and traffic layer | Not now | Only if Kolkata Police publish a machine-readable notice; otherwise add a manual "known closures" list in F3 data |
| Metro special timetable | Not now | When KMRC publishes the Puja-night schedule (usually days before Shashthi); until then F8 uses an approximate last-train label |
| Crowd reports | Possible, not important | After Dashami, if more than one user. For one user, F3 typical queue levels are enough |
| Shared trips and live location | Unsure of value | Not recommended. QR and link sharing already cover phone-to-phone cloning |
| Google key | On hold | When the user decides. Activating it enables live ratings and hours, the Google map layer and traffic-aware routing. The free path stays as the fallback |

---

## 8. Sequencing and what to cut

Days remaining: 11 (6 to 16 Oct) before Shashthi.

| Days | Work |
|---|---|
| 1 (6 to 7 Oct) | F1 pins (after the user's answer on Deshbandhu Park), F11 workflow and CI |
| 2 to 3 | F2 performance pass |
| 4 to 5 | F4 tests for new features, then F5 refresh pipeline |
| 6 to 8 | F3 pandal facts (research-heavy), then F6 offline map and Puja day mode |
| 9 to 10 | F12 deploy checklist with the user, fixes from the first phone pass |
| 11 (16 Oct) | Final data refresh, release commit, freeze |

If time runs short, cut in this order: F6 tile caching (keep Puja day mode), F3 beyond the top 15 pandals, F5 automation (keep freshness labels). Never cut F1, F4 and F12.

P1 and P2 items (F7 to F10) ship during the Puja only if they pass the same test bar; otherwise they wait until after Dashami.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Tile provider forbids bulk caching | No offline map | Cache viewed tiles only; keep the app shell and plan offline |
| Pandal facts unavailable or contradictory | Thin F3 | Leave blank, show "not confirmed", never fill with guesses |
| Parallel edits conflict again | Lost work, broken `main` | F11 branches, CI and a sync test |
| Google snapshot goes stale during the Puja | Wrong open or closed status | F5 refresh on 16 and 20 Oct, freshness labels |
| Performance work breaks search or planner | Regressions | Single data entry point, existing unit and e2e suites as the safety net |
| Public OSRM or Open-Meteo rate limits | Missing routes or weather | Existing fallback to straight-line estimates and cached weather; label it |

---

## 10. Open questions for the user

1. Deshbandhu Park: Shyambazar, or another place? A Kolkata Google Maps link would settle it.
2. Is offline map caching worth the storage (about 50 MB) on your phone?
3. Do you want themes and queue levels shown on the card in the list, or only in the detail view?
4. Which group profiles matter most for the planner (couple, family with elders, friends, solo)?
5. Should closed places live in a separate "possibly closed" file you can review, or stay removed?
6. Any other pandals or cafes you want pinned that are not yet in the list?
