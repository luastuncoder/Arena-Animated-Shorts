// Hand-drawn cards for "The Clockmaker's Bird": the old man at his bench, a brass
// songbird (drawn as a cut-out silhouette for close-ups), a live sparrow, and the
// small effects (notes, dust, clock faces).
import { Pen, mix, INK, type Expr, type Outfit, type P2 } from "../plane-test/toon";

const BRASS = "#d7a63c";
const BRASS_LIT = "#f8dc8f";
const BRASS_DEEP = "#8a6320";
const FEATHER = "#8a5a3c";
const FEATHER_DEEP = "#5d3a26";
const BREAST = "#f0dcc0";

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 40): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n, x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
};

/** the clockmaker: stooped, white hair, a work apron, ink-stained fingers */
export const CLOCKMAKER: Outfit = {
  jacket: "#6d7f8f", pants: "#413c46", boots: "#2b2634",
  skin: "#efc7a6", hat: "hair", hair: "#dcd7da", buttons: "#c8a76a", build: "adult",
};

/** A wing: a rounded teardrop plate with three feather grooves, over the bird's back. */
function wingPlate(p: Pen, cx: number, cy: number, len: number, hgt: number, rot: number, fill: string, ink: number, col: string) {
  const pts: P2[] = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const a = (Math.PI * 2 * i) / N;
    // teardrop: wide at the shoulder (right), pointed at the tip (left)
    const k = 0.55 + 0.45 * Math.cos(a);
    pts.push([cx + Math.cos(a) * len * k, cy + Math.sin(a) * hgt * k]);
  }
  const rp = pts.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    return [cx + dx * Math.cos(rot) - dy * Math.sin(rot), cy + dx * Math.sin(rot) + dy * Math.cos(rot)] as P2;
  });
  p.poly(rp, fill, ink);
  for (let i = 1; i <= 3; i++) {
    const f = i / 3.4;
    p.stroke([
      [cx + len * (0.55 - 0.5 * f), cy - hgt * 0.05 * (1 - f)],
      [cx + len * (0.5 - 0.5 * f), cy + hgt * (0.15 + 0.45 * f)],
    ], 3, col);
  }
}

/** One small bird, side on: body, raised head, tapered tail, wing over the back. */
function birdBody(p: Pen, o: {
  cx: number; cy: number; body: number; head: number; headLift: number;
  base: string; deep: string; breast: string; wing: string; wingCol: string;
  ink: number; lift: number;
}) {
  const { cx, cy, body, head, headLift } = o;
  // tail: three tapered feathers sweeping back and down
  for (let i = 0; i < 3; i++) {
    p.poly([
      [cx + body * 0.66, cy - 6 + i * 10], [cx + body * 1.92 - i * 6, cy + 2 + i * 15],
      [cx + body * 1.86 - i * 6, cy + 17 + i * 15], [cx + body * 0.68, cy + 11 + i * 10],
    ], mix(o.deep, o.base, 0.3 + i * 0.22), o.ink);
  }
  // legs
  for (const dx of [-0.2, 0.2]) {
    p.stroke([[cx + body * dx, cy + body * 0.8], [cx + body * dx - 3, cy + body * 1.42]], 7, o.deep);
    p.stroke([[cx + body * dx - 14, cy + body * 1.44], [cx + body * dx + 11, cy + body * 1.44]], 6, o.deep);
  }
  // body
  const bd = ell(cx, cy, body, body * 0.84, -0.05);
  p.shadedFill(bd, o.base, o.deep, -Math.PI * 0.78, body * 1.3, 0.42);
  p.inkRing(bd, o.ink, Math.PI * 0.72, 0.42);
  // pale chest: a soft oval tucked low and forward, clipped by re-drawing the body's ink ring
  const chest = ell(cx - body * 0.34, cy + body * 0.24, body * 0.42, body * 0.4, 0.12);
  p.poly(chest, o.breast, 0);
  // wing over the back, its tip toward the tail
  wingPlate(p, cx + body * 0.12, cy - body * 0.16, body * 0.82, body * 0.5, 0.06 - o.lift, o.wing, o.ink, o.wingCol);
  // neck + head, up and forward of the body
  const hx = cx - body * 0.7, hy = cy - body * 0.62 - headLift;
  p.stroke([[cx - body * 0.34, cy - body * 0.44], [hx + head * 0.24, hy + head * 0.55]], body * 0.86, o.deep);
  const hd = ell(hx, hy, head, head * 0.96, -0.08);
  p.shadedFill(hd, o.base, o.deep, -Math.PI * 0.8, head * 1.3, 0.36);
  p.inkRing(hd, o.ink, Math.PI * 0.7, 0.42);
  return { hx, hy };
}

