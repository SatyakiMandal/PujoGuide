import { haversineKm } from "./geo";
import type { Point } from "./types";

const pathLen = (order: number[], d: number[][]) => {
  let s = 0;
  for (let i = 0; i < order.length - 1; i++) s += d[order[i]][order[i + 1]];
  return s;
};

/**
 * Re-orders stops to shorten the walk/ride: nearest-neighbour seed, then 2-opt.
 * The first stop stays first (it's where you start). Returns indices into `points`.
 */
export function optimiseOrder(points: Point[]): number[] {
  const n = points.length;
  const idx = points.map((_, i) => i);
  if (n <= 3) return idx;

  const d = points.map((a) => points.map((b) => haversineKm(a, b)));

  const order = [0];
  const left = new Set(idx.slice(1));
  while (left.size) {
    const last = order[order.length - 1];
    let next = -1;
    for (const j of left) if (next === -1 || d[last][j] < d[last][next]) next = j;
    order.push(next);
    left.delete(next);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (pathLen(cand, d) + 1e-9 < pathLen(order, d)) {
          order.splice(0, n, ...cand);
          improved = true;
        }
      }
    }
  }
  return order;
}
