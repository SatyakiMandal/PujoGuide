# PujoGuide — Kolkata Durga Puja Map & Route Planner
### Phase-wise build plan (Next.js + Google Maps Platform, hosted on Vercel)

> Written 5 Oct 2026. Durga Puja 2026 (most sources agree): **Mahalaya Sat 10 Oct · Shashthi Sat 17 Oct · Saptami Sun 18 · Ashtami Mon 19 · Navami Tue 20 · Dashami Wed 21**. One source lists Dashami as the 20th, so confirm against a Bengali panjika before hard-coding dates (they live in one config file anyway).
> That leaves **~12 days before Shashthi**. Section 2 is a fast-track calendar that ships a useful v0.1 on Mahalaya and v1.0 on Shashthi. Everything after Phase 9 is "v1.x / next year".

---

## Build status (updated 5 Oct 2026)

**Decision change: no Google key for now (cost).** The app runs entirely on free, key-less services, and Google Maps stays as an optional drop-in (`NEXT_PUBLIC_GMAPS_KEY`). See [README.md](README.md) for the provider table.

| Plan phase | Status |
|---|---|
| 0 Foundations | Done, except Vercel project/env and CI |
| 1 Data | 27 baris, 54 pandals (32 matched to real OSM places, rest neighbourhood-level), plus **254 food places**: 242 from the user's two Google Maps lists (exact pins) and 12 unverified seed. Nearest metro computed for all. Bengali names, histories and crowd data not started |
| 2 Design system | Done: ivory/charcoal neutrals, sindoor action colour, gold = heritage, teal = food; Phosphor duotone icons; logo; light/dark with circular reveal; fonts |
| 3 Map core | Done on MapLibre (clustering, selection focus, metro overlay, locate). Google variant exists but its route layer is not built |
| 4 Filters | Done (layers, zone, metro, food facets, Highlight/Filter, search) |
| 5 Place details | Detail sheet done (address, your notes, tags, older-list warning). Live ratings/photos/hours need a places source (Google Places would be the paid one). Price and diet are unknown for the user's lists |
| 6 Routing engine | Done with free sources: OSRM geometry, real metro graph from OSM, rough fare models, Puja-night factors. Restricted-zone layer not started |
| 7 Route builder | Done: add/remove, drag reorder, per-leg modes, totals, share link, Google Maps export, saved plan, starter trails |
| 8 Auto-planner | "Optimise order" plus 28 curated plans (area and interest) and a Shashthi-to-Dashami day guide. A true generator with time windows and meal slots: not built |
| 9 PWA, weather, safety | Done: installable offline app, rain forecast, Puja countdown, essentials sheet. Bengali UI deferred by choice |
| 10+ | Restricted-zone map layer (no 2026 notices published yet), crowd reports, accounts: not started |

---

## 0. TL;DR

| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Vercel-native, server route handlers keep the Routes API key private, great mobile perf |
| Styling | **Tailwind CSS v4 + CSS variables (OKLCH tokens) + shadcn/ui (Radix)** | Dark/light via tokens, accessible primitives, no design-system rebuild |
| Motion | **Motion (Framer Motion) + View Transitions API + `vaul` bottom sheet** | Springs, shared-layout transitions, native-feeling mobile sheets |
| Map | **Google Maps JS API via `@vis.gl/react-google-maps`**, Advanced Markers, Cloud-based map styling (Map ID), `@googlemaps/markerclusterer` | Official React wrapper, custom HTML markers, light/dark map styles |
| Routing | **Routes API** (WALK / DRIVE / TRANSIT + route matrix) + **own Kolkata Metro graph** + own fare model + deep links for Uber/Ola/Rapido | Google has no "auto" or "Rapido" mode and no public fare API for them — be honest in the UI ("estimated") |
| Data (MVP) | **Curated static JSON in the repo** (typed with Zod) | No DB needed to launch; ~80 pandals/baris + ~300 food spots; zero runtime geocoding cost |
| Data (later) | **Supabase (Postgres + PostGIS + Realtime)** | Shared trips, crowd reports, live group location |
| State | Zustand (UI/trip) + `nuqs` (URL-synced filters) + TanStack Query (API) | Shareable URLs, instant back/forward |
| Offline | **PWA** (Serwist) + IndexedDB trip store | Phone signal in crowded areas is bad — core data must work offline |
| i18n | **English + Bengali** (`next-intl`) | Many users, especially elders, will want বাংলা |
| Hosting | **Vercel** (functions pinned to `bom1` Mumbai), Vercel Analytics + Speed Insights | |

