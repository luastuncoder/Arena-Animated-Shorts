// Hand-drawn cards for "The Kite Thief": the red paper kite and two bean-head characters
// (a kid chasing it, a grandmother in the square). Drawn with the skill's Pen and sizing
// conventions: a 600 x 1000 canvas = 1.08 x 1.8 m in the world.
import { Pen, mix, INK, type Expr, type Outfit, type P2 } from "../plane-test/toon";

const RED = "#d8453c";
const RED_DEEP = "#a8302e";
const RED_LIT = "#ea6a52";
const WOOD = "#b0784a";
const WOOD_DEEP = "#8a5a36";

const ellPts = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 40): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n, x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
};

/** Beveled kite on a 600 x 600 card (paper diamond + ink spars + painted crescent). */
export function drawKite(canvas: HTMLCanvasElement, frame: number, flutter = 0) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas2D is unavailable");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 600, canvas.height / 600);
  const p = new Pen(g);
  p.ol = 11;
  const cx = 300 + Math.sin(frame * 0.31) * 6 * flutter;
  const cy = 300 + Math.sin(frame * 0.23 + 1) * 5 * flutter;
  const a = 210, b = 265;
  const top: P2 = [cx, cy - b], right: P2 = [cx + a, cy - 8], bot: P2 = [cx, cy + b * 0.92], left: P2 = [cx - a, cy - 8];
  // paper body, lit from upper-left
  p.shadedFill([top, right, bot, left], RED, RED_DEEP, -Math.PI * 0.78, 250, 0.36, 0.95, 1.22);
  // far/lower half a touch deeper, like folded paper
  p.poly([left, bot, right, [cx, cy - 8]], null, 0);
  p.stroke([[left[0] + 8, left[1] - 6], [bot[0], bot[1] - 12], [right[0] - 8, right[1] - 6]], 18, mix(RED, RED_DEEP, 0.6));
  // two paper panels: a lighter upper sail and a warm inner triangle
  p.poly([[cx, cy - 8], top, [cx + a * 0.62, cy - 46]], mix(RED, RED_LIT, 0.42), 0);
  p.poly([[cx, cy - 8], left, [cx - a * 0.5, cy + 12]], mix(RED, RED_DEEP, 0.25), 0);
  // wooden spars
  p.line([top, bot], WOOD, 9);
  p.line([left, right], WOOD, 9);
  p.line([[left[0] + 26, left[1] + 2], [right[0] - 26, right[1] + 2]], WOOD_DEEP, 5);
  // bow + knot at the crossing
  p.dot(cx, cy - 8, 13, "#f2d08a");
  p.dot(cx, cy - 8, 6, WOOD_DEEP);
  // ink rim, thicker on the shadow side
  p.inkRing([top, right, bot, left], 7, Math.PI * 0.72, 0.5);
  // a little painted glint on the lit sail
  p.stroke([[cx - 44, cy - 150], [cx - 96, cy - 96]], 10, mix(RED_LIT, "#ffe4cf", 0.55));

  // two paper tails with bows
  const tail = (dir: number, t: number) => {
    const pts: P2[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      pts.push([bot[0] + dir * (u * 150 + Math.sin(u * 4 + t + dir) * 26), bot[1] + u * 230 + u * u * 30]);
    }
    p.stroke(pts, 7, WOOD_DEEP);
    for (const u of [0.35, 0.7]) {
      const bx = bot[0] + dir * (u * 150 + Math.sin(u * 4 + t + dir) * 26), by = bot[1] + u * 230 + u * u * 30;
      const bow = ellPts(bx, by, 30, 20, 0.34 * dir);
      p.poly(bow, dir > 0 ? "#e7c677" : "#5e8fa7", 7);
      p.line([[bx - 10, by], [bx + 10, by]], WOOD_DEEP, 4);
    }
  };
  tail(1, flutter * 0.7);
  tail(-1, flutter * 0.7 + 1.7);
}

