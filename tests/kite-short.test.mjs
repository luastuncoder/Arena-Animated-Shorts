import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/videos/kite-short/story.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
vm.runInNewContext(js, { exports: module.exports, module, Math });
const story = module.exports;

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test("the kite short has four consecutive shots covering exactly 390 frames", () => {
  assert.equal(story.FPS, 30);
  assert.equal(story.TOTAL, 390);
  assert.equal(story.SHOTS.length, 4);
  assert.equal(story.SHOTS[0].a, 0);
  assert.equal(story.SHOTS.at(-1).b, 390);
  for (let i = 1; i < story.SHOTS.length; i++) assert.equal(story.SHOTS[i - 1].b, story.SHOTS[i].a);
});

test("the kite's path is continuous through the string snap, the loop and the catch", () => {
  for (let frame = 0; frame < story.TOTAL - 1; frame++) {
    const a = story.kiteAt(frame), b = story.kiteAt(frame + 1);
    assert.ok(a.every(Number.isFinite) && b.every(Number.isFinite), `non-finite kite at ${frame}`);
    // The snap is a real break in the string, not in the flight path.
    assert.ok(distance(a, b) < 0.55, `kite jumps at frame ${frame}`);
    const cam = story.camAt(frame);
    assert.ok([...cam.pos, ...cam.look, ...cam.focus, cam.fov, cam.roll].every(Number.isFinite));
    assert.ok(cam.fov > 0 && cam.fov < 180);
    // The chase shot flies with the kite, so only the ground-level shots must stay in front of the set.
    if (frame < 96 || frame >= 210) assert.ok(cam.pos[2] > 3, `camera inside the set at frame ${frame}`);
  }
});

test("the kite lands in the kid's hands at the catch frame", () => {
  const caught = story.kiteAt(story.CATCH_FRAME);
  assert.ok(Math.abs(caught[0] - story.KID_END[0]) < 0.12, "kite not at the kid's hands");
  assert.ok(caught[1] > 0.6 && caught[1] < 1.2, "caught height should be chest height");
});

test("dusk only turns on in the last shot", () => {
  assert.equal(story.duskAt(100), 0);
  assert.equal(story.duskAt(320), 0);
  assert.ok(story.duskAt(389) > 0.6 && story.duskAt(389) <= 0.8);
  for (let f = 0; f < story.TOTAL; f++) assert.ok(story.duskAt(f) >= 0 && story.duskAt(f) <= 1);
});
