import { metroLines } from "@/lib/metro";
import { METRO_FARE_SLABS, WAIT_MIN } from "./fares";
import { haversineKm, ROAD_FACTOR, WALK_KMH } from "./geo";
import type { LegOption, LngLat, Point, Step } from "./types";

const RIDE_KMH = 34; // average incl. station dwell on Kolkata Metro
const DWELL_MIN = 0.5;
const TRANSFER_MIN = 6;
const MAX_WALK_KM = 1.6;
const NEAREST = 4;

type Node = { id: number; name: string; lat: number; lng: number; line: string; color: string; lineName: string; idx: number };

const nodes: Node[] = [];
const adj: { to: number; min: number; km: number; transfer: boolean }[][] = [];

(function build() {
  for (const l of metroLines) {
    l.stations.forEach((s, idx) => {
      nodes.push({ id: nodes.length, name: s.name, lat: s.lat, lng: s.lng, line: l.id, color: l.color, lineName: l.name, idx });
      adj.push([]);
    });
  }
  const link = (a: number, b: number, min: number, km: number, transfer: boolean) => {
    adj[a].push({ to: b, min, km, transfer });
    adj[b].push({ to: a, min, km, transfer });
  };
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.line === b.line && Math.abs(a.idx - b.idx) === 1) {
        const km = haversineKm(a, b) * 1.1;
        link(i, j, (km / RIDE_KMH) * 60 + DWELL_MIN, km, false);
      } else if (a.line !== b.line && a.name.toLowerCase() === b.name.toLowerCase()) {
        link(i, j, TRANSFER_MIN, 0, true);
      }
    }
  }
})();

const walkMin = (km: number) => ((km * ROAD_FACTOR) / WALK_KMH) * 60;

function dijkstra(src: number) {
  const dist = new Array<number>(nodes.length).fill(Infinity);
  const prev = new Array<number>(nodes.length).fill(-1);
  dist[src] = 0;
  const done = new Set<number>();
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done.has(i) && dist[i] < (u === -1 ? Infinity : dist[u])) u = i;
    if (u === -1 || dist[u] === Infinity) break;
    done.add(u);
    for (const e of adj[u]) {
      if (dist[u] + e.min < dist[e.to]) {
        dist[e.to] = dist[u] + e.min;
        prev[e.to] = u;
      }
    }
  }
  return { dist, prev };
}

const nearest = (p: Point) =>
  nodes
    .map((n) => ({ n, km: haversineKm(p, n) }))
    .filter((x) => x.km * ROAD_FACTOR <= MAX_WALK_KM)
    .sort((a, b) => a.km - b.km)
    .slice(0, NEAREST);

const fareFor = (km: number) => METRO_FARE_SLABS.find(([max]) => km <= max)![1];

/** Best metro journey between two points (walk → ride [→ transfer → ride] → walk), or null if none is sensible. */
export function metroTrip(a: Point, b: Point): LegOption | null {
  const starts = nearest(a);
  const ends = nearest(b);
  if (!starts.length || !ends.length) return null;

  let best: { total: number; s: (typeof starts)[0]; t: (typeof ends)[0]; prev: number[]; ride: number } | null = null;
  for (const s of starts) {
    const { dist, prev } = dijkstra(s.n.id);
    for (const t of ends) {
      if (s.n.id === t.n.id || dist[t.n.id] === Infinity) continue;
      const total = walkMin(s.km) + WAIT_MIN.metro + dist[t.n.id] + walkMin(t.km);
      if (!best || total < best.total) best = { total, s, t, prev, ride: dist[t.n.id] };
    }
  }
  if (!best) return null;

  // Rebuild the node path.
  const seq: number[] = [];
  for (let at = best.t.n.id; at !== -1; at = best.prev[at]) seq.unshift(at);

  const steps: Step[] = [{ kind: "walk", minutes: Math.round(walkMin(best.s.km)), to: `${best.s.n.name} station` }];
  const path: LngLat[] = [[a.lng, a.lat]];
  let rideKm = 0;
  let i = 0;
  while (i < seq.length) {
    let j = i;
    while (j + 1 < seq.length && nodes[seq[j + 1]].line === nodes[seq[i]].line) j++;
    if (j > i) {
      let min = 0;
      for (let k = i; k < j; k++) {
        const e = adj[seq[k]].find((x) => x.to === seq[k + 1])!;
        min += e.min;
        rideKm += e.km;
      }
      const from = nodes[seq[i]];
      const to = nodes[seq[j]];
      steps.push({ kind: "ride", line: from.lineName, color: from.color, from: from.name, to: to.name, stops: j - i, minutes: Math.round(min) });
      for (let k = i; k <= j; k++) path.push([nodes[seq[k]].lng, nodes[seq[k]].lat]);
    }
    if (j + 1 < seq.length) {
      steps.push({ kind: "transfer", at: nodes[seq[j]].name, minutes: TRANSFER_MIN });
      i = j + 1;
    } else break;
  }
  steps.push({ kind: "walk", minutes: Math.round(walkMin(best.t.km)), to: "your stop" });
  path.push([b.lng, b.lat]);

  const fare = fareFor(rideKm);
  return {
    mode: "metro",
    available: true,
    minutes: Math.round(best.total),
    km: +(rideKm + (best.s.km + best.t.km) * ROAD_FACTOR).toFixed(1),
    fare: { min: fare, max: fare },
    path,
    steps,
    approx: true,
    note: "Timings are averages; check the last train on the night.",
  };
}
