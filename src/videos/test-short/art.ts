import { Pen, blobPts, headBlob } from "../../../.claude/skills/cartoon-3d-short/templates/bridge/toon";

// An original little explorer, drawn with the skill's 600 × 1000 Pen API.
// The small backing canvas keeps per-frame texture uploads inexpensive.
export function drawExplorer(canvas: HTMLCanvasElement, frame: number) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas 2D is unavailable");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 600, canvas.height / 1000);
  const p = new Pen(g);
  p.ol = 8;

  const walk = Math.max(0, Math.min(1, (98 - frame) / 18));
  const stride = Math.sin(frame * 0.23) * 49 * walk;
  const leftLift = Math.max(0, Math.sin(frame * 0.23)) * 28 * walk;
  const rightLift = Math.max(0, -Math.sin(frame * 0.23)) * 28 * walk;
  const bob = Math.abs(Math.sin(frame * 0.23)) * 7 * walk;
  g.save();
  g.translate(0, -bob);

  // Legs and shoes, drawn behind the coat.
  p.line([[278, 607], [260 + stride * 0.5, 752], [237 + stride, 938 - leftLift]], "#455776", 20);
  p.line([[324, 607], [340 - stride * 0.5, 752], [364 - stride, 938 - rightLift]], "#455776", 20);
  p.ell(225 + stride, 947 - leftLift, 48, 20, "#403a46", 7);
  p.ell(377 - stride, 947 - rightLift, 48, 20, "#403a46", 7);

  // The right hand rises into a wave once the star arrives.
  const waveIn = Math.max(0, Math.min(1, (frame - 108) / 24));
  const waveOut = Math.max(0, Math.min(1, (287 - frame) / 24));
  const wave = waveIn * waveOut;
  const waveAngle = Math.sin((frame - 120) * 0.19) * 20 * wave;
  const handX = 435 + waveAngle;
  const handY = 520 - wave * 170;
  p.line([[226, 420], [180, 477], [155 + stride * 0.25, 522]], "#48a59f", 23);
  p.dot(155 + stride * 0.25, 522, 16);
  p.line([[374, 420], [410, 478 - wave * 65], [handX, handY]], "#48a59f", 23);
  p.dot(handX, handY, 16);

  // Coat, warm scarf, and a small satchel: distinct from the bridge cast.
  p.poly([[224, 400], [376, 400], [394, 570], [365, 625], [235, 625], [206, 570]], "#48a59f", 10);
  p.poly([[225, 432], [212, 570], [235, 625], [258, 620], [256, 415]], "#39847f", 0);
  p.poly([[238, 391], [365, 389], [371, 424], [238, 427]], "#e87955", 8);
  p.poly([[310, 416], [347, 419], [351, 498], [327, 518], [306, 493]], "#ed8c62", 7);
  p.poly([[221, 495], [250, 499], [262, 575], [238, 589], [215, 576]], "#c9955c", 6);
  p.stroke([[242, 444], [238, 504]], 8, "#c9955c");
  p.dot(280, 516, 5, "#f7d898");
  p.dot(280, 555, 5, "#f7d898");

  // Hair behind a bean-shaped face, then a small fringe in front.
  p.ell(300, 254, 134, 145, "#4f3a35", 10);
  p.poly(blobPts(300, 248, headBlob(37, 119, 1)), "#eabf99", 10);
  p.poly([[181, 213], [184, 174], [206, 139], [249, 116], [300, 112], [349, 125], [392, 155], [417, 205], [383, 191], [355, 175], [319, 188], [282, 178], [250, 196], [219, 188]], "#4f3a35", 7);
  p.ell(183, 258, 18, 27, "#eabf99", 7);
  p.ell(417, 258, 18, 27, "#eabf99", 7);
  const look = Math.max(0, Math.min(1, (frame - 60) / 30)) * 7;
  const blink = (frame % 117 >= 111 && frame % 117 <= 114);
  if (blink) {
    p.stroke([[257 + look, 239], [273 + look, 239]], 7);
    p.stroke([[326 + look, 239], [342 + look, 239]], 7);
  } else {
    p.dot(264 + look, 239, 8);
    p.dot(333 + look, 239, 8);
  }
  p.arc(300 + look * 0.4, 266, 27, 16, 20, 160, 6);
  g.restore();
}

// An original, hand-drawn star companion on a camera-facing card.
export function drawStar(canvas: HTMLCanvasElement) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas 2D is unavailable");
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.save();
  g.scale(canvas.width / 300, canvas.height / 300);
  const p = new Pen(g);
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 ? 68 : 132;
    points.push([150 + Math.cos(angle) * radius, 150 + Math.sin(angle) * radius]);
  }
  p.poly(points, "#ffd85c", 9);
  p.dot(124, 145, 7);
  p.dot(176, 145, 7);
  p.arc(150, 157, 21, 16, 20, 160, 6);
  g.restore();
}
