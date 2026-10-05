"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Drawer } from "vaul";
import { MapCanvas } from "@/components/map/MapCanvas";
import { EssentialsSheet } from "@/components/EssentialsSheet";
import { Panel } from "@/components/Panel";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { placeBySlug } from "@/lib/data";
import { useLegLoader } from "@/lib/route/useLegs";
import { useUI } from "@/store/ui";

const DESKTOP = "(min-width: 1024px)";
const PANEL_W = 420;
// Fractions of the viewport height visible: peek (search + chips), half, full.
const SNAPS = [0.27, 0.55, 0.92];

/** null until hydrated, so the server and first client render agree. */
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(DESKTOP);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => null,
  );
}

export function AppShell() {
  const isDesktop = useIsDesktop();
  const selected = useUI((s) => s.selected);
  const [snap, setSnap] = useState<number | string | null>(SNAPS[0]);

  useLegLoader();

  // Restore the saved route, then apply deep links: /?place=slug and /?route=a,b,c (shared plan).
  useEffect(() => {
    // Read the URL *now*: the URL-sync effect below clears ?place= as soon as the selection is empty.
    const params = new URLSearchParams(location.search);
    Promise.resolve(useUI.persist.rehydrate()).then(() => {
      const route = params.get("route")?.split(",").filter((s) => placeBySlug.has(s));
      if (route?.length) {
        useUI.getState().setStops(route);
        useUI.getState().setTab("plan");
      }
      const slug = params.get("place");
      if (slug && placeBySlug.has(slug)) useUI.getState().select(slug);
    });
  }, []);

  // Keep the URL shareable as the selection changes.
  useEffect(() => {
    const url = new URL(location.href);
    if (selected) url.searchParams.set("place", selected);
    else url.searchParams.delete("place");
    history.replaceState(null, "", url);
  }, [selected]);

  // Tell the map how much of it is covered, so selected pins land in the visible part.
  useEffect(() => {
    if (isDesktop === null) return;
    const bottom = isDesktop ? 0 : typeof snap === "number" ? innerHeight * snap : innerHeight * SNAPS[0];
    // Desktop: the map sits beside the panel, so nothing covers it. Mobile: the sheet overlays the bottom.
    useUI.getState().setInset({ left: 0, bottom });
  }, [isDesktop, snap]);

  // Selecting on mobile lifts the sheet to show details (adjusting state during render, per React docs).
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    if (!isDesktop && selected) setSnap(SNAPS[1]);
  }

  return (
    <main className="relative flex h-dvh w-full overflow-hidden">
      <EssentialsSheet />
      {isDesktop && (
        <aside
          style={{ width: PANEL_W }}
          className="relative z-30 flex shrink-0 flex-col border-r border-line bg-bg pt-4 shadow-float"
        >
          <Panel />
        </aside>
      )}

      <div className="relative z-0 min-w-0 flex-1 isolate">
        <MapCanvas />
        <ThemeToggle className="absolute right-3 top-3 z-20" />
      </div>

      {isDesktop === false && (
        <Drawer.Root
          open
          modal={false}
          dismissible={false}
          handleOnly
          snapPoints={SNAPS}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
        >
          <Drawer.Portal>
            <Drawer.Content
              aria-describedby={undefined}
              className="fixed inset-x-0 bottom-0 z-40 flex h-dvh flex-col rounded-t-3xl border border-b-0 border-line bg-bg shadow-float outline-none isolate"
            >
              <Drawer.Title className="sr-only">Places</Drawer.Title>
              <Drawer.Handle className="!my-2.5 !h-1.5 !w-12 !bg-line cursor-grab active:cursor-grabbing" />
              {/* Content is viewport-tall (vaul's offset maths needs that), so size the scroll area to what's visible. */}
              <div
                style={{ height: `calc(${(typeof snap === "number" ? snap : SNAPS[0]) * 100}dvh - 1.75rem)` }}
                className="pb-[env(safe-area-inset-bottom)]"
              >
                <Panel />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </main>
  );
}
