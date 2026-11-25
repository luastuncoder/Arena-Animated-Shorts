import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/videos/plane-test/story.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
vm.runInNewContext(js, { exports: module.exports, module, Math });
const story = module.exports;

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test("the revised test has three consecutive shots covering exactly 300 frames", () => {
  assert.equal(story.FPS, 30);
  assert.equal(story.TOTAL, 300);
  assert.equal(story.SHOTS.length, 3);
  assert.equal(story.SHOTS[0].a, 0);
  assert.equal(story.SHOTS.at(-1).b, 300);
  for (let i = 1; i < story.SHOTS.length; i++) {
    assert.equal(story.SHOTS[i - 1].b, story.SHOTS[i].a);
  }
  const qa = JSON.parse(readFileSync(new URL("../src/videos/plane-test/shots.json", import.meta.url), "utf8"));
  assert.equal(JSON.stringify(qa.shots), JSON.stringify(story.SHOTS.map(({ id, a, b }) => ({ id, a, b }))));
});

test("the aeroplane's trajectory remains continuous at both camera cuts and at impact", () => {
  for (let frame = 0; frame < story.TOTAL - 1; frame++) {
    const current = story.planeAt(frame);
    const next = story.planeAt(frame + 1);
    assert.ok(current.every(Number.isFinite));
    assert.ok(distance(current, next) < 0.14, `flight jumps at frame ${frame}`);
    const camera = story.camAt(frame);
    assert.ok([...camera.pos, ...camera.look, ...camera.focus, camera.fov, camera.roll].every(Number.isFinite));
    assert.ok(camera.fov > 0 && camera.fov < 180);
  }
  assert.equal(story.IMPACT_FRAME, 227);
  assert.ok(Math.abs(story.planeAt(299)[1] - 1.81) < 0.001);
});

test("retained revised video has the expected picture and stereo soundtrack", () => {
  const probe = require("@ffprobe-installer/ffprobe").path;
  const file = new URL("../deliverables/animated-test-v2.mp4", import.meta.url);
  const result = JSON.parse(execFileSync(probe, ["-v", "error", "-show_streams", "-show_format", "-of", "json", fileURLToPath(file)], { encoding: "utf8" }));
  const video = result.streams.find((s) => s.codec_type === "video");
  const audio = result.streams.find((s) => s.codec_type === "audio");
  assert.equal(video?.codec_name, "h264");
  assert.equal(video?.width, 810);
  assert.equal(video?.height, 1440);
  assert.equal(video?.r_frame_rate, "30/1");
  assert.equal(Number(video?.nb_frames), 300);
  assert.equal(audio?.codec_name, "aac");
  assert.equal(Number(audio?.sample_rate), 48000);
  assert.equal(audio?.channels, 2);
  assert.ok(Math.abs(Number(result.format.duration) - 10) < 0.025);
});
