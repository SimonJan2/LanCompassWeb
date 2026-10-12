/**
 * Contour lines for the cartographic background, generated at build time.
 * Each "hill" is a set of nested closed rings whose radius wobbles with a few
 * low-frequency sines, so the lines read as a survey map, not as a pattern.
 * Deterministic: the same seed always draws the same map.
 */

export interface Hill {
  /** Centre, in the viewBox's units. */
  x: number;
  y: number;
  /** Radius of the outermost ring and the number of rings. */
  radius: number;
  rings: number;
  seed: number;
}

/** A small deterministic PRNG (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Closed Catmull-Rom spline through the points, as cubic Béziers, whole-unit coordinates. */
function closedPath(points: [number, number][]): string {
  const n = points.length;
  const p = (i: number) => points[((i % n) + n) % n]!;
  const r = (v: number) => Math.round(v);
  let d = `M${r(p(0)[0])} ${r(p(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(x2)} ${r(y2)}`;
  }
  return `${d}Z`;
}

/** One path per ring, outermost first. */
export function contourPaths(hills: Hill[], steps = 18): string[] {
  const paths: string[] = [];
  for (const hill of hills) {
    const rand = random(hill.seed);
    // Three wobble harmonics shared by all rings of a hill, so the rings nest cleanly.
    const harmonics = [2, 3, 5].map((k) => ({
      k,
      amp: 0.05 + rand() * 0.09,
      phase: rand() * Math.PI * 2,
    }));
    for (let ring = 0; ring < hill.rings; ring++) {
      const base = hill.radius * (1 - ring / hill.rings);
      // Inner rings drift a little towards the summit, like a real slope.
      const shift = (ring / hill.rings) * hill.radius * 0.12;
      const cx = hill.x + shift * Math.cos(harmonics[0]!.phase);
      const cy = hill.y + shift * Math.sin(harmonics[0]!.phase);
      const points: [number, number][] = [];
      for (let i = 0; i < steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const wobble = harmonics.reduce(
          (sum, h) => sum + h.amp * Math.sin(h.k * theta + h.phase + ring * 0.18),
          0,
        );
        const radius = base * (1 + wobble);
        points.push([cx + radius * Math.cos(theta), cy + radius * 0.72 * Math.sin(theta)]);
      }
      paths.push(closedPath(points));
    }
  }
  return paths;
}