type KidOpts = { frame: number; expr: Expr; run: number; look: number; reach: number; hold?: number; seed?: number };
/** The kite thief: a small kid in a mustard coat and blue cap, front on. */
export function drawKid(canvas: HTMLCanvasElement, o: KidOpts) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas2D is unavailable");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 600, canvas.height / 1000);
  const p = new Pen(g);
  const light = -Math.PI * 0.72; // upper left
  const coat = "#e8a340", coatDeep = "#b8762a", pants = "#4a6389", boots = "#4a3540";
  const skin = "#f2c49c", cap = "#e2453c", scarf = "#5e8fa7";
  const run = Math.max(0, Math.min(1, o.run));
  const bob = Math.cos(o.frame * 0.42) * (4 + run * 12);
  const H = 168; // head height (kid proportions)
  const crown = 272 + bob, chin = crown + H * 1.3, torsoTop = chin + 18;
  const hip = torsoTop + 210, sole = 930;
  const look = o.look;

  // legs: scissor when running
  const phase = o.frame * 0.34;
  const swing = Math.sin(phase) * (10 + run * 74);
  for (const side of [-1, 1] as const) {
    const idx = side > 0 ? swing : -swing;
    const knee: P2 = [300 + side * 30 + idx * 0.25, hip + 118];
    const foot: P2 = [300 + side * 34 + idx, sole - 6 - Math.max(0, idx) * 0.16];
    p.line([[300 + side * 26, hip], knee, foot], pants, 26);
    p.poly(ellPts(foot[0] + side * 16, foot[1], 40, 19), boots, 8);
  }

  // coat: flared skirt so it reads as cloth, not a box
  p.gradFill([[300 - 96, torsoTop], [300 + 96, torsoTop], [300 + 118, hip + 26], [300 + 86, hip + 52],
    [300 - 86, hip + 52], [300 - 118, hip + 26]], coat, coatDeep, light, 0.3);
  p.poly([[300 - 96, torsoTop], [300 + 96, torsoTop], [300 + 118, hip + 26], [300 + 86, hip + 52],
    [300 - 86, hip + 52], [300 - 118, hip + 26]], null, 10);
  // placket + buttons
  p.stroke([[300 - 6, torsoTop + 12], [300 - 4, hip + 30]], 5, mix(coat, INK, 0.45));
  for (const y of [torsoTop + 64, torsoTop + 120, torsoTop + 176]) p.dot(300 + 12, y, 7, "#f7e2b0");

  // scarf, ends flying behind
  p.band([[300 - 84, torsoTop + 6], [300, torsoTop + 26], [300 + 84, torsoTop + 2]], scarf, 30, 7);
  const fl = Math.sin(o.frame * 0.5) * 16;
  p.poly([[300 - 70, torsoTop + 12], [300 - 150, torsoTop + 40 + fl], [300 - 160, torsoTop + 66 + fl],
    [300 - 62, torsoTop + 38]], mix(scarf, "#8fc0d4", 0.35), 8);

  // arms: reach up for the kite, otherwise pump while running
  for (const side of [-1, 1] as const) {
    const pump = Math.sin(phase + (side > 0 ? 0 : Math.PI)) * (run * 40);
    const shoulder: P2 = [300 + side * 92, torsoTop + 30];
    const up = o.reach, hold = o.hold ?? 0;
    const elbow: P2 = [300 + side * (128 + up * 12 - hold * 6), torsoTop + 56 + pump * 0.5 - up * 60 + hold * 34];
    const hand: P2 = [300 + side * (108 - up * 26 - hold * 46), torsoTop + 88 + pump - up * 168 - hold * 26];
    p.line([shoulder, elbow, hand], coat, 30);
    p.dot(hand[0], hand[1], 20, skin);
  }

  // head: a wide bean, bigger than the body should allow (kid proportions)
  const hcx = 300, hcy = (crown + chin) / 2;
  const headPts = ellPts(hcx, hcy, 128, H * 0.62);
  p.shadedFill(headPts, skin, mix(skin, "#c98a6a", 0.55), light, 140, 0.34);
  p.inkRing(headPts, 9, Math.PI * 0.7, 0.34);
  // ears
  for (const side of [-1, 1] as const) {
    p.ell(hcx + side * 126, hcy + 12, 24, 30, skin, 8);
  }
  // hair fringe under the cap
  p.poly([[hcx - 118, hcy - 34], [hcx - 60, hcy - 54], [hcx, hcy - 40], [hcx + 58, hcy - 58],
    [hcx + 116, hcy - 30], [hcx + 118, hcy - 66], [hcx - 118, hcy - 74]], "#5a3a28", 8);
  // cap with a forward brim
  const capPts: P2[] = [...ellPts(hcx, hcy - 66, 132, 96, 0, 26).filter((q) => q[1] <= hcy - 62), [hcx + 132, hcy - 70] as P2, [hcx - 132, hcy - 70] as P2];
  p.shadedFill(capPts, cap, mix(cap, INK, 0.4), light, 150, 0.3);
  p.inkRing(capPts, 8, Math.PI * 0.72, 0.42);
  p.band([[hcx - 128, hcy - 66], [hcx + 128, hcy - 66]], mix(cap, "#ffd9a0", 0.32), 20, 5);
  p.ell(hcx + 10, hcy - 116, 22, 18, "#ffe9b8", 6); // button
  p.poly([[hcx + 30, hcy - 62], [hcx + 150, hcy - 40], [hcx + 144, hcy - 8], [hcx + 28, hcy - 24]], mix(cap, INK, 0.18), 8); // brim

  // eyes + brows
  const eyeY = hcy + 10, eyeDX = 48;
  const eyeRoll = look * 12;
  for (const side of [-1, 1] as const) {
    const ex = hcx + side * eyeDX;
    if (o.expr === "laugh" || o.expr === "grin") {
      p.arc(ex, eyeY + 6, 20, 15, 200, 340, 7); // happy arc
    } else {
      p.ell(ex, eyeY, 15, o.expr === "shock" ? 22 : 18, "#2b2233", 0);
      p.dot(ex + eyeRoll, eyeY - 5, 5, "#ffffff");
    }
    const browY = eyeY - 40 - (o.expr === "shock" ? 12 : 0);
    p.stroke([[ex - 22, browY + 6], [ex + 20, browY - 4 + (side > 0 ? 0 : 8)]], 7, "#4a3328");
  }
  // nose + mouth
  p.stroke([[hcx - 4, eyeY + 22], [hcx + 8, eyeY + 38], [hcx - 6, eyeY + 40]], 6, mix(skin, "#b87a5c", 0.7));
  if (o.expr === "shock") p.ell(hcx + 2, eyeY + 70, 22, 26, "#7a3a3a", 6);
  else if (o.expr === "laugh" || o.expr === "grin") {
    p.path([[hcx - 34, eyeY + 52], [hcx, eyeY + 84], [hcx + 34, eyeY + 52]], false);
    g.fillStyle = "#8c3a3a"; g.fill();
    p.stroke([[hcx - 34, eyeY + 52], [hcx, eyeY + 84], [hcx + 34, eyeY + 52]], 7, INK);
    p.stroke([[hcx - 34, eyeY + 52], [hcx + 34, eyeY + 52]], 7, INK);
  } else p.arc(hcx + 2, eyeY + 54, 22, 14, 20, 160, 7);
  // cheeks
  for (const side of [-1, 1] as const) p.ell(hcx + side * 84, eyeY + 34, 22, 13, mix(skin, "#e8836f", 0.45), 0, 0, 360);
}

