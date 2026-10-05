import { create } from "zustand";
import { persist } from "zustand/middleware";
import { placeBySlug } from "@/lib/data";
import { defaultRequest, type PlanRequest } from "@/lib/autoplan";
import type { PujaDayId } from "@/lib/calendar";
import { defaultFilters, type FilterState, type Personal } from "@/lib/filter";
import type { LegGeometry } from "@/lib/route/estimate";
import type { Mode } from "@/lib/route/types";

type ListKey = "zones" | "metro" | "cuisines" | "vibes" | "diets" | "sources";
export type FilterMode = "highlight" | "filter";
export type Tab = "explore" | "plan";

export type RouteState = {
  /** Place slugs in visiting order. */
  stops: string[];
  /** User-chosen mode per leg, keyed `fromSlug>toSlug`. Absent = auto-pick. */
  override: Record<string, Mode>;
  pujaNight: boolean;
  /** Set by the auto-planner: when you plan to reach and leave each stop (minutes from midnight), and for which festival day. */
  schedule?: Record<string, { arrive: number; depart: number }>;
  day?: PujaDayId;
};

type UIState = {
  filters: FilterState;
  query: string;
  mode: FilterMode;
  tab: Tab;
  essentials: boolean;
  setEssentials: (open: boolean) => void;
  showMetro: boolean;
  route: RouteState;
  /** Slugs you saved / visited, and your own notes per place. Persisted on this device. */
  saved: string[];
  visited: string[];
  notes: Record<string, string>;
  /** Fetched road/foot geometry per leg (session only). */
  geom: Record<string, LegGeometry>;
  selected: string | null;
  /** Pixels of the map covered by the side panel / bottom sheet, so focus lands in the visible part. */
  inset: { left: number; bottom: number };
  userPos: { lat: number; lng: number } | null;
  setInset: (i: { left: number; bottom: number }) => void;
  setUserPos: (p: { lat: number; lng: number }) => void;
  setQuery: (q: string) => void;
  setMode: (m: FilterMode) => void;
  setTab: (t: Tab) => void;
  toggleMetro: () => void;
  addStop: (slug: string) => void;
  removeStop: (slug: string) => void;
  setStops: (slugs: string[]) => void;
  /** Loads an auto-planned day: the stops plus their times. */
  setPlanned: (slugs: string[], schedule: NonNullable<RouteState["schedule"]>, day: PujaDayId) => void;
  /** What you last asked the auto-planner for. */
  planReq: PlanRequest;
  setPlanReq: (r: PlanRequest) => void;
  toggleSaved: (slug: string) => void;
  toggleVisited: (slug: string) => void;
  setNote: (slug: string, text: string) => void;
  setPersonal: (p: Personal | null) => void;
  toggleClosed: () => void;
  clearRoute: () => void;
  setLegMode: (key: string, mode: Mode | null) => void;
  setPujaNight: (on: boolean) => void;
  setGeom: (key: string, patch: LegGeometry) => void;
  select: (slug: string | null) => void;
  toggleLayer: (c: FilterState["layers"][number]) => void;
  toggle: <K extends ListKey>(key: K, value: FilterState[K][number]) => void;
  setMaxPrice: (n: number | null) => void;
  toggleOpenLate: () => void;
  toggleOpenNow: () => void;
  setMinRating: (n: number | null) => void;
  reset: () => void;
};

const flip = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const emptyRoute: RouteState = { stops: [], override: {}, pujaNight: true };

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      query: "",
      mode: "highlight",
      tab: "explore",
      essentials: false,
      setEssentials: (essentials) => set({ essentials }),
      showMetro: true,
      route: emptyRoute,
      saved: [],
      visited: [],
      notes: {},
      geom: {},
      selected: null,
      inset: { left: 0, bottom: 0 },
      userPos: null,
      setInset: (inset) => set({ inset }),
      setUserPos: (userPos) => set({ userPos }),
      setQuery: (query) => set({ query }),
      setMode: (mode) => set({ mode }),
      setTab: (tab) => set({ tab }),
      toggleMetro: () => set((s) => ({ showMetro: !s.showMetro })),
      // Any manual change to the stops invalidates the auto-planner's times, so drop them.
      addStop: (slug) =>
        set((s) =>
          s.route.stops.includes(slug)
            ? s
            : { route: { ...s.route, stops: [...s.route.stops, slug], schedule: undefined, day: undefined } },
        ),
      removeStop: (slug) =>
        set((s) => ({ route: { ...s.route, stops: s.route.stops.filter((x) => x !== slug), schedule: undefined, day: undefined } })),
      setStops: (stops) => set((s) => ({ route: { ...s.route, stops, schedule: undefined, day: undefined } })),
      setPlanned: (stops, schedule, day) => set((s) => ({ route: { ...s.route, stops, schedule, day } })),
      planReq: defaultRequest(),
      setPlanReq: (planReq) => set({ planReq }),
      toggleSaved: (slug) => set((s) => ({ saved: flip(s.saved, slug) })),
      toggleVisited: (slug) => set((s) => ({ visited: flip(s.visited, slug) })),
      setNote: (slug, text) =>
        set((s) => {
          const notes = { ...s.notes };
          if (text.trim()) notes[slug] = text;
          else delete notes[slug];
          return { notes };
        }),
      setPersonal: (personal) => set((s) => ({ filters: { ...s.filters, personal } })),
      toggleClosed: () => set((s) => ({ filters: { ...s.filters, showClosed: !s.filters.showClosed } })),
      clearRoute: () => set((s) => ({ route: { ...emptyRoute, pujaNight: s.route.pujaNight } })),
      setLegMode: (key, mode) =>
        set((s) => {
          const override = { ...s.route.override };
          if (mode) override[key] = mode;
          else delete override[key];
          return { route: { ...s.route, override } };
        }),
      setPujaNight: (pujaNight) => set((s) => ({ route: { ...s.route, pujaNight } })),
      setGeom: (key, patch) => set((s) => ({ geom: { ...s.geom, [key]: { ...s.geom[key], ...patch } } })),
      select: (selected) =>
        set((s) => {
          // Opening a place whose layer is switched off (e.g. a cafe from a link) would show no pin: turn it on.
          const category = selected ? placeBySlug.get(selected)?.category : undefined;
          if (category && !s.filters.layers.includes(category)) {
            return { selected, filters: { ...s.filters, layers: [...s.filters.layers, category] } };
          }
          return { selected };
        }),
      toggleLayer: (c) => set((s) => ({ filters: { ...s.filters, layers: flip(s.filters.layers, c) } })),
      toggle: (key, value) =>
        set((s) => ({
          filters: { ...s.filters, [key]: flip(s.filters[key] as unknown[], value as unknown) },
        })),
      setMaxPrice: (maxPrice) => set((s) => ({ filters: { ...s.filters, maxPrice } })),
      toggleOpenLate: () => set((s) => ({ filters: { ...s.filters, openLate: !s.filters.openLate } })),
      toggleOpenNow: () => set((s) => ({ filters: { ...s.filters, openNow: !s.filters.openNow } })),
      setMinRating: (minRating) => set((s) => ({ filters: { ...s.filters, minRating } })),
      reset: () => set((s) => ({ filters: { ...defaultFilters, layers: s.filters.layers }, query: "" })),
    }),
    {
      name: "pujoguide:v1",
      // Persist only what the user built; skipHydration + manual rehydrate avoids SSR mismatches.
      partialize: (s) => ({ route: s.route, planReq: s.planReq, showMetro: s.showMetro, mode: s.mode, saved: s.saved, visited: s.visited, notes: s.notes }),
      skipHydration: true,
    },
  ),
);
