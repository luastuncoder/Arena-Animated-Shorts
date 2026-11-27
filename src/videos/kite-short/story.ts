// Original 13-second short: "The Kite Thief" — a kid loses a red kite to the wind,
// chases it across the town, and catches it just as the lanterns come on.
// All timings are in 30 fps frames.
export const FPS = 30;
export const TOTAL = 390;
export const D0 = 0;
export type V3 = [number, number, number];
export type Shot = { id: number; a: number; b: number; label: string; cInf: number };
export const SHOTS: Shot[] = [
  { id: 1, a: 0, b: 96, label: "the square / the string snaps", cInf: 6 },
  { id: 2, a: 96, b: 210, label: "over the rooftops", cInf: 15 },
  { id: 3, a: 210, b: 320, label: "the dive", cInf: 9 },
  { id: 4, a: 320, b: TOTAL, label: "caught at dusk", cInf: 14 },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const B = (a: V3, b: V3, c: V3, d: V3, t: number): V3 => {
  const u = clamp01(t), v = 1 - u;
  return [0, 1, 2].map((i) => v ** 3 * a[i] + 3 * v * v * u * b[i] + 3 * v * u * u * c[i] + u ** 3 * d[i]) as V3;
};

export const BREAK_FRAME = 62;
export const CATCH_FRAME = 352;
/** Where the kid stands at the start, and where the kite comes down. */
export const KID_HOME: V3 = [-0.34, 0.02, 0];
export const KID_END: V3 = [-0.34, 0.02, 0.05];

/** The kite on its string: a lively figure-of-eight above the street, pulled tighter as the wind rises. */
function tethered(f: number): V3 {
  const t = f / 30;
  const pull = glide(f / 96) * 0.3;
  return [
    -0.30 + 0.80 * Math.sin(t * 1.05) * (1 + pull),
    4.35 + 0.46 * Math.sin(t * 1.6 + 0.6) + 0.30 * pull,
    0.15 + 0.26 * Math.cos(t * 0.85),
  ];
}
const LET_GO = tethered(96);

/** One continuous kite path: tethered dance → snapped string → long loop over the roofs → dive into the kid's hands. */
export function kiteAt(f: number): V3 {
  if (f < 96) return tethered(f);
  if (f < 210) {
    // Free flight: climbs away down the street, then curls back toward the lens.
    return B(LET_GO, [1.5, 7.4, -7.5], [0.7, 10.4, -19.0], [-1.25, 7.4, -13.0], (f - 96) / 114);
  }
  if (f < CATCH_FRAME) {
    // The dive: a long S-curve from the rooftops down into the kid's hands.
    return B([-1.25, 7.4, -13.0], [-1.55, 6.0, -3.6], [1.30, 3.15, 0.30], [-0.36, 0.84, 0.50], (f - 210) / (CATCH_FRAME - 210));
  }
  // Caught: a small settling shiver in the kid's hands.
  const k = Math.exp(-(f - CATCH_FRAME) / 9);
  return [-0.36 + 0.02 * Math.sin((f - CATCH_FRAME) * 0.5) * k, 0.84 + 0.03 * Math.sin((f - CATCH_FRAME) * 0.7) * k, 0.48];
}

export function kiteRoll(f: number) {
  if (f < BREAK_FRAME) return 0.2 * Math.sin(f / 14) + 0.08;
  if (f < 210) return lerp(0.3, 9.4, glide((f - BREAK_FRAME) / 100));
  if (f < CATCH_FRAME) return lerp(9.4, 20.6, glide((f - 210) / (CATCH_FRAME - 210)));
  return 20.6 + 0.9 * Math.sin((f - CATCH_FRAME) * 0.4) * Math.exp(-(f - CATCH_FRAME) / 10);
}

export type Cam = { pos: V3; look: V3; fov: number; roll: number; focus: V3 };
/** Four deliberate shots: a held wide, a chase, a low wide, then a close-up on the catch. */
export function camAt(f: number): Cam {
  const kite = kiteAt(f);
  if (f < 96) {
    const k = glide(f / 95);
    return {
      pos: [lerp(0.62, 0.30, k), lerp(2.85, 2.70, k), lerp(9.9, 8.5, k)],
      look: [lerp(-0.10, 0.10, k), lerp(2.35, 2.55, k), -0.35],
      fov: 38, roll: lerp(-0.016, 0.014, k), focus: [-0.3, 1.6, 0],
    };
  }
  if (f < 210) {
    const t = (f - 96) / 114;
    // Fly beside the kite, slightly under it, so the town slides past below.
    return {
      pos: [kite[0] - 0.95 + 0.30 * t, kite[1] - 0.40, kite[2] + 4.6 + 0.6 * t],
      look: [kite[0] - 0.10, kite[1] - 0.25, kite[2] - 1.6],
      fov: 42, roll: lerp(0.05, -0.06, glide(t)), focus: kite,
    };
  }
  if (f < 320) {
    const t = glide((f - 210) / 110);
    return {
      pos: [lerp(0.40, 0.18, t), lerp(2.60, 2.15, t), lerp(8.4, 6.9, t)],
      look: [lerp(-0.05, -0.12, t), lerp(2.55, 2.05, t), 0.1], fov: 39,
      roll: lerp(-0.028, 0.02, t), focus: [0.1, 1.9, -1.5],
    };
  }
  const t = glide((f - 320) / 69);
  return {
    pos: [lerp(0.20, 0.30, t), lerp(1.52, 1.40, t), lerp(6.05, 5.65, t)],
    look: [lerp(-0.66, -0.62, t), lerp(1.16, 1.10, t), 0.2], fov: 41,
    roll: lerp(0.02, -0.014, t), focus: [-0.5, 1.1, 0.2],
  };
}

/** 0 = clear afternoon, 1 = lantern dusk. The last shot warms as the town lights up. */
export const duskAt = (f: number) => (f < 318 ? 0 : 0.78 * glide((f - 322) / 46));

export const STRING_FRAMES: [number, number] = [0, BREAK_FRAME];
