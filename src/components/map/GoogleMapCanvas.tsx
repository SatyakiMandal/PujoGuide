"use client";

import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { CrosshairSimple, FirstAid, ShieldCheck, TrainSimple } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { PlacePin } from "./PlacePin";
import { placeBySlug } from "@/lib/data";
import { KOLKATA_BOUNDS, type Place } from "@/lib/schema";
import { useFiltered } from "@/lib/useFiltered";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";

// DEMO_MAP_ID lets Advanced Markers work in development; set a real Cloud Map ID for styled maps.
const MAP_ID = process.env.NEXT_PUBLIC_MAP_ID || "DEMO_MAP_ID";
const CENTER = { lat: 22.5726, lng: 88.3639 };

/** Moves the camera so the place sits in the middle of the *visible* map (not under the panel/sheet). */
function focusPlace(map: google.maps.Map, p: Place) {
  const { inset } = useUI.getState();
  const zoom = Math.max(map.getZoom() ?? 11, 15);
  const degPerPx = 360 / (256 * 2 ** zoom);
  const lat = p.lat - (inset.bottom / 2) * degPerPx * Math.cos((p.lat * Math.PI) / 180);
  const lng = p.lng - (inset.left / 2) * degPerPx;
  map.panTo({ lat, lng });
  if ((map.getZoom() ?? 0) < zoom) map.setZoom(zoom);
}

function Markers() {
  const map = useMap();
  const { rendered, matched } = useFiltered();
  const selected = useUI((s) => s.selected);
  const mode = useUI((s) => s.mode);
  const filtersActive = matched.size !== rendered.length || mode === "filter";
  const refs = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
  const clusterer = useRef<MarkerClusterer | null>(null);

  useEffect(() => {
    if (!map) return;
    clusterer.current = new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({ radius: 70, maxZoom: 13 }),
      renderer: {
        render: ({ count, position }) => {
          const el = document.createElement("div");
          el.className = "cluster";
          el.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({ position, content: el, zIndex: 1000 + count });
        },
      },
    });
    return () => clusterer.current?.setMap(null);
  }, [map]);

  // Re-sync the clusterer whenever the rendered set changes.
  useEffect(() => {
    const c = clusterer.current;
    if (!c) return;
    c.clearMarkers();
    c.addMarkers(rendered.map((p) => refs.current[p.id]).filter(Boolean));
  }, [rendered]);

  useEffect(() => {
    const p = selected ? placeBySlug.get(selected) : undefined;
    if (map && p) focusPlace(map, p);
  }, [map, selected]);

  const query = useUI((s) => s.query);
  useEffect(() => {
    if (!map || !query.trim() || rendered.length === 0 || selected) return;
    if (rendered.length === 1) {
      focusPlace(map, rendered[0]);
    } else {
      const bounds = new google.maps.LatLngBounds();
      rendered.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      const { inset } = useUI.getState();
      map.fitBounds(bounds, { top: 60, right: 60, bottom: inset.bottom + 40, left: 40 });
    }
  }, [map, query, rendered, selected]);

  return (
    <>
      {rendered.map((p) => {
        const state = p.slug === selected ? "selected" : !filtersActive ? "default" : matched.has(p.id) ? "match" : "dim";
        const stops = useUI.getState().route.stops;
        const n = stops.indexOf(p.slug);
        return (
          <AdvancedMarker
            key={p.id}
            position={p}
            zIndex={state === "selected" ? 500 : n >= 0 ? 300 : state === "match" ? 100 : 1}
            onClick={() => useUI.getState().select(p.slug)}
            ref={(m) => {
              if (m) refs.current[p.id] = m;
              else delete refs.current[p.id];
            }}
          >
            <PlacePin place={p} state={state} stop={n >= 0 ? n + 1 : undefined} />
          </AdvancedMarker>
        );
      })}
    </>
  );
}

function UserMarker() {
  const pos = useUI((s) => s.userPos);
  if (!pos) return null;
  return (
    <AdvancedMarker position={pos}>
      <div className="size-4 rounded-full border-[3px] border-white bg-[#2b6cff] shadow-[0_0_0_8px_rgb(43_108_255/0.25)]" />
    </AdvancedMarker>
  );
}

function MapControls() {
  const map = useMap();
  const showMetro = useUI((s) => s.showMetro);
  const showAmenities = useUI((s) => s.showAmenities);
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude };
        useUI.getState().setUserPos(p);
        map?.panTo(p);
        map?.setZoom(15);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );

  return (
    <div className="absolute right-3 top-[4.5rem] z-10 flex flex-col gap-2">
      <MapButton label="Show my location" onClick={locate}>
        <CrosshairSimple size={22} weight="bold" />
      </MapButton>
      <MapButton
        label={showAmenities ? "Hide amenities on map" : "Show amenities on map"}
        active={showAmenities}
        onClick={() => useUI.getState().toggleAmenities()}
      >
        <FirstAid size={22} weight={showAmenities ? "fill" : "bold"} />
      </MapButton>
      <MapButton
        label={showMetro ? "Hide metro lines" : "Show metro lines"}
        active={showMetro}
        onClick={() => useUI.getState().toggleMetro()}
      >
        <TrainSimple size={22} weight={showMetro ? "fill" : "bold"} />
      </MapButton>
    </div>
  );
}

function MapButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "grid size-11 place-items-center rounded-full border border-line shadow-float transition-colors",
        active ? "bg-primary text-primary-fg" : "bg-surface text-fg",
      )}
    >
      {children}
    </motion.button>
  );
}

export function GoogleMapCanvas({ apiKey }: { apiKey: string }) {
  const { resolvedTheme } = useTheme();

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative size-full">
        <Map
          mapId={MAP_ID}
          colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
          defaultCenter={CENTER}
          defaultZoom={12}
          minZoom={10}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          restriction={{
            latLngBounds: {
              south: KOLKATA_BOUNDS.south - 0.1,
              north: KOLKATA_BOUNDS.north + 0.1,
              west: KOLKATA_BOUNDS.west - 0.1,
              east: KOLKATA_BOUNDS.east + 0.1,
            },
          }}
          className="size-full"
        >
          <Markers />
          <UserMarker />
        </Map>
        <MapControls />
      </div>
    </APIProvider>
  );
}
