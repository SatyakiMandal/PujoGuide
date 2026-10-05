"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { CrosshairSimple, ShieldCheck, TrainSimple } from "@phosphor-icons/react";
import * as maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { placeBySlug } from "@/lib/data";
import { routePlaces } from "@/lib/route/useLegs";
import { isFood } from "@/lib/schema";
import { metroLinesGeoJSON, metroStationsGeoJSON } from "@/lib/metro";
import { KOLKATA_BOUNDS, type Place } from "@/lib/schema";
import { useFiltered } from "@/lib/useFiltered";
import { useUI } from "@/store/ui";
import { PlacePin, type PinState } from "./PlacePin";
import { useClusters, type View } from "./useClusters";
import { RouteLayer } from "./RouteLayer";

if (typeof window !== "undefined") maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Free, key-less OpenStreetMap vector styles (CARTO). Check their terms before commercial use.
const STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const MAX_BOUNDS: [number, number, number, number] = [
  KOLKATA_BOUNDS.west - 0.15,
  KOLKATA_BOUNDS.south - 0.15,
  KOLKATA_BOUNDS.east + 0.15,
  KOLKATA_BOUNDS.north + 0.15,
];

export function FreeMapCanvas() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const mapRef = useRef<MapRef>(null);
  const [view, setView] = useState<View | null>(null);
  const [labelFont, setLabelFont] = useState<string[] | null>(null);

  const { rendered, matched } = useFiltered();
  const selected = useUI((s) => s.selected);
  const mode = useUI((s) => s.mode);
  const showMetro = useUI((s) => s.showMetro);
  const userPos = useUI((s) => s.userPos);
  const stops = useUI((s) => s.route.stops);
  const visited = useUI((s) => s.visited);
  const tab = useUI((s) => s.tab);
  const filtersActive = matched.size !== rendered.length || mode === "filter";

  const syncView = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    setView({ zoom: map.getZoom(), bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] });
  }, []);

  // Reuse the basemap's own label font so station names render without a separate glyph source.
  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    const font = map
      ?.getStyle()
      .layers.map((l) => (l.layout as Record<string, unknown> | undefined)?.["text-font"])
      .find((f): f is string[] => Array.isArray(f));
    if (font) setLabelFont(font);
    syncView();
  }, [syncView]);

  // Route stops are never clustered: they always show as numbered pins.
  const routePins = useMemo(() => routePlaces(stops), [stops]);
  const clusterable = useMemo(() => rendered.filter((p) => !stops.includes(p.slug)), [rendered, stops]);

  // Two independent cluster groups: heritage + pandals, and food. Food shows only as count bubbles
  // until you zoom in; heritage and pandals keep showing lone pins.
  const pujoList = useMemo(() => clusterable.filter((p) => !isFood(p.category)), [clusterable]);
  const foodList = useMemo(() => clusterable.filter((p) => isFood(p.category)), [clusterable]);
  const pujo = useClusters(pujoList, view, { radius: 60, maxZoom: 14 });
  const food = useClusters(foodList, view, { radius: 70, maxZoom: 14, minPoints: 1 });

  // Focus the selected place in the visible part of the map (not under the panel / sheet).
  useEffect(() => {
    const p = selected ? placeBySlug.get(selected) : undefined;
    const map = mapRef.current;
    if (!p || !map) return;
    const { inset } = useUI.getState();
    map.easeTo({
      center: [p.lng, p.lat],
      zoom: Math.max(map.getZoom(), 15),
      padding: { left: inset.left, bottom: inset.bottom, top: 0, right: 0 },
      duration: 700,
    });
  }, [selected]);

  // In the Plan tab, frame the whole route (keyed on the *set* of stops so reordering doesn't re-fit).
  const stopSet = [...stops].sort().join(",");
  useEffect(() => {
    const map = mapRef.current;
    const ps = routePlaces(stopSet ? stopSet.split(",") : []);
    if (tab !== "plan" || !map || ps.length === 0) return;
    const { inset } = useUI.getState();
    const lngs = ps.map((p) => p.lng);
    const lats = ps.map((p) => p.lat);
    map.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)], {
      padding: { top: 70, right: 70, left: inset.left + 50, bottom: inset.bottom + 50 },
      maxZoom: 15.5,
      duration: 800,
    });
  }, [stopSet, tab]);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude };
        useUI.getState().setUserPos(p);
        mapRef.current?.easeTo({ center: [p.lng, p.lat], zoom: 15, duration: 700 });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );

  const pinMarker = (p: Place) => {
    const state: PinState =
      p.slug === selected ? "selected" : !filtersActive ? "default" : matched.has(p.id) ? "match" : "dim";
    const n = stops.indexOf(p.slug);
    return (
      <Marker
        key={p.id}
        longitude={p.lng}
        latitude={p.lat}
        anchor="bottom"
        style={{ zIndex: state === "selected" ? 500 : n >= 0 ? 300 : state === "match" ? 100 : 1 }}
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          useUI.getState().select(p.slug);
        }}
      >
        <div className="pin-wrap">
          <PlacePin place={p} state={n >= 0 && state !== "selected" ? "default" : state} stop={n >= 0 ? n + 1 : undefined} visited={visited.includes(p.slug)} />
        </div>
      </Marker>
    );
  };

  type Group = ReturnType<typeof useClusters>;
  const renderItem = (item: Group["items"][number], g: Group, kind: "pujo" | "food") => {
    const [lng, lat] = item.geometry.coordinates;
    const props = item.properties as { cluster?: boolean; point_count?: number; cluster_id?: number; id?: string };
    if (props.cluster) {
      const count = props.point_count;
      return (
        <Marker key={`${kind}-c-${item.id}`} longitude={lng} latitude={lat} anchor="center">
          <button
            type="button"
            className={kind === "food" ? "cluster cluster-food" : "cluster"}
            aria-label={`${count} ${kind === "food" ? "cafes and restaurants" : "places"}, zoom in`}
            onClick={() => {
              const z = Math.min(g.index.getClusterExpansionZoom(props.cluster_id as number), 17);
              mapRef.current?.easeTo({ center: [lng, lat], zoom: Math.max(z, 15), duration: 500 });
            }}
          >
            {count}
          </button>
        </Marker>
      );
    }
    const p = g.byId.get(props.id as string);
    if (!p) return null;
    // Food shows only as count bubbles until you zoom in, so a lone place is a "1" bubble (never a pin).
    if (kind === "food" && view && Math.round(view.zoom) <= 14) {
      return (
        <Marker key={`food-1-${p.id}`} longitude={p.lng} latitude={p.lat} anchor="center">
          <button
            type="button"
            className="cluster cluster-food"
            aria-label={`${p.name.en}, zoom in`}
            onClick={() => mapRef.current?.easeTo({ center: [p.lng, p.lat], zoom: 16, duration: 500 })}
          >
            1
          </button>
        </Marker>
      );
    }
    return pinMarker(p);
  };

  const textColor = dark ? "#f4ece2" : "#2a2019";
  const halo = dark ? "#141110" : "#ffffff";

  return (
    <div className="relative size-full">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={dark ? STYLE_DARK : STYLE_LIGHT}
        initialViewState={{ longitude: 88.3639, latitude: 22.5726, zoom: 11.6 }}
        minZoom={9.5}
        maxBounds={MAX_BOUNDS}
        attributionControl={{ compact: true }}
        onLoad={onLoad}
        onMoveEnd={syncView}
        style={{ width: "100%", height: "100%" }}
      >
        {showMetro && (
          <>
            <Source id="metro-lines" type="geojson" data={metroLinesGeoJSON}>
              <Layer
                id="metro-casing"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": halo, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 15, 9], "line-opacity": 0.9 }}
              />
              <Layer
                id="metro-line"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": ["get", "color"], "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 15, 5] }}
              />
            </Source>
            <Source id="metro-stations" type="geojson" data={metroStationsGeoJSON}>
              <Layer
                id="metro-station"
                type="circle"
                paint={{
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 15, 6],
                  "circle-color": halo,
                  "circle-stroke-color": ["get", "color"],
                  "circle-stroke-width": 2,
                }}
              />
              {labelFont && (
                <Layer
                  id="metro-station-label"
                  type="symbol"
                  minzoom={12.5}
                  layout={{
                    "text-field": ["get", "name"],
                    "text-font": labelFont,
                    "text-size": 11,
                    "text-offset": [0, 1.2],
                    "text-anchor": "top",
                    "text-optional": true,
                  }}
                  paint={{ "text-color": textColor, "text-halo-color": halo, "text-halo-width": 1.5 }}
                />
              )}
            </Source>
          </>
        )}

        <RouteLayer />

        {pujo.items.map((item) => renderItem(item, pujo, "pujo"))}
        {food.items.map((item) => renderItem(item, food, "food"))}

        {routePins.map(pinMarker)}

        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat}>
            <div className="size-4 rounded-full border-[3px] border-white bg-[#2b6cff] shadow-[0_0_0_8px_rgb(43_108_255/0.25)]" />
          </Marker>
        )}
      </Map>

      <div className="absolute right-3 top-[4.5rem] z-10 flex flex-col gap-2">
        <MapButton label="Show my location" onClick={locate}>
          <CrosshairSimple size={22} weight="bold" />
        </MapButton>
        <MapButton label="Essentials and safety" onClick={() => useUI.getState().setEssentials(true)}>
          <ShieldCheck size={22} weight="bold" />
        </MapButton>
        <MapButton
          label={showMetro ? "Hide metro lines" : "Show metro lines"}
          active={showMetro}
          onClick={() => useUI.getState().toggleMetro()}
        >
          <TrainSimple size={22} weight={showMetro ? "fill" : "bold"} />
        </MapButton>
      </div>
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
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`grid size-11 place-items-center rounded-full border border-line shadow-float transition-transform active:scale-90 ${
        active ? "bg-primary text-primary-fg" : "bg-surface text-fg"
      }`}
    >
      {children}
    </button>
  );
}
