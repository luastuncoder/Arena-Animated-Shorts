// Original 10-second visual test: a paper plane takes a sightseeing flight
// through a town and makes an unplanned landing. All timings are in 30 fps frames.
export const FPS = 30;
export const TOTAL = 300;
// build.ts from the skill uses D0 as the ground level when constructing houses.
export const D0 = 0;
export type V3 = [number, number, number];
export type Shot = { id: number; a: number; b: number; label: string; cInf: number };
export const SHOTS: Shot[] = [
  { id: 1, a: 0, b: 105, label: "town / takeoff", cInf: 7 },
  { id: 2, a: 105, b: 196, label: "the plane glides and stalls", cInf: 13 },
  { id: 3, a: 196, b: TOTAL, label: "the unexpected landing", cInf: 12 },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const B = (a: V3, b: V3, c: V3, d: V3, t: number): V3 => {
  const u = clamp01(t), v = 1 - u;
  return [0, 1, 2].map((i) => v ** 3 * a[i] + 3 * v * v * u * b[i] + 3 * v * u * u * c[i] + u ** 3 * d[i]) as V3;
};

/** Single continuous world-space trajectory across both camera cuts. */
export function planeAt(f: number): V3 {
  if (f < 105) return B([-2.0, 2.75, 0.1], [-1.5, 3.55, -0.1], [-0.8, 4.0, -0.9], [0.05, 3.7, -1.0], f / 105);
  if (f < 196) return B([0.05, 3.7, -1.0], [0.85, 4.1, -1.1], [1.30, 3.25, -0.5], [0.82, 2.9, 0.18], (f - 105) / 91);
  if (f < 227) return B([0.82, 2.9, 0.18], [0.70, 2.65, 0.24], [0.40, 2.02, 0.28], [0.24, 1.81, 0.30], (f - 196) / 31);
  // Its lower fold rests on the crown rather than hovering above it.
  const bounce = f < 251 ? 0.12 * Math.sin(((f - 227) / 24) * Math.PI) * (1 - (f - 227) / 24) : 0;
  return [0.24 + 0.012 * Math.sin(f * 0.11), 1.81 + bounce, 0.3];
}

export function planeRoll(f: number) {
  if (f < 105) return 0.18 + 0.08 * Math.sin(f / 24);
  if (f < 196) return lerp(0.2, -0.7, glide((f - 130) / 66));
  if (f < 227) return lerp(-0.7, -0.08, glide((f - 196) / 31));
  return -0.08 + Math.sin((f - 227) * 0.55) * 0.14 * Math.exp(-(f - 227) / 12);
}

export type Cam = { pos: V3; look: V3; fov: number; roll: number; focus: V3 };
/** Fresh shot plan: each hold creeps; big changes are hard cuts rather than discontinuous glides. */
export function camAt(f: number): Cam {
  const plane = planeAt(f);
  if (f < 105) {
    const k = glide(f / 104);
    return {
      pos: [lerp(0.65, 0.35, k), lerp(2.9, 2.75, k), lerp(10.0, 8.6, k)],
      look: [lerp(-0.05, 0.15, k), lerp(2.0, 2.2, k), -0.35],
      fov: 38, roll: lerp(-0.014, 0.015, k), focus: [0, 1.7, 0],
    };
  }
  if (f < 196) {
    const t = (f - 105) / 91;
    // Ride beside the plane, keeping it large and giving the houses real parallax.
    return {
      pos: [plane[0] - 0.30 + 0.18 * t, plane[1] + 0.33, plane[2] + 4.45 - 0.40 * t],
      look: [plane[0], plane[1], plane[2] - 0.25],
      fov: 35, roll: lerp(-0.035, 0.045, glide(t)), focus: plane,
    };
  }
  const t = glide((f - 196) / 104);
  return {
    pos: [lerp(0.28, 0.18, t), lerp(2.25, 2.12, t), lerp(5.35, 4.55, t)],
    look: [0.02, lerp(1.62, 1.66, t), 0], fov: 36,
    roll: lerp(0.025, -0.02, t), focus: [0, 1.63, 0],
  };
}

export const IMPACT_FRAME = 227;
