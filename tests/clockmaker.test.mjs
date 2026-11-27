import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/videos/clockmaker/story.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
vm.runInNewContext(js, { exports: module.exports, module, Math });
const story = module.exports;

test("the clockmaker film is eight consecutive shots covering 41 seconds", () => {
  assert.equal(story.FPS, 30);
  assert.equal(story.TOTAL, 1230);
  assert.equal(story.SHOTS.length, 8);
  assert.equal(story.SHOTS[0].a, 0);
  assert.equal(story.SHOTS.at(-1).b, story.TOTAL);
  for (let i = 1; i < story.SHOTS.length; i++) assert.equal(story.SHOTS[i - 1].b, story.SHOTS[i].a);
  // 41 s is a real short, not a look test
  assert.ok(story.TOTAL / story.FPS > 30, "the film must be longer than 30 s");
});

test("narration lines land inside their shots and never straddle a cut", () => {
  assert.equal(story.VO_START.length, 8);
  story.VO_START.forEach((start, i) => {
    const shot = story.SHOTS[i];
    assert.ok(start >= shot.a && start < shot.b, `line ${i + 1} starts outside its shot`);
    // longest line is ~6.2 s (06 is short); a line must clear the next cut
    assert.ok(start < shot.b - 8, `line ${i + 1} starts too close to the cut`);
  });
});

test("every camera is finite, in front of its subject and outside the set", () => {
  for (let f = 0; f < story.TOTAL; f++) {
    const cam = story.camAt(f);
    const nums = [...cam.pos, ...cam.look, ...cam.focus, cam.fov, cam.roll];
    assert.ok(nums.every(Number.isFinite), `non-finite camera at ${f}`);
    assert.ok(cam.fov > 10 && cam.fov < 90, `bad fov at ${f}`);
    const d = Math.hypot(cam.pos[0] - cam.look[0], cam.pos[1] - cam.look[1], cam.pos[2] - cam.look[2]);
    assert.ok(d > 0.4 && d < 20, `camera distance ${d.toFixed(2)} at ${f}`);
  }
});

test("the camera never jumps inside a shot, only on a cut", () => {
  for (let f = 1; f < story.TOTAL; f++) {
    if (story.shotAt(f).a === f) continue;
    const a = story.camAt(f - 1).pos, b = story.camAt(f).pos;
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.14, `camera jumps at ${f}`);
  }
});

test("the story's beats sit in the shots they belong to", () => {
  const shotOf = (f) => story.shotAt(f).id;
  assert.equal(shotOf(story.LANDING), 7, "the sparrow lands in the two-shot");
  assert.equal(shotOf(story.SPRING), 7, "the spring catches in the two-shot on the sill");
  assert.equal(shotOf(story.FINAL_TICK), 8);
  assert.ok(story.LANDING < story.SPRING && story.SPRING < story.FINAL_TICK);
});

test("the light goes day → dusk → dawn and ends in golden hour", () => {
  assert.equal(story.duskAt(0), 0);
  assert.ok(story.duskAt(820) > 0.5, "dusk should be established in shot 5");
  assert.ok(story.dawnAt(1000) > 0.4, "dawn should be rising on the sill");
  assert.ok(story.goldenAt(1200) > 0.9, "the closing wide shot is golden");
  assert.equal(story.indoorAt(60), 0);
  assert.equal(story.indoorAt(600), 1);
  assert.equal(story.indoorAt(1200), 0);
});
