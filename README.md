# PujoGuide 🪔

> **Kolkata Durga Puja Interactive Map, Route Planner & Heritage Festival Guide**

PujoGuide is a high-performance Progressive Web Application (PWA) designed for navigating Kolkata during Durga Puja. It brings together **339 verified pandals, Bonedi Baris (heritage family pujas), sweet shops, cafes, and restaurants** onto one unified interactive map with multi-modal route planning, live tour navigation, smart auto-planning, and offline resilience.

---

## 🌟 Key Features

### 1. Interactive Dual Map Canvas
- **MapLibre GL / Google Maps Integration**: Powered by free CARTO Voyager / Dark Matter tiles with OpenStreetMap data, seamlessly switching to Google Maps JavaScript API when an optional Google Places key (`NEXT_PUBLIC_GMAPS_KEY`) is present.
- **Dynamic HTML Pins & Clusters**: Custom rotated teardrop pins colored by category (Vermilion for Pandals, Antique Gold for Bonedi Baris, Teal for Food) with visited checkmarks and stop order badges.

### 2. Comprehensive Pandal & Heritage Coverage
- **339 Verified Spots**: Complete dataset spanning North, Central, South Kolkata, and Salt Lake.
- **25+ Bonedi Baris**: Including Shobhabazar (Boro & Choto), Pathuriaghata, Darjipara Mitra Bari, Chatu Babu Latu Babu, Hathkhola Dutta Bari, Malapara Mullick Bari, Daw Baris, Chorbagan Baris, Thanthaniya Laha Bari, Jhamapukur Chandra Bari, Bhowanipore Mallick Bari, and Behala Sabarna Roy Choudhury Atchala.

### 3. 24 Curated Marathon Routes & Catalog Controls
- **Mega Marathon Circuits**:
  - 🏆 **North Kolkata Special Mega Pujo Circuit**: 22-stop master route from Tala Prattay through Hatibagan, Kashi Bose Lane, Simla, Chalta Bagan, Kumartuli, and Baghbazar.
  - 🏛️ **Bonedi Bari Mega Marathon**: 18-stop complete heritage family house loop across North & Central Kolkata.
  - 🚇 **Kalighat & South Metro Mega Circuit**: 24-stop South Kolkata marathon connecting Suruchi Sangha, Chetla Agrani, Mudiali, Deshapriya Park, Singhi Park, Ekdalia, Maddox Square, and Naktala.
- **Catalog Search & Metric Sorting**:
  - View **"All Plans"** in a single list.
  - Search plans by title, description, tag, or specific stop name.
  - Sort plans by **Recommended**, **Most Stops**, **Fewest Stops**, **Quietest (Crowd rank)**, and **Alphabetical A–Z**.

### 4. Interspaced Food, Budget & Dish Pricing
- **Food & Refreshment Integration**: Every plan features authentic food, cafe, tea, or sweet shop stops (Golbari, Mitra Cafe, Putiram, Allen Kitchen, TRING TRING, Balwant Singh Dhaba, Nobin Chandra Das, Girish Ch. Dey & Nakur Ch. Nandy, 6 Ballygunge Place, etc.) interspaced along the walking/driving path.
- **Budget Badges & Dish Prices**: Budget badges (`Price Level` `₹` to `₹₹₹₹` with estimated cost per 2 persons) and dish-level prices (`₹`) across 1,814 menu items.

### 5. Smart Auto-Planner Engine
- **Algorithmic Route Generation**: Enter your free time window, starting location, pace, interests, budget, and ritual preferences. The rule-based engine generates a custom itinerary with travel times, queue estimates, ritual windows (Pushpanjali, Sandhi Puja), and lunch/tea/dinner stops.

### 6. Live Tour Mode & Turn-by-Turn Navigation
- **Live Tour Interface**: Full-screen turn-by-turn guidance showing current/next stops, live dwell time countdowns, leg travel modes (Metro, Auto, Cab, Bike, Walk), and direct Google Maps navigation links.

### 7. Essential Amenities on Map
- **On-Map Emergency Layer**: Togglable map markers for nearby public toilets, drinking water points, police booths, and first aid stations.

### 8. Offline Resilience & QR Code Sharing
- **QR Code Route Cloning**: Scan a QR code on any phone screen to clone the exact itinerary into the web app.
- **Offline Backup & Export**: Download full route directions as plain `.txt` files or export/restore your saved places, check-ins, and itineraries via `.json` backup files.
- **PWA & Offline Tile Cacher**: Installs directly to home screen ("Add to Home Screen") with custom Service Worker caching.

---

## 🏗️ Architecture & Code Description

### Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, Motion (Framer Motion v12), Phosphor Icons |
| **Map Rendering** | MapLibre GL JS, Mapbox GL Draw, Google Maps JS API (optional) |
| **State Management** | Zustand (with persistent localStorage middleware) |
| **UI Components** | Vaul (Drawer for mobile bottom-sheet), Radix UI primitives |
| **Validation & Schema** | Zod v3 |
| **Testing** | Vitest (Unit & Data Integrity), Playwright (E2E) |

---

### Key Directory Structure