**Hard truths to design around**
1. **Pandal locations change every year** (and Bonedi Bari locations don't). The data model must treat them differently: Baris are permanent; pandals carry a `year` and a `verified` flag.
2. **Google Maps cost is the main risk** (viral usage during Puja). Budget alerts, quotas, caching, and field masks are Phase 0 tasks, not afterthoughts.
3. **Auto / Rapido / cab prices cannot come from an API** → distance-based estimates with ranges, plus deep links to the real apps.
4. **Puja-time traffic**: Kolkata Police close roads to vehicles around major pandal clusters at night. A normal Directions result will lie. We need a manual, editable "restricted zones + crowd multiplier" layer.
5. **Google Places caching rules**: only `place_id` may be stored indefinitely; ratings/reviews/photos must be fetched live. Our curated fields (cuisine, vibe, notes) are ours to store.

---

## 1. Product scope

### 1.1 Personas
- **Pandal-hopper group (20s–30s)** — wants a route covering max pandals with food breaks, on a phone, at 10pm.
- **Family with elders/kids** — wants fewer stops, less walking, toilets, rickshaw/cab not metro-crush, Bonedi Bari darshan hours.
- **Visitor / NRI** — doesn't know areas, wants "famous + safe + efficient", English UI.
- **Photographer / heritage walker** — wants Rajbari/Bonedi Bari trails, best light, dhunuchi nach timings.

### 1.2 Feature list (P0 = must ship by Shashthi, P1 = during Puja, P2 = later)

**Map & discovery**
- P0 All places on one Google Map, category-coloured custom pins, clustering, smooth camera fly-to
- P0 Filters: Category (Bonedi Bari / Rajbari / Pandal / Cafe / Restaurant / Sweets / Street food), Zone (North, Central, Shobhabazar, Girish Park, MG Road, South, Kalighat, Ballygunge, Jadavpur, Alipore, Kasba, Behala, Bhowanipore, Salt Lake), nearest Metro station, Search
- P0 **Highlight mode vs Filter mode** (highlight = matches pop + others fade to 20%; filter = hide others) — this is what you asked for, so it's a first-class toggle
- P0 Search (English + Bengali + alt spellings: Chorbagan/Jorabagan, Behala/Behela)
- P0 Place detail sheet: photos, history/theme, timings, nearest metro + walk time, crowd tips, "Add to route", "Open in Google Maps", share
- P0 Near-me (geolocation) + "closest to me" sorting
- P1 Favourites, Visited checklist with progress ring ("17/80 pandals — Pandal Explorer 🏅")
- P1 Saptami/Ashtami/Navami-aware info (Sandhi Puja time, Kumari Puja, Dhunuchi Nach at Pathuriaghata ~7pm, Sindoor Khela)

**Food layer**
- P0 Cafes + restaurants within each zone, same map, toggleable
- P0 Filters: Cuisine (Bengali, Mughlai, Chinese/Tangra, Continental, North Indian, South Indian, Biryani, Rolls, Mishti/Sweets, Street food, Cafe/Coffee, Bakery), Vibe (heritage/old-Kolkata, adda, date-night, family, quick bite, rooftop, aesthetic cafe, late-night), Price (₹–₹₹₹₹), Veg/Non-veg/Vegan, Open now / open late, Rating ≥, Distance from route
- P0 "Add food stop near here" action inside the route builder (suggests top 5 food spots within 600 m of the leg)

**Route planning**
- P0 **Manual builder**: add stops from map/search/list, drag-to-reorder, per-leg mode override, start/end point (current location, metro station, custom pin)
- P0 **Modes**: Walk · Metro · Auto/Toto · Cab (Uber/Ola/Rapido-style estimate + deep link) · Bike taxi estimate · "Best" (auto-pick)
- P0 Per-leg time, distance, estimated fare, and step-by-step (including metro line + stations + direction)
- P1 **Auto-planner** ("Plan my night"): date, start time, start place, hours available, interests, pace, mobility, budget, mode preferences → optimised ordered itinerary with food stops
- P1 **Curated trail templates** (editable): North Kolkata Bonedi Trail, Shobhabazar Rajbari Walk, Girish Park Heritage Loop, South Kolkata Pandal Hop, Salt Lake Block Walk, Theme-Pandal Trail, Family-Friendly Evening
- P1 Multi-day split (Saptami / Ashtami / Navami) — clusters stops by area and balances per-day load
- P1 Share route (link + QR + image card), export to Google Maps (multi-stop deep link), `.ics` calendar export, print/PDF
- P2 Collaborative trip (group edits live) and friend live-location

**Puja-specific utilities**
- P0 Metro overlay (lines + stations + last-train notes), station exit → pandal walking hints
- P1 Restricted-zone overlay ("no vehicles after 6pm") + crowd forecast heat layer (curated: day × hour × area)
- P1 Toilets, drinking water, first-aid, police booths, lost-and-found points (curated), emergency numbers, women-safety tips
- P1 Rain nowcast (Open-Meteo, free) + "rain-friendly reorder" (prefer indoor/Bonedi Bari/cafe stops)
- P2 User crowd reports ("moderate wait ~20 min", moderated) feeding the crowd layer

**Platform**
- P0 Light + Dark theme (+ system), map style follows theme
- P0 Responsive: phone bottom-sheet UI, desktop split-pane UI, tablet in between
- P0 English + Bengali
- P1 PWA install + offline data + offline last route
- P1 Analytics (Vercel Analytics), error tracking (Sentry), feedback button

### 1.3 Non-goals (v1)
Ticketing/booking, user accounts (anonymous + local storage until Phase 10), live Metro train positions, turn-by-turn voice navigation (we hand off to Google Maps for that), non-Kolkata cities.

---

## 2. Calendar (fast-track to Shashthi)

| Date | Milestone | Phases |
|---|---|---|
| Mon 5 – Tue 6 Oct | Repo, Google Cloud, Vercel, design tokens, **data cleanup + geocoding script** | 0, 1, 2 (start) |
| Wed 7 – Fri 9 Oct | Map core, markers, filters, highlight mode, detail sheet, dark mode | 2, 3, 4 |
| **Sat 10 Oct (Mahalaya)** | **v0.1 live on Vercel**: browse + filter + detail + dark mode + "open in Google Maps" | — |
| Sun 11 – Tue 13 Oct | Food layer + data enrichment, Routes API engine, metro graph, fare model | 5, 6 |
| Wed 14 – Thu 15 Oct | Route builder UI, auto-planner (basic), share link, export | 7, 8 |
| Fri 16 Oct | PWA/offline, motion polish, a11y/perf pass, QA on real phones | 9, 10 |
| **Sat 17 Oct (Shashthi)** | **v1.0 launch** | 11 |
| 17 – 21 Oct | Hotfixes, crowd layer, curated trails, utilities | 12 |
| After Dashami | Retrospective, accounts, collaborative trips, next-year data pipeline | 13 |

If slippage happens, cut in this order: collaborative trip → crowd reports → rain reorder → multi-day split → image share card. **Never cut**: map, filters, detail sheet, manual route builder, dark mode, mobile layout.

---

## 3. Architecture

```
┌────────────────────────── Vercel (bom1) ───────────────────────────┐
│  Next.js App Router                                                 │
│  ├─ RSC pages (/ , /place/[slug], /trip/[id], /trails/[slug])       │
│  ├─ Client: Map, Filters, Planner (Zustand, Motion)                 │
│  └─ Route Handlers (server, hide server key, cache, rate-limit)     │
│       POST /api/route        → Routes API computeRoutes             │
│       POST /api/matrix       → Routes API computeRouteMatrix        │
│       GET  /api/place/[id]   → Places API (New) Place Details       │
│       POST /api/plan         → optimiser (matrix + TSP + constraints│
│       GET  /api/weather      → Open-Meteo proxy                     │
│  Upstash Redis: rate limit + short-lived response cache             │
└───────┬───────────────────────────────────────────┬────────────────┘
        │ static JSON (build-time)                  │ later
   /data/*.json  (places, metro, trails, zones,     Supabase (Postgres+PostGIS,
   fares, restricted zones, events)                 Realtime) — trips, reports
```

### 3.1 Google Maps Platform APIs
| API | Used for | Where |
|---|---|---|
| Maps JavaScript API | Map, Advanced Markers, polylines, clustering | Browser (referrer-restricted key) |
| Places API (New) | Autocomplete for custom start/end, live Place Details (rating, hours, photos) | Browser autocomplete w/ session tokens; details via server |
| Routes API | `computeRoutes` (WALK, DRIVE, TRANSIT), `computeRouteMatrix` | Server only (separate key) |
| Geocoding API | One-off resolution of seed list → lat/lng + `place_id` | Build-time script only |

> Verify current SKU pricing and the free monthly caps on the official pricing page at build time (Google moved from a flat $200 credit to per-SKU free caps in March 2025). Do not rely on this document for numbers.

### 3.2 Repo layout
```
pujoguide/
├─ app/
│  ├─ [locale]/(shell)/layout.tsx          # app shell, theme, providers
│  ├─ [locale]/(shell)/page.tsx            # map home
│  ├─ [locale]/(shell)/place/[slug]/       # deep-linkable place (intercepted as sheet)
│  ├─ [locale]/(shell)/plan/               # planner
│  ├─ [locale]/(shell)/trails/
│  └─ api/{route,matrix,place,plan,weather}/route.ts
├─ components/
│  ├─ map/        (MapCanvas, PlaceMarker, ClusterLayer, RouteLayer, MetroLayer, UserLocation)
│  ├─ filters/    (FilterBar, FacetChips, ZonePicker, CuisineMenu, ModeToggle)
│  ├─ place/      (PlaceCard, PlaceSheet, PlaceGallery, CrowdMeter)
│  ├─ planner/    (StopList, LegCard, ModePicker, Timeline, AutoPlanForm, FoodSuggest)
│  ├─ ui/         (shadcn primitives, BottomSheet, Chip, Skeleton, ThemeToggle)
│  └─ motion/     (variants, springs, transitions)
├─ lib/
│  ├─ data/       (loaders + Zod schemas)
│  ├─ routing/    (modes, metro-graph, fares, crowd-model, optimiser, polyline)
│  ├─ google/     (maps loader, routes client, places client)
│  └─ geo/        (haversine, bbox, clustering helpers)
├─ data/          (places.json, food.json, metro.json, trails.json, zones.json, events.json, fares.json, restricted.json)
├─ scripts/       (clean-seed.ts, geocode.ts, enrich-food.ts, validate-data.ts)
├─ messages/{en,bn}.json
├─ tests/ (unit, e2e, fixtures)
└─ PLAN.md
```

### 3.3 Core data model (Zod → TS types)
```ts
type Category = 'bonedi_bari' | 'rajbari' | 'pandal' | 'cafe' | 'restaurant' | 'sweets' | 'street_food' | 'utility';

interface Place {
  id: string; slug: string;
  category: Category;
  name: { en: string; bn?: string }; aliases: string[];   // "Chorbagan" "Jorabagan" "চোরবাগান"
  zones: ZoneId[];                 // multi-valued: Deshapriya Park is both Kalighat & South
  primaryZone: ZoneId;
  lat: number; lng: number; googlePlaceId?: string;
  coordConfidence: 'verified' | 'geocoded' | 'approx';
  metro: { stationId: string; walkMin: number; exit?: string }[];
  year?: number;                   // pandals only; baris are permanent
  theme?: string; artist?: string; // pandals
  established?: number; story?: string; // baris
  timings?: { day: string; open: string; close: string }[]; bestTime?: string;
  crowd: Record<'sasthi'|'saptami'|'ashtami'|'navami'|'dashami', 1|2|3|4|5>;
  amenities: ('toilet'|'water'|'wheelchair'|'seating'|'police_booth')[];
  tags: string[]; sourceNotes?: string; verified: boolean; updatedAt: string;
}
interface FoodPlace extends Omit<Place,'crowd'|'year'|'theme'|'artist'> {
  cuisines: Cuisine[]; vibes: Vibe[]; priceLevel: 1|2|3|4; diet: ('veg'|'nonveg'|'vegan')[];
  signature: string[]; hours?: ...; openLate: boolean; nearestPlaceIds: string[];
}
```
Rule: **`lat/lng` are our own verified values** (checked on the map in Phase 1). Ratings, review counts, photos and live opening hours are fetched at runtime via Place Details and never persisted.

---

## 4. Phases

Effort is in focused person-days for a single developer working with an AI pair. Each phase lists **tasks → deliverables → acceptance criteria**.

---

### Phase 0 — Foundations & guard-rails (0.5–1 day)

**Tasks**
- [ ] `pnpm create next-app` (TS, App Router, Tailwind, ESLint), add Prettier, Husky + lint-staged, `tsconfig` strict
- [ ] Install: `@vis.gl/react-google-maps`, `@googlemaps/markerclusterer`, `motion`, `vaul`, `zustand`, `nuqs`, `@tanstack/react-query`, `zod`, `next-intl`, `lucide-react`, `minisearch`, `lz-string`, `@upstash/ratelimit`, `@upstash/redis`, `serwist`, `vitest`, `playwright`, `@axe-core/playwright`
- [ ] **Google Cloud project + billing account**; enable Maps JavaScript, Places (New), Routes, Geocoding
- [ ] **Two API keys**
  - *Browser key*: HTTP-referrer restricted (`localhost:3000/*`, `*.vercel.app/*`, prod domain), API-restricted to Maps JS + Places (New)
  - *Server key*: API-restricted to Routes + Places (New) + Geocoding; used only in route handlers (Vercel IPs are dynamic so IP-restriction isn't practical — rely on API restriction + rate limiting + budget caps)
- [ ] **Budget alerts at 50/80/100 %** and **per-API daily quota caps** in GCP (prevents a viral-weekend surprise bill)
- [ ] Create **Map IDs**: `pujoguide-light`, `pujoguide-dark` (vector, Advanced Markers enabled). Style in Cloud Console: mute POIs, soften roads, emphasise metro/transit, hide irrelevant POIs so our pins stand out
- [ ] Vercel project, env vars (`NEXT_PUBLIC_GMAPS_KEY`, `GMAPS_SERVER_KEY`, `NEXT_PUBLIC_MAP_ID_LIGHT/DARK`, `UPSTASH_*`), set `preferredRegion = 'bom1'` for API routes
- [ ] CI: GitHub Actions (typecheck, lint, vitest, playwright smoke), Vercel preview per PR

**Deliverables:** deployed "Hello map" on a Vercel preview URL with the Google map rendering.
**Acceptance:** keys don't appear in the server key's bundle (`grep` build output); budget alerts exist; Lighthouse CI wired.

---

### Phase 1 — Data: clean, geocode, verify, enrich (2 days) ⬅ most important phase

The app is only as good as this data. The pasted list needs cleanup first.

**1.1 Clean the seed list** (`scripts/clean-seed.ts` + manual review)
Known issues spotted in your list:
- **Duplicates across sections** → merge into one record with multiple `zones`: Ekdalia Evergreen, Suruchi Sangha, Tridhara Sammilani (spelled "Sammalani" too), Ballygunge Cultural, Singhi Park, Deshapriya Park, Mudiali Park/Club, Maddox Square, 66 Pally; Badan Chand Roy Bari appears twice (header + "Central, Kolutolla Rajbari")
- **Spelling variants** → canonical name + `aliases`: Behela/Behala, Pari/Bari, "Shovabazar Rajaj" (Rajbari), "Jora sankho" (Jorasanko), Chorbagan/Jorabagan, Sobhabajar/Shovabazar/Shobhabazar
- **Mixed concepts in "zones"**: some groups are neighbourhoods (Kalighat), some are metro-station clusters (Jatin Das Park, Sector 5), some are broad (South Kolkata). Normalise into `zones` (neighbourhood) + `metro` (nearest station) + `region` (North/Central/South/Salt Lake/Howrah-side)
- Ambiguous: **Alipore Sarbojanin** vs **Alipore 78 Pally / Deshbandhu Park / Netaji Sangha** — decide if same; **Mudiali Park vs Mudiali Club**; **64 vs 66 vs 68 Pally** are distinct but easy to mix up
- After de-dupe expect roughly **27 Bonedi Baris/Rajbaris** and **~54 pandals** (≈81 places) — confirm in script output

**1.2 Taxonomy**
- Categories (above) with sub-tags: `rajbari`, `thakur_dalan`, `dhunuchi_nach`, `kumari_puja`, `theme_pandal`, `sarbojanin`, `club`
- Regions → Zones → (optional) Clusters. Clusters are walkable groupings (e.g., "Shobhabazar cluster" = 5 places within ~1.2 km) used later for itinerary splitting
- Metro stations master list with line, coordinates, interchange flags, exits

**1.3 Geocode + verify** (`scripts/geocode.ts`)
- Geocoding API / Places Text Search (New) with query `"{name} Kolkata"` → candidate + `place_id`
- Output a **review sheet** (CSV/HTML map) showing each candidate on a map with confidence; you or a local friend fixes the wrong ones. Pandals especially often won't resolve (they're temporary) → mark `coordConfidence: 'approx'` and place by nearest landmark/street
- Never ship a pin you haven't eyeballed on the map

**1.4 Enrich places** (manual + LLM-assisted, human-reviewed)
- Write 2–3 line description, history (Baris: founding year, family, special ritual, darshan hours), `bestTime`, crowd 1–5 per day, amenities
- Per place: nearest metro + walking minutes (computed with Routes API WALK once, stored)
- Events table `events.json`: Sandhi Puja timing (Ashtami), Kumari Puja, Dhunuchi Nach (e.g., Pathuriaghata Rajbari ~7pm), Sindoor Khela, Bhog timings

**1.5 Food seed** (`scripts/enrich-food.ts`)
- For each zone centroid + each Bonedi Bari/pandal cluster, run **Nearby/Text Search (New)** for `restaurant|cafe|bakery|sweets` within ~1.2 km; keep `rating ≥ 4.0` and `userRatingCount ≥ 150`
- Classify cuisine/vibe using Places `primaryType`, `servesBreakfast…`, `priceLevel`, `outdoorSeating`, `goodForGroups` + an LLM pass (Claude API, batch) over name + editorial summary → **human review pass** (non-negotiable)
- Hand-add iconic Kolkata institutions the API might rank oddly (candidates to verify, not facts): Indian Coffee House (College Street), Flurys & Peter Cat (Park Street), Nizam's (rolls), Aminia / Royal Indian Hotel (Mughlai), 6 Ballygunge Place & Bhojohori Manna (Bengali), famous mishti shops, local phuchka/street-food clusters near each zone
- Target: **8–15 good food spots per zone**, ≥ 250 total

**1.6 Validation** (`scripts/validate-data.ts`, runs in CI)
- Zod schema, unique slugs, coords inside Kolkata bbox, no two places < 15 m apart unless intentionally, every place has ≥ 1 metro/transport hint, Bengali name present for all P0 places

**Deliverables:** `data/*.json` (validated), review CSV, `docs/data-dictionary.md`
**Acceptance:** 100 % of places have verified-on-map coordinates; validator green in CI; sample 10 random places spot-checked against reality.

---

### Phase 2 — Design system, brand, theming (1.5 days, overlaps Phase 3)

**2.1 Brand direction — "Pujo Utsav"**: warm, festive, lamp-lit. Not generic map-app grey.
- Motifs: Lal-Paar (red-border white saree), alpona patterns as subtle section dividers, sindoor red, genda-marigold gold, dhak/shiuli whites, festive string-light glow in dark mode
- Logo: simple wordmark "PujoGuide" with a pin/dhunuchi-flame glyph; SVG, works at 16 px favicon

**2.2 Colour tokens** (OKLCH in CSS variables, Tailwind v4 `@theme`). Starting values (tune visually, then validate contrast):

| Token | Light "Shiuli" | Dark "Raat" |
|---|---|---|
| `--bg` | `#FFF8F0` warm alpona white | `#0E0A14` ink-indigo |
| `--surface` | `#FFFFFF` | `#18121F` |
| `--surface-2` | `#FFF0E0` | `#241B2E` |
| `--text` | `#2A1A14` | `#F6EDE4` |
| `--muted` | `#7A6558` | `#A99BB5` |
| `--primary` (Sindoor) | `#D4261C` | `#FF5A4D` |
| `--accent` (Genda gold) | `#E8A317` | `#FFC24B` |
| `--info` (transit indigo) | `#2B3A8C` | `#8FA2FF` |
| `--success` | `#1F8A4C` | `#4ADE80` |
| border/ring | warm 12 % alpha | white 10 % alpha |

Category colours (pins, chips, legend) — distinct also for colour-blind users, and **always paired with a unique glyph**, never colour alone:
`Bonedi Bari` gold + 🏛 pillar glyph · `Pandal` sindoor red + shrine/trishul glyph · `Rajbari` deep maroon + crown · `Cafe` teal + cup · `Restaurant` terracotta + fork/knife · `Sweets` pink + sweet · `Street food` orange + flame · `Metro` official line colours · `Utility` slate + drop/cross.
Transport-mode colours: Walk (green-grey), Metro (line colour), Auto (amber), Cab (charcoal/yellow), Bike (violet).

**2.3 Typography (via `next/font`, self-hosted)**
- **Display / headings:** *Fraunces* (soft, warm serif; variable, optical size) — festive without kitsch
- **UI/body:** *Plus Jakarta Sans* (clean, friendly, great numerals) — fallback *Inter*
- **Bengali:** *Hind Siliguri* (UI) + *Noto Serif Bengali* (display) with `bengali` subset; set `font-feature-settings` and slightly larger line-height (1.6) for Bengali
- Fluid type scale with `clamp()`, tabular numerals for times/fares, 16 px minimum body on mobile

**2.4 Iconography**
- **Lucide** for UI chrome; **custom SVG sprite** for map pins/category glyphs (consistent 24-px grid, 2 px stroke, rounded)
- Pin = teardrop with glyph, white ring, soft shadow; **selected** pin scales 1.25 + pulse ring; **dimmed** pin 25 % opacity + grayscale (highlight mode); **visited** pin gets check badge

**2.5 Spacing, radius, elevation, density**
- 4-pt grid; radii 12/16/24; elevations: 3 levels, in dark mode use border + glow rather than shadow
- Safe-area insets (`env(safe-area-inset-*)`), 44×44 px minimum tap targets, thumb-zone-first on mobile (primary actions at bottom)

**2.6 Theming mechanics**
- `next-themes` (`light | dark | system`), no flash (inline script), CSS variables swap
- **Map swaps with theme**: use Map ID with `colorScheme` (LIGHT/DARK) if cloud styling supports it for the chosen Map ID; otherwise keep two Map IDs and re-mount the map smoothly (cross-fade). Spike this on Day 1 (it's a known fiddly bit) — verify against current Maps JS docs
- Theme toggle uses **View Transitions API circular reveal** from the toggle button; graceful fallback to a 200 ms cross-fade

**2.7 Motion language** (documented in `components/motion/tokens.ts`)
| Use | Spec |
|---|---|
| Micro (hover, press, chip toggle) | 120–160 ms, `ease-out`, scale 0.97 on press |
| Standard (panels, menus) | 240 ms, `cubic-bezier(.2,.8,.2,1)` |
| Emphasis (sheet, route draw) | spring `{stiffness: 380, damping: 32, mass: 0.9}` |
| Map camera | animated `moveCamera` with ease-in-out, 600–900 ms, fit-bounds with padding for sheet |
| Lists | `layout` animations + `AnimatePresence` + 30 ms stagger |
| Route polyline | progressive "draw" along the path (requestAnimationFrame) 700 ms |
| Page/route changes | shared-element transition (card → detail sheet) |
| Always | honour `prefers-reduced-motion` (swap to opacity-only), 60 fps budget, animate only `transform/opacity` |

**2.8 Layout system**
- **Mobile (<768 px):** full-bleed map; floating search + filter chips on top; **bottom sheet with 3 snap points** (peek 96 px / half / full) via `vaul`; bottom tab bar: *Explore · Food · Plan · Saved*; FAB for "near me"
- **Tablet (768–1100):** side drawer 360 px over map
- **Desktop (>1100):** 3-column: left filter/list rail (400 px, collapsible), centre map, right context panel (details / route timeline); `⌘/Ctrl+K` command palette; keyboard shortcuts (`/` search, `F` filters, `P` plan, `D` dark)

**Deliverables:** Storybook-lite `/design` route (tokens, components, states, light/dark), Figma-less is fine — use this route as the source of truth
**Acceptance:** all text ≥ 4.5:1 contrast in both themes (axe), tokens only (no hard-coded hex in components), theme switch has no flash.

---

### Phase 3 — Map core (2 days)

**Tasks**
- [ ] `<MapCanvas>` using `APIProvider` + `Map` with `mapId`, restricted to Kolkata bounds (`restriction`), min/max zoom, gesture handling `greedy` on mobile, disable default UI clutter, custom zoom/recenter controls (so they match the design system)
- [ ] `<PlaceMarker>` as **AdvancedMarker** with React children (our SVG pin) — memoised; marker state variants: default / hover / selected / dimmed / visited / in-route (shows stop number badge)
- [ ] **Clustering** with `MarkerClusterer` using a custom renderer (brand-styled cluster bubbles with category colour ring and count); un-cluster animation on zoom
- [ ] **Zoom-aware layers** (perf): zoom <12 → clusters only; 12–14 → pandals/baris; ≥14 → food markers appear (fade-in) and only those inside the viewport are rendered
- [ ] Camera helpers: `flyTo(place)`, `fitToPlaces(places, padding)` that accounts for the bottom-sheet/side-panel offset so pins aren't hidden behind UI
- [ ] Layers: Metro lines + stations (polylines in official colours + station dots with names ≥ zoom 13), toggle in a layer control; Restricted zones (polygons, hatched) — empty for now
- [ ] User location: blue dot + accuracy circle + "recenter" FAB; permission-denied graceful fallback
- [ ] Hover (desktop) → mini card tooltip; tap (mobile) → peek sheet; second tap → full sheet
- [ ] URL state: `?lat&lng&z&sel=slug` so map position and selected place are shareable

**Performance rules:** one map instance, never re-created on route change; marker components don't re-render on camera move; batch updates; throttled `idle` handlers.
**Acceptance:** 60 fps pan/zoom on a mid-range Android with ~400 markers; selecting a place flies camera in <900 ms without jank; keyboard accessible markers (focusable, `aria-label`).

---

### Phase 4 — Filters, highlight mode, search (2 days)

**Tasks**
- [ ] **Facet model** (`lib/filters`): pure function `applyFilters(places, state) → {matched:Set, counts}`; facets: category, zone/region, metro station (+ "within N min walk"), year/theme, crowd level, open-now, amenities, visited/unvisited, in-route; **food facets**: cuisine, vibe, price, diet, rating, open-late
- [ ] **Highlight ⇄ Filter toggle**: *Highlight* animates non-matches to dimmed state (opacity .2, grayscale, smaller scale, `pointer-events` kept so they remain tappable) and matches get a gentle "pop" + subtle glow; *Filter* fades them out and unmounts after the transition. Persist preference
- [ ] **Filter UI**
  - Mobile: horizontally scrollable **chip rail** under search (Category · Zone · Metro · Food · More) → opens a bottom sheet with groups; live result count on the CTA ("Show 23 places")
  - Desktop: collapsible left rail with facet groups, counts, "clear all", active-filter pills
  - Zone picker doubles as **map region selector** — tapping a zone chip draws its polygon/bounds, fits the camera, and highlights members
  - Counts update live and disabled facets are shown (not hidden) with 0 count
- [ ] **Smart search** (MiniSearch, client-side): English, Bengali, aliases, transliteration, fuzzy; groups results (Places · Zones · Metro · Food · "Near X"); recent searches; keyboard nav; `⌘K` palette on desktop
- [ ] **Sorting/list view**: toggle Map ⇄ List ⇄ Split; list cards animate with shared layout to the map pin; sort by nearest / popularity / crowd (lowest first) / A–Z
- [ ] Filters serialised to URL with `nuqs` (shareable "North Kolkata Bonedi Baris" link)
- [ ] Empty states with helpful suggestions ("No vegan Bengali spots within 1 km — try widening distance")

**Acceptance:** any filter combo responds <50 ms for ~400 items; URL round-trips filter state exactly; screen-reader announces "23 places shown".

---

### Phase 5 — Place details, food layer, local utilities (2 days)

**Tasks**
- [ ] **Place sheet/panel**: hero gallery (swipe, lazy), name (EN + বাংলা), badges (category, zone, crowd, "Open now"), quick actions row (Add to route · Directions · Save · Share · Visited), tabs: *Overview · Plan your visit · Nearby · Reviews*
  - *Overview*: story/theme, ritual timings (Sandhi Puja etc.), best time, amenities
  - *Plan your visit*: nearest metro + exit + walk time, parking/no-vehicle note, crowd by day (mini bar chart), "go at" recommendation
  - *Nearby*: next 3 pandals/baris within walking distance, top food within 500 m (one-tap "add as stop")
- [ ] **Live Place Details** via `/api/place/[id]` (field-masked: rating, count, open-now, hours, photos) → cached 12 h in Redis → rendered with Google attribution (required)
- [ ] Food cards with cuisine/vibe chips, price glyphs (₹ scale), diet icons, signature dishes, "open late" badge
- [ ] **Utilities layer**: toilets, water, first-aid, police booths, lost & found — curated points; toggle under Layers; safety tips + emergency numbers screen
- [ ] **Favourites + Visited** (local storage → IndexedDB), progress ring on Saved tab, confetti micro-interaction on milestones (reduced-motion safe)
- [ ] **Share place**: Web Share API → fallback copy link; OG image generated (`@vercel/og`) with place name + category + theme colours
- [ ] Per-place SEO pages (`/place/[slug]`) with structured data → helps organic discovery during Puja

**Acceptance:** place sheet opens <150 ms (from static data), live data fills in without layout shift (skeletons), all external-data fields attributed.

---

### Phase 6 — Routing engine (3 days) ⬅ the hardest phase

Build as a **pure, testable library** (`lib/routing`) with the UI as a thin client.

**6.1 Leg model**
```ts
type Mode = 'walk' | 'metro' | 'auto' | 'cab' | 'bike' | 'bus';
interface LegOption { mode: Mode; durationSec: number; distanceM: number; fare: {min:number; max:number}; steps: Step[]; polyline: string; confidence: 'google'|'model'; notes?: string[]; }
interface Leg { from: Stop; to: Stop; options: LegOption[]; chosen: Mode; userOverride: boolean; }
```

**6.2 How each mode is computed**
| Mode | Source | Notes |
|---|---|---|
| **Walk** | Routes API `WALK` | Apply a **crowd-walk penalty** (×1.3–1.8 in cluster areas at night) from the crowd model; flag walks > 1.5 km or at night as "tiring/unsafe-ish" for family profile |
| **Metro** | Routes API `TRANSIT` (restrict `transitPreferences.allowedTravelModes = [SUBWAY]`) **and** our own metro graph | Own graph (`data/metro.json`: stations, lines, interchanges, avg inter-station time, first/last train, fare slabs) is the fallback when Google lacks newer sections (Orange/Yellow lines are partially open — verify current status at build time, it has been changing) and the source for **fare, last-train warnings, and exit guidance**. Metro leg = walk→station + ride + walk→dest, stitched |
| **Auto / Toto** | Routes API `DRIVE` geometry (no traffic) × auto-speed factor | Fare = base + per-km, configurable ranges in `fares.json`; also flag "shared route autos" for known corridors. Show as **range**, labelled "estimate" |
| **Cab (app)** | Routes API `DRIVE` with `TRAFFIC_AWARE` (+ future departure time for Puja night) | Fare range model with surge multiplier by day/hour (config); deep links to Uber / Ola / Rapido. **Don't claim live prices.** Verify current deep-link formats at build time; if an app has no official deep link, open the app/Play-Store fallback |
| **Bike taxi** | Same as cab geometry, cheaper range | Not allowed/available in some areas — show as optional |
| **Bus** | Routes API `TRANSIT` (BUS) | Low priority, only offered when Google returns it |

**6.3 The Puja reality layer** (this is what makes it actually useful)
- `restricted.json`: polygons + time windows where vehicles (cab/auto) are barred or slowed (e.g., major North Kolkata & Central cluster at night; Park Street, Esplanade, etc.). Seed from Kolkata Police advisories each year (**manual, dated, source-linked**). Engine rules: if a cab/auto leg ends *inside* a restricted zone in the window → shorten to a **drop-off point on the boundary + walk** (computed), and show a banner "Cabs can't enter after 6 pm — drop at X, walk 9 min"
- `crowd-model.ts`: multiplier = f(day, hour, zone) for walk/transport times and per-stop **queue time** (e.g., Ashtami 9pm in North Kolkata = ×2). Seeded from the curated crowd table, tunable
- Metro: **late-night Puja service** (the Metro often extends services during Puja — treat as a dated config value, verify yearly), crowd-aware "avoid Esplanade/Central interchange at 10pm" advisory
- Time-of-day dwell: pandal queue 10–45 min by crowd; Bonedi Bari 20–40 min incl. darshan hours; cafe 45 min; restaurant 60–75 min — configurable per profile

**6.4 API route handlers**
- `POST /api/route` → body `{from, to, mode, departureTime}` → Routes API with **field masks** (only what we render) → cache key `hash(from,to,mode,hourBucket)` for 15 min → Zod-validate in/out → rate limit 30 req/min/IP
- `POST /api/matrix` → up to N×N for optimiser (cap N=20 → 400 elements; use only DRIVE/WALK; reuse for all modes via scaling) — **cache matrices per place-set** because the Bari/pandal set is static; for pairs among the fixed ~80 places, **precompute a walk+drive matrix offline** (script) and ship it as a compressed JSON → near-zero runtime cost for the common case, API only for custom start/end points
- Polyline decoding client-side; leg-level `AbortController`, retry with backoff, graceful degradation: if Routes API fails → straight-line + model estimate marked "approx"

**6.5 Testing**: golden fixtures (recorded Routes API responses), property tests on fare model monotonicity, unit tests for restricted-zone logic and metro stitching.

**Acceptance:** for 20 hand-picked A→B pairs, computed times are within ±25 % of what Google Maps shows by hand; the restricted-zone rule triggers correctly on test cases; every mode gracefully degrades.

---

### Phase 7 — Route builder UI (3 days)

**Tasks**
- [ ] **Stop list** (left panel / bottom sheet "Plan" tab): drag-to-reorder (`@dnd-kit` + Motion layout), swipe-to-remove on mobile, long-press to reorder, inline start/end editing (current location, any place, metro station, custom pin with Places Autocomplete using session tokens)
- [ ] **Add stops** from: map pin tap, search, list, "nearby suggestions", curated trails; map pins show their stop number; adding animates the pin into the list (shared layout)
- [ ] **Leg cards** between stops: mode icon, time, distance, fare range, mini timeline of steps (Walk 6 min → *Kalighat* → Blue Line toward Dakshineswar · 8 stops → *Girish Park* → Walk 4 min); tap to expand; **mode segmented control** per leg (Auto-pick · Walk · Metro · Auto · Cab · Bike) — changing mode animates the polyline morph & updates totals; pinned-by-user badge
- [ ] **Global preferences**: preferred modes, max walk per leg, budget cap, avoid-crowd, pace (relaxed/normal/hustle), group type (solo/friends/family/elders/kids)
- [ ] **Timeline view**: vertical schedule with ETAs, dwell times, meal slots, warnings (last metro, Bari closes at 9 pm, Sandhi Puja at 10:27 — "arrive before"), total cost + total time + walking distance. Editing start time re-flows everything
- [ ] **Map route layer**: per-leg coloured polylines (mode colour; dashed for walk), animated draw on creation, direction chevrons, current-leg highlight, start/end markers, hover leg card ↔ highlight on map (and vice versa), `fitBounds` with panel padding
- [ ] **Food-stop suggestions**: between any two stops show "☕ 3 great options within 500 m of this leg" → one-tap insert, auto re-routes
- [ ] **What-if sheet**: "Compare plans" (Fastest / Cheapest / Least walking / Most scenic) as swipeable cards
- [ ] **Persistence**: autosave to IndexedDB, multiple saved trips, undo/redo (zustand + history), duplicate trip
- [ ] **Share/export**: link (state compressed into URL with `lz-string` — no backend needed), QR code, "Open in Google Maps" (multi-stop URL; chunk when > 9 waypoints), `.ics`, print-friendly PDF itinerary, share image card
- [ ] Empty state with 3 starter trails to remix

**Acceptance:** build a 10-stop route end-to-end on a phone in < 90 s; reorder/mode change feels instant (optimistic UI, skeleton for the leg being recomputed only); undo works.

---

### Phase 8 — Auto-planner & optimiser (2 days)

**Inputs (form as a 4-step wizard w/ animated progress):** date(s) (Saptami/Ashtami/Navami/custom), start time, end time/hard stop, start place, group profile, interests (Bonedi Baris / Pandals / Theme pandals / Food / Heritage), region preference or "surprise me", pace, mode prefs, budget, must-include stops, must-avoid.

**Algorithm**
1. **Candidate set** = places matching interests/region, scored: `score = popularity + userInterest + themeBoost − crowdPenalty(day,hour) − detourPenalty`
2. **Time budget** → stop count estimate from dwell + average leg time
3. **Cluster** candidates geographically (k-means / DBSCAN on lat-lng; or use predefined clusters) → pick the best cluster(s) per day (multi-day split balances load; avoid revisiting)
4. **Ordering**: solve open-path **TSP-with-time-windows** on the precomputed matrix: nearest-neighbour seed + **2-opt/Or-opt** local search (n ≤ 15 → instant in a **Web Worker**); constraints: Bari darshan windows, Sandhi Puja time anchors, metro last train, restricted-zone drop-offs, lunch/dinner windows
5. **Insert food**: at meal windows pick the top-scored food place within ~500 m of the current position matching diet/vibe/budget; add a chai/sweets micro-stop on long walks
6. **Mode selection per leg**: choose by profile + distance + crowd (walk < 1 km, metro for long N–S hops when station pair is good, cab for elders/late-night or restricted-area drop-off, auto for mid-range) — all overridable
7. **Explainability**: each decision carries a one-line "why" ("Metro here saves ~25 min vs cab on Ashtami night") shown in the UI → builds trust
8. **Re-plan** button: "I'm running late / rain started / skip this stop" re-optimises remaining stops from current location + time

**Alternative (optional, P2):** Google **Route Optimization API** for server-side solve — costlier and heavier than needed; keep local optimiser unless quality is insufficient.

**Acceptance:** 5 benchmark scenarios produce plausible itineraries judged by a local (you); optimiser < 300 ms for 15 stops; plan is deterministic for same inputs (seeded).

---

### Phase 9 — PWA, offline, i18n, extras (2 days)

- [ ] **PWA** (Serwist): manifest, maskable icons, splash, install prompt after 2nd visit (custom, animated), offline shell, cache `data/*.json` + metro graph + icons + fonts, **map tiles can't be cached offline (Google ToS)** → offline mode shows list view + saved trip + a static metro diagram + "Open in Google Maps" fallback
- [ ] **Bengali UI** (`next-intl`, `/bn`), language switcher with animated flip; Bengali numerals optional toggle; all place names bilingual
- [ ] **Weather**: Open-Meteo hourly rain probability widget on the plan; "rain-friendly reorder"
- [ ] **Metro helper**: next/last train notes per line (config), station exit guide
- [ ] **Safety & utilities screen**: emergency numbers, women's helpline, nearest police/first-aid, crowd-safety tips, "share my live trip with family" (Web Share of link)
- [ ] **Accessibility**: WCAG 2.2 AA, focus management on sheets, `aria-live` for filter counts, map alternative = list view, large-text mode, high-contrast token set
- [ ] **Visited stamps/gamification**: stamp-book view, badges (North Kolkata Complete, All Bonedi Baris, Night Owl), shareable card

---

### Phase 10 — Motion & UX polish pass (1.5 days)

Checklist of the "extremely smooth" bar:
- [ ] Skeletons for every async surface; no layout shift (CLS < 0.05)
- [ ] Marker enter/exit stagger by distance from viewport centre; hover → press feedback everywhere
- [ ] Sheet physics: velocity-aware snapping, rubber-band overscroll, scroll-lock handoff between sheet and list
- [ ] Shared-element transitions: list card ⇄ map pin ⇄ detail hero
- [ ] Filter changes animate pin states (not pop in/out); counts tick with number-flow animation
- [ ] Route draw animation, stop-number badge pop, mode-switch polyline morph
- [ ] Theme switch circular reveal; map style cross-fade
- [ ] Haptics on mobile where supported (`navigator.vibrate`) for add-to-route/snap points
- [ ] Optimistic UI + toasts with undo
- [ ] Micro-copy pass (friendly, Bengali-flavoured: "Chol, ghure ashi!"), error + empty states illustrated with alpona-style SVGs
- [ ] Loading splash: dhak-beat / lamp-flicker animation < 1 s, skipped on repeat visits
- [ ] Test at 4× CPU throttle + Slow 4G

**Performance budgets:** LCP < 2.0 s on 4G mid-range Android, INP < 200 ms, initial JS < 180 KB gz (map SDK lazy, route/planner code-split, dnd + QR + confetti dynamically imported), images AVIF/WebP with blur placeholders, fonts `display: swap` + preload subset.

---

### Phase 11 — QA, hardening, launch (1.5 days)

**Testing matrix**
- Unit (Vitest): filters, fares, metro stitching, crowd model, optimiser, URL (de)serialisation
- E2E (Playwright): critical flows × {iPhone 14, Pixel 7, 1440 desktop} × {light, dark} × {en, bn}: browse → filter → select → add to route → change mode → share → reopen link
- Visual regression snapshots for key screens in both themes
- a11y (axe in CI) + manual screen-reader pass (VoiceOver/TalkBack on map + sheet)
- **Real-device test** on 2+ phones in the field (or at least on cellular, outdoors)
- Load test the API routes (k6) with Redis rate limits; confirm cache hit ratio
- Cost simulation: 5 000 users × realistic actions → estimated API cost vs quotas

**Launch checklist**
- [ ] Production domain + HTTPS, `robots`/sitemap, OG images, favicon/manifest
- [ ] Referrer restrictions updated for prod domain; budget alerts armed; quotas set
- [ ] Privacy note (location used on-device only), data disclaimer ("Pandal locations/timings are community-curated and can change — verify with organisers/police advisories"), Google attribution intact
- [ ] Feedback button → form (Tally/Formspree) and "Report wrong location" link on every place
- [ ] Vercel Analytics + Speed Insights, Sentry, uptime ping
- [ ] **Rollback plan**: Vercel instant rollback; feature flags (`flags.ts`) to disable cab estimates / matrix API quickly if costs spike

---

### Phase 12 — Live Puja operations (17–21 Oct)

- Daily 15-min data pass: fix wrong pins from feedback, update restricted zones from police advisories, adjust crowd table from reports
- "Today" banner on home: today's name (Saptami…), Sandhi Puja time, weather, metro notices
- Ship P1 leftovers: curated trails, utilities layer, crowd reports (moderated), "right now" crowd heat
- Watch cost dashboard hourly on 17–19 Oct

### Phase 13 — Post-Puja (Nov onwards)
- Retro: usage analytics, top searches, most-saved places, cost per user
- Accounts (Supabase Auth, magic link/Google), cloud-synced trips, **collaborative trips** (Realtime), **friend live location** (opt-in, expiring)
- Year-over-year pipeline: archive 2026 pandals (`year` field), "Pandal 2027" onboarding checklist, community submissions with moderation
- Other festivals/cities (Kali Puja, Jagadhatri Puja in Chandannagar, Poila Boishakh walks, Christmas on Park Street)

---

## 5. Cost & quota controls (Google Maps)

- Load Maps JS **once**, lazy on first interaction after paint; use `loading=async` + `libraries` only as needed
- **Static-first**: place data is local JSON → no Places call just to render pins
- Autocomplete **only for custom start/end**; use **session tokens**; debounce 250 ms; min 3 chars
- Place Details: field-masked, server-cached 12 h; fetch only on sheet open (not on hover)
- Routes: field masks, 15-min cache, precomputed matrix for known places, **cap 20 matrix elements per request from clients**
- Per-IP + global rate limits (Upstash); circuit breaker → "approx mode" using haversine + model if daily budget hit
- Quota caps + budget alerts + a kill switch flag (see Phase 11)

---

## 6. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Only ~12 days to Shashthi | Scope overrun | Fast-track calendar, strict P0/P1 cut-list, ship v0.1 on Mahalaya |
| Wrong/missing pandal coordinates | Users walk to nothing | Verified-on-map rule, `approx` flag shown in UI, "report wrong location", Phase 12 daily fixes |
| API cost spike | Surprise bill | Quotas, budget alerts, caching, precomputed matrix, kill-switch flag |
| Google lacks full Kolkata transit data (new Metro sections) | Bad metro routes | Own metro graph as fallback + source of truth for fares/last train; verify line status before launch |
| Fare estimates wrong | Trust loss | Always ranges + "estimate" label + deep-link to real apps |
| Road closures unknown | Bad cab/auto ETAs | Manual restricted-zone layer with dated source; banner explaining; conservative walk fallback |
| Map theme-switch complexity | Delay | Day-1 spike; fallback = two Map IDs with cross-fade |
| Poor mobile signal on-site | Broken experience | PWA + offline data + list-view fallback + small payloads |
| Data licensing (Places caching) | ToS violation | Store only `place_id` + our own curated fields; live fetch for the rest |
| Crowd-safety liability | Reputation | Disclaimers, safety tips, no "guaranteed safe" claims |

---

## 7. Definition of done (v1.0)

- [ ] All ~80 Bonedi Bari + pandal places and ≥ 250 food spots on the map, verified coordinates
- [ ] Filters by category/zone/metro/cuisine/vibe/price/diet with Highlight ⇄ Filter modes, URL-shareable
- [ ] Manual route builder with walk/metro/auto/cab per-leg, totals, share, Google Maps export
- [ ] Auto-planner producing an ordered itinerary with food stops and "why" explanations
- [ ] Light/dark, en/bn, phone + desktop layouts, PWA install, offline list + saved trip
- [ ] Lighthouse mobile ≥ 90 perf / 100 a11y, CLS < 0.05, budgets met
- [ ] Budget alerts + quotas + rate limits live; rollback tested

---

## 8. Decisions I need from you

1. **Google Cloud billing account**: do you have one (card required) — and are you OK with a monthly cap of ~₹? (Set the cap in Phase 0.)
2. **Language**: Bengali UI from day 1 (adds ~1 day) or English-first with Bengali in v1.1?
3. **Data curation**: who verifies pandal locations/timings with you on the ground? (Biggest quality lever.)
4. **Domain/name**: keep "PujoGuide"? Custom domain or `*.vercel.app` for now?
5. **Scope**: confirm the fast-track cut-list (collaborative trips and crowd reports after Puja) is acceptable.
6. **Ride-hailing**: deep links only (my recommendation) vs. exploring official partner APIs (slow, likely unavailable).

---

## 9. Immediate next steps (when you say go)

1. Scaffold the Next.js project in `D:\Projects\PujoGuide`, wire Vercel, add the design tokens and theme toggle
2. Run `clean-seed.ts` on your pasted list → produce the de-duplicated places table and review CSV for you to eyeball
3. Create the Google Cloud keys/Map IDs (I'll give you exact console steps; keys must be created by you — never paste them into chat)
4. Ship the map + filters slice for v0.1 by Mahalaya (10 Oct)

---

### Sources consulted for time-sensitive facts
- Puja dates: [Durga Puja 2026 dates (divinehindu.in)](https://www.divinehindu.in/blogs/news/durga-puja-2026-dates-sandhi-puja-rituals), [Culture Today](https://culturetoday.in/durga-puja-2026/), [Rangoli India](https://rangoliindia.com/blogs/journal/durga-puja-2026-dates-outfit-shopping-plan) — sources differ by a day on Dashami; verify with a panjika.
- Metro network status: [The Metro Rail Guy – Kolkata Metro](https://themetrorailguy.com/kolkata-metro-information-map-updates/), [Swarajya news brief](https://swarajyamag.com/amp/story/news-brief/orange-line-airport-stretch-yellow-line-extensions-and-purple-line-tunnels-move-toward-completion-on-kolkata-metro-network) — Orange/Yellow lines are partially open and still changing; re-check before launch.
- Google Maps pricing: [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing) — confirm current SKUs and free caps there.