/** The brass songbird: polished metal, rivets, a copper throat, one glass eye. */
export function drawBrassBird(canvas: HTMLCanvasElement, frame: number, opts: { tick: number; song: number }) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas2D is unavailable");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 400, canvas.height / 400);
  const p = new Pen(g);
  p.ol = 7;
  const cx = 150, cy = 190;
  const { hx, hy } = birdBody(p, {
    cx, cy, body: 60, head: 37, headLift: 4,
    base: BRASS, deep: BRASS_DEEP, breast: "#d98a5a",
    wing: mix(BRASS_LIT, BRASS, 0.5), wingCol: BRASS_DEEP,
    ink: 7, lift: Math.sin(opts.tick * Math.PI) * 0.05,
  });
  // beak: two brass halves, opening when the spring finally catches
  const sing = opts.song;
  p.poly([[hx - 28, hy - 11], [hx - 80, hy - 7], [hx - 28, hy + 1]], BRASS_LIT, 5);
  p.poly([[hx - 28, hy + 1], [hx - 74, hy + 7 + sing * 12], [hx - 28, hy + 13]], mix(BRASS, BRASS_DEEP, 0.4), 5);
  // glass eye, with a glint when it sings
  p.dot(hx - 8, hy - 9, 8.5, "#2c2a3a");
  p.dot(hx - 11, hy - 12, 3.2, mix("#fdf6e3", "#ffd080", Math.min(1, sing * 2)));
  // a wind-up key standing out of its back, turning slowly
  {
    const kx = cx + 16, ky = cy - 44, spin = Math.sin(opts.tick * Math.PI * 2) * 0.18;
    p.stroke([[kx, ky + 18], [kx, ky - 6]], 7, BRASS_DEEP);
    const ring: P2[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      const rx = Math.cos(a) * 20, ry = Math.sin(a) * 13;
      ring.push([kx + rx * Math.cos(spin) - ry * Math.sin(spin), ky - 18 + rx * Math.sin(spin) + ry * Math.cos(spin)]);
    }
    p.poly(ring, BRASS_LIT, 5);
    p.ell(kx, ky - 18, 7, 5, "#c9a24a", 0);
  }
  // rivets along the seam, and the maker's mark
  for (const [dx, dy] of [[-40, 34], [-10, 44], [26, 34], [-26, 16]] as [number, number][]) p.dot(cx + dx, cy + dy, 4, BRASS_DEEP);
  // one note escapes at the very end
  if (sing > 0.02) {
    const a = mix(BRASS, "#fff3d8", sing);
    p.stroke([[hx - 92, hy - 60], [hx - 92, hy - 104]], 4, a);
    p.ell(hx - 104, hy - 52, 13, 10, a, 3);
    p.stroke([[hx - 92, hy - 104], [hx - 70, hy - 112]], 4, a);
  }
}

/** The live sparrow: brown feathers, a pale breast, an open beak when it sings. */
export function drawSparrow(canvas: HTMLCanvasElement, frame: number, opts: { singing: number; hop: number; wing: number }) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas2D is unavailable");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 400, canvas.height / 400);
  const p = new Pen(g);
  p.ol = 7;
  const { singing, hop, wing } = opts;
  const cx = 150, cy = 200 - hop * 22;
  const { hx, hy } = birdBody(p, {
    cx, cy, body: 54, head: 35, headLift: 3,
    base: FEATHER, deep: FEATHER_DEEP, breast: BREAST,
    wing: mix(FEATHER, FEATHER_DEEP, 0.5), wingCol: "#3f271a",
    ink: 6, lift: Math.sin(wing * Math.PI) * 0.2,
  });
  // beak, opening as it sings
  const open = 3 + singing * 16;
  p.poly([[hx - 26, hy - 9], [hx - 66, hy - 6], [hx - 26, hy + 1]], "#e2a55a", 5);
  p.poly([[hx - 26, hy + 1], [hx - 60, hy + 6 + open], [hx - 26, hy + 12]], "#b8793a", 5);
  p.dot(hx - 7, hy - 8, 8, INK);
  p.dot(hx - 10, hy - 11, 3, "#ffffff");
  p.stroke([[hx - 22, hy - 22], [hx + 4, hy - 24]], 4, "#3f271a");
  // song, curling away from the beak
  if (singing > 0.05) {
    for (let i = 0; i < 3; i++) {
      const rad = 22 + i * 16 + singing * 12;
      p.arc(hx - 62, hy, rad, rad * 0.8, 205, 300, 4, mix("#f7efe0", "#ffd9a0", singing));
    }
  }
}

/** Painted clock face, used on the tower and on the workshop wall clocks. */
export function drawClockFace(canvas: HTMLCanvasElement, minutes: number, roman: boolean) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas2D is unavailable");
  const S = canvas.width;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  g.scale(S / 400, S / 400);
  const p = new Pen(g);
  p.ol = 7;
  p.ell(200, 200, 178, 178, "#f2e4c4", 8);
  p.ell(200, 200, 160, 160, "#fbf3de", 0);
  g.strokeStyle = "#6a5a44"; g.lineWidth = 3; g.beginPath(); g.arc(200, 200, 168, 0, Math.PI * 2); g.stroke();
  const nums = roman ? ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"] : null;
  g.fillStyle = "#3b3226";
  g.font = `600 ${roman ? 34 : 30}px Georgia, "Times New Roman", serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const x = 200 + Math.cos(a) * 132, y = 200 + Math.sin(a) * 132;
    if (nums) g.fillText(nums[i], x, y);
    else { p.stroke([[200 + Math.cos(a) * 146, 200 + Math.sin(a) * 146], [200 + Math.cos(a) * 158, 200 + Math.sin(a) * 158]], 8, "#3b3226"); }
  }
  // hands
  const hr = ((minutes / 60) % 12) * (Math.PI * 2) / 12 - Math.PI / 2;
  const mn = (minutes % 60) * (Math.PI * 2) / 60 - Math.PI / 2;
  p.stroke([[200, 200], [200 + Math.cos(hr) * 84, 200 + Math.sin(hr) * 84]], 13, "#2c2520");
  p.stroke([[200, 200], [200 + Math.cos(mn) * 126, 200 + Math.sin(mn) * 126]], 7, "#2c2520");
  p.dot(200, 200, 10, "#b8862f");
}

/** A tiny soft light-mote / dust card. */
export function drawMote(canvas: HTMLCanvasElement) {
  const g = canvas.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,246,220,0.95)");
  gr.addColorStop(0.45, "rgba(255,236,196,0.35)");
  gr.addColorStop(1, "rgba(255,230,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}

export { Expr };