```
PujoGuide/
├── src/
│   ├── app/                    # Next.js App Router (layout, page, manifest, globals.css)
│   ├── components/
│   │   ├── filters/            # FilterGroups, FilterToggle, facet chips
│   │   ├── map/                # MapCanvas, FreeMapCanvas, GoogleMapCanvas, PlacePin, RouteLayer
│   │   ├── place/              # PlaceDetail, PlaceList, HoursCard, MenuCard
│   │   ├── plan/               # PlanView, PlansCatalog, AutoPlanner, LiveTourMode, EditRouteModal
│   │   ├── ui/                 # Chip, ThemeToggle, Logo, AutoRickshawIcon
│   │   ├── AppShell.tsx        # Responsive desktop side panel & mobile Vaul drawer shell
│   │   ├── EssentialsSheet.tsx # Emergency numbers & amenities sheet
│   │   ├── Panel.tsx           # Main control panel (search, tabs, filters, place list)
│   │   └── TodayStrip.tsx      # Festival countdown, weather, Puja Day Mode toggle
│   ├── data/                   # Cleaned runtime datasets
│   │   ├── places.json         # 339 validated places (pandals, baris, food)
│   │   ├── zones.json          # 17 Kolkata neighborhood zones
│   │   ├── metro.json          # Kolkata Metro line stations & connectivity graph
│   │   └── amenities.json      # Toilets, water, first aid, police stations
│   ├── lib/
│   │   ├── route/              # OSRM router, leg estimation, fare calculation, 2-opt TSP optimizer
│   │   ├── autoplan.ts         # Rule-based auto-planner engine
│   │   ├── calendar.ts         # Festival dates & ritual windows (Mahalaya to Dashami)
│   │   ├── data.ts             # Data maps & lookup indexes
│   │   ├── filter.ts           # Multi-facet filtering logic
│   │   ├── hours.ts            # Opening hours parser & status evaluator
│   │   ├── personalData.ts     # Backup & restore manager (JSON export/import)
│   │   ├── placeIcon.tsx       # Dynamic Phosphor icon mapper by cuisine/category
│   │   ├── plans.ts            # 24 Curated Marathon & Interest Plans dataset
│   │   ├── qrcode.ts           # Pure JavaScript QR code SVG generator
│   │   └── schema.ts           # Authoritative Zod schemas (Place, Plan, Amenity, Hours, Menu)
│   └── store/
│       └── ui.ts               # Global Zustand state (stops, filters, mode, theme, saved/visited)
├── tests/                      # 15 Vitest test suites (135 tests)
├── data/                       # Raw seed data, geocoded OSM matches, Google Maps snapshots
├── scripts/                    # Build scripts (data compilation, geocoding, metro extraction)
└── README.md                   # Complete documentation & code review
```

---

## 🔍 Code Review & Data Integrity Assessment

### 1. Data Schema & Strict Typing (`src/lib/schema.ts`)
- All 339 place objects in `places.json` are parsed through Zod (`placeSchema.parse()`).
- Data integrity tests enforce:
  - Valid coordinates within Kolkata bounding box (`22.40` to `22.75` N, `88.20` to `88.52` E).
  - No duplicated coordinates or stacked pins on the exact same lat/lng.
  - Every place references a valid zone ID from `zones.json`.
  - Every pandal and Bonedi Bari includes a populated `tips` object (`expect` field) and a valid `crowd` rating (`low` | `medium` | `high` | `extreme`).

### 2. Multi-Modal Routing & Optimization Engine (`src/lib/route/`)
- **OSRM Client**: Fetches exact road geometry via OpenStreetMap OSRM API with straight-line fallback.
- **Fares & Travel Time Models** (`fares.ts`, `estimate.ts`): Calculates accurate fare slabs and travel durations for Walking, Metro, Auto, Cab, and Bike (including Puja-night congestion multipliers).
- **2-Opt TSP Optimizer** (`optimise.ts`): Solves Travelling Salesperson Problem for user routes to minimize total travel distance.

### 3. Comprehensive Unit Test Coverage (`vitest run`)
- **15 Test Suites / 135 Unit Tests**: Passing 100% cleanly.
  - `data.test.ts`: Pin coordinates, zone IDs, tips, crowd metrics, food fields.
  - `filter.test.ts`: Layer filtering, multi-zone inclusion, diet/price constraints.
  - `plans.test.ts`: Plan slug validity, non-duplicate stops, 100% area plan coverage for baris/pandals, 2-opt TSP distance efficiency checks.
  - `autoplan.test.ts`: Time window constraints, ritual inclusion, meal window placements.
  - `route.test.ts`: Leg calculations, mode switching, OSRM fallback.
  - `hours.test.ts`: Weekly hours window parsing, midnight rollover handling.
  - `personalData.test.ts`: Backup JSON generation & restore validation.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/SatyakiMandal/PujoGuide.git
cd PujoGuide

# Install dependencies (runs postinstall script for MapLibre worker)
npm install
```

### Development Server

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality Check & Unit Testing

```bash
# Run TypeScript typecheck and Vitest test suite
npm run check

# Run Vitest test suite only
npm test
```

### Production Build

```bash
npm run build
npm start
```

---

## 📄 License & Attribution

- **Map Data**: OpenStreetMap contributors, CARTO Voyager/Dark Matter.
- **Icons**: Phosphor Icons.
- **Festival Calendar & Data**: Researched and curated for Kolkata Durga Puja.