type GranOpts = { frame: number; expr: Expr; look: number; clap: number; seed?: number };
/** The neighbour: a grandmother in a lilac shawl and bun, front on. */
export function drawGran(canvas: HTMLCanvasElement, o: GranOpts) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas2D is unavailable");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 600, canvas.height / 1000);
  const p = new Pen(g);
  const light = -Math.PI * 0.72;
  const dress = "#8a6ea8", dressDeep = "#5c4677", shawl = "#d9c3a1", shawlDeep = "#b39a78";
  const skin = "#f0c8a8", hair = "#d8d3dd";
  const H = 132;
  const crown = 268, chin = crown + H * 1.34, torsoTop = chin - 18;
  const hip = torsoTop + 236, sole = 930;
  const bob = Math.sin(o.frame * 0.09) * 3;

  // long dress: one soft trapezoid to the soles
  p.gradFill([[300 - 104, torsoTop + bob], [300 + 104, torsoTop + bob], [300 + 150, sole], [300 - 150, sole]],
    dress, dressDeep, light, 0.3);
  p.poly([[300 - 104, torsoTop + bob], [300 + 104, torsoTop + bob], [300 + 150, sole], [300 - 150, sole]], null, 10);
  p.stroke([[300 - 12, torsoTop + 40], [300 - 18, sole - 20]], 4, mix(dress, INK, 0.4));
  for (let i = 0; i < 5; i++) p.dot(300 + 44, torsoTop + 92 + i * 34, 6, "#efe2c8");
  // shoes peek out
  for (const side of [-1, 1] as const) p.poly(ellPts(300 + side * 58, sole - 10, 46, 18), "#4a3540", 8);

  // arms: raised in a clap when the kite is caught
  for (const side of [-1, 1] as const) {
    const up = o.clap;
    const shoulder: P2 = [300 + side * 96, torsoTop + 40 + bob];
    const elbow: P2 = [300 + side * (138 + up * 20), torsoTop + 96 - up * 40];
    const hand: P2 = [300 + side * (74 - up * 6), torsoTop + 150 - up * 190];
    p.line([shoulder, elbow, hand], shawl, 32);
    p.dot(hand[0], hand[1], 21, skin);
  }
  // shawl over the shoulders
  p.gradFill([[300 - 110, torsoTop + 4 + bob], [300 + 110, torsoTop + 4 + bob], [300 + 128, torsoTop + 96],
    [300, torsoTop + 124], [300 - 128, torsoTop + 96]], shawl, shawlDeep, light, 0.26);
  p.poly([[300 - 110, torsoTop + 4 + bob], [300 + 110, torsoTop + 4 + bob], [300 + 128, torsoTop + 96],
    [300, torsoTop + 124], [300 - 128, torsoTop + 96]], null, 10);
  for (let i = 0; i < 7; i++) p.stroke([[300 - 104 + i * 32, torsoTop + 92], [300 - 116 + i * 32, torsoTop + 124]], 5, mix(shawlDeep, INK, 0.25));

  // head
  const hcx = 300, hcy = (crown + chin) / 2 + bob * 0.6;
  const headPts = ellPts(hcx, hcy, 116, H * 0.63);
  p.shadedFill(headPts, skin, mix(skin, "#c08a6c", 0.5), light, 132, 0.34);
  p.inkRing(headPts, 9, Math.PI * 0.7, 0.34);
  // bun + hair band
  p.ell(hcx + 4, hcy - 104, 66, 52, hair, 8);
  p.stroke([[hcx - 74, hcy - 44], [hcx - 24, hcy - 62], [hcx + 40, hcy - 62], [hcx + 88, hcy - 40]], 26, hair);
  for (const side of [-1, 1] as const) p.ell(hcx + side * 116, hcy + 16, 22, 28, skin, 8);

  // brows, eyes, glasses (two thin ink rings + bridge)
  const eyeY = hcy + 8, eyeDX = 44;
  for (const side of [-1, 1] as const) {
    const ex = hcx + side * eyeDX;
    p.ell(ex, eyeY, 30, 26, "#fdf8ee", 6);
    p.ell(ex + o.look * 8, eyeY, 12, 14, "#2b2233", 0);
    p.dot(ex + o.look * 8 - 4, eyeY - 5, 4, "#ffffff");
    p.stroke([[ex - 26, eyeY - 42], [ex + 22, eyeY - 46]], 6, "#c9c2d0");
  }
  p.stroke([[hcx - 14, eyeY - 2], [hcx + 14, eyeY - 2]], 5, "#6a6470");
  // nose + smile
  p.stroke([[hcx - 2, eyeY + 24], [hcx + 8, eyeY + 40], [hcx - 8, eyeY + 42]], 6, mix(skin, "#b87a5c", 0.7));
  if (o.expr === "laugh" || o.expr === "grin" || o.expr === "smile" || o.expr === "smile_closed") {
    p.arc(hcx + 2, eyeY + 54, 30, 20, 15, 165, 7);
  } else p.stroke([[hcx - 22, eyeY + 58], [hcx + 24, eyeY + 58]], 7);
  for (const side of [-1, 1] as const) p.ell(hcx + side * 80, eyeY + 38, 20, 12, mix(skin, "#e8836f", 0.4), 0, 0, 360);
  // the small silk flower pinned at her temple
  p.ell(hcx - 96, hcy - 34, 20, 20, "#e7b4c4", 6);
  p.dot(hcx - 96, hcy - 34, 8, "#f2d08a");
  // a soft kerchief tied at the nape, drawn behind the face (hair and bun stay visible)
  p.poly([[hcx - 122, hcy + 10], [hcx - 118, hcy - 40], [hcx - 60, hcy - 26], [hcx - 40, hcy + 18]], shawl, 8);
  p.poly([[hcx + 122, hcy + 10], [hcx + 118, hcy - 40], [hcx + 60, hcy - 26], [hcx + 40, hcy + 18]], shawl, 8);
}

/** Tiny hand-drawn "!" and "heart" effect cards, on square canvases. */
export function drawBurst(canvas: HTMLCanvasElement, t: number) {
  const g = canvas.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 600, canvas.height / 600);
  const p = new Pen(g);
  const cols = ["#ffd166", "#f4a259", "#ef7d6b"];
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 + t * 0.6;
    const r0 = 90 + 30 * t, r1 = 170 + 70 * Math.min(1, t * 1.4);
    p.stroke([[300 + Math.cos(a) * r0, 300 + Math.sin(a) * r0], [300 + Math.cos(a) * r1, 300 + Math.sin(a) * r1]],
      14, cols[i % 3]);
  }
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI * 2 * i) / 7 + 0.4;
    p.dot(300 + Math.cos(a) * (210 + 40 * t), 300 + Math.sin(a) * (210 + 40 * t), 12, "#fff3c4");
  }
}
