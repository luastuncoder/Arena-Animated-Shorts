// "The Clockmaker's Bird" — a 41-second narrated short, 8 shots at 30 fps.
// A clockmaker builds a brass bird that cannot sing; a real sparrow answers it at dawn.
export const FPS = 30;
export const TOTAL = 1230;
export const D0 = 0;
export type V3 = [number, number, number];
export type Shot = { id: number; a: number; b: number; label: string; cInf: number };
/** Shot cuts are placed in the gaps between narration lines, so no line is split by a cut. */
export const SHOTS: Shot[] = [
  { id: 1, a: 0, b: 189, label: "the town that keeps time", cInf: 11 },
  { id: 2, a: 189, b: 402, label: "the workshop", cInf: 7 },
  { id: 3, a: 402, b: 564, label: "he builds one anyway", cInf: 8 },
  { id: 4, a: 564, b: 732, label: "the first test", cInf: 9 },
  { id: 5, a: 732, b: 863, label: "the open window", cInf: 10 },
  { id: 6, a: 863, b: 946, label: "dawn", cInf: 14 },
  { id: 7, a: 946, b: 1060, label: "something answers", cInf: 8 },
  { id: 8, a: 1060, b: 1230, label: "the town learns a new song", cInf: 13 },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Cam = { pos: V3; look: V3; fov: number; roll: number; focus: V3 };

/**
 * Cameras are placed relative to a subject, never by hand: the camera sits at
 * `target + normalize(from) * dist`, so the subject is always framed.
 */
const aim = (target: V3, from: V3, dist: number, fov: number, roll: number): Cam => {
  const len = Math.hypot(from[0], from[1], from[2]) || 1;
  return {
    pos: [target[0] + (from[0] / len) * dist, target[1] + (from[1] / len) * dist, target[2] + (from[2] / len) * dist],
    look: target, fov, roll, focus: target,
  };
};
const mixV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Subject points, in world space (see world.ts for the set). */
export const SUBJ = {
  town: [0.0, 5.2, -6.0] as V3,
  manChest: [-1.72, 1.28, -5.0] as V3,
  hands: [-1.0, 1.1, -4.1] as V3,
  birdBench: [-0.68, 1.06, -4.06] as V3,
  sill: [0.6, 1.2, -5.2] as V3,
  twoBirds: [0.62, 1.1, -5.19] as V3,
};

/** Eight deliberate shots. */
export function camAt(f: number): Cam {
  const shot = shotAt(f);
  const s = shot.id;
  const t = (f - shot.a) / (shot.b - shot.a);
  const k = glide(t);
  switch (s) {
    case 1:
      return aim(mixV([0.2, 3.9, -3.0] as V3, [0.0, 5.6, -4.2] as V3, k), [0.22, 0.16, 1], lerp(9.6, 8.2, k), 50, lerp(0.012, -0.006, k));
    case 2:
      // the man behind his bench: a 3/4 shot, room around him
      return aim(mixV([-1.3, 1.3, -4.5] as V3, [-1.24, 1.28, -4.45] as V3, k), [0.3, 0.42, 1], lerp(3.2, 3.0, k), 36, lerp(0.008, -0.007, k));
    case 3:
      // the work on the bench: hands, gears, the brass wing
      return aim(mixV([-0.86, 1.1, -4.1] as V3, [-0.72, 1.09, -4.08] as V3, k), [0.14, 0.5, 1], lerp(1.35, 1.2, k), 34, lerp(0.006, -0.005, k));
    case 4:
      // the bird alone, front on; the long pause
      return aim(mixV([-0.68, 1.05, -4.06] as V3, [-0.68, 1.05, -4.06] as V3, k), [0.03, 0.12, 1], lerp(1.25, 1.1, k), 28, lerp(-0.006, 0.004, k));
    case 5:
      // dusk: the sill and the bird on it, the man out of focus at the left edge
      return aim(mixV([0.62, 1.3, -5.2] as V3, [0.62, 1.24, -5.2] as V3, k), [0.22, 0.1, 1], lerp(2.7, 2.4, k), 42, lerp(-0.008, 0.008, k));
    case 6:
      // dawn: the window fills with light, a slow push to the sill
      return aim(mixV(SUBJ.sill, [0.6, 1.14, -5.2] as V3, k), [0.12, 0.08, 1], lerp(2.3, 1.85, k), 37, lerp(0.006, -0.006, k));
    case 7:
      // the sparrow lands: a two-shot of both birds
      return aim(mixV([0.62, 1.1, -5.19] as V3, [0.63, 1.09, -5.19] as V3, k), [0.02, 0.12, 1], lerp(1.8, 1.66, k), 30, lerp(0.004, -0.003, k));
    default:
      return aim(mixV([0.1, 4.0, -3.4] as V3, [0.0, 5.8, -4.6] as V3, k), [0.2, 0.17, 1], lerp(9.2, 7.8, k), 50, lerp(-0.01, 0.008, k));
  }
}

/** Narration timings, in frames: one clip per shot, placed in the gaps between cuts. */
export const VO_START = [18, 192, 404, 568, 736, 868, 950, 1066];

/** Light state through the film: day → dusk → blue hour → sunrise → golden day. */
// the light leaves the room through shots 5-6 and comes back warm on the sill
export const duskAt = (f: number) => Math.min(glide((f - 716) / 150), 1 - glide((f - 940) / 120));
export const nightAt = (f: number) => glide((f - 846) / 60) * (1 - glide((f - 946) / 70));
export const dawnAt = (f: number) => glide((f - 952) / 96);
export const goldenAt = (f: number) => (f < 1060 ? 0 : glide((f - 1060) / 90));
/** 1 indoors, 0 outdoors — the renderer switches light rigs on this. */
export const indoorAt = (f: number) => (f >= SHOTS[1].a && f < SHOTS[7].a ? 1 : 0);

/** Story beats: the sparrow lands, the brass bird's spring catches, the town settles into a new time. */
export const LANDING = 1000;
export const SPRING = 1046;
export const FINAL_TICK = 1120;
/** The town's clocks get one clean snap as they all agree; everything else keeps ticking under it. */
export const SNAP = 1116;
