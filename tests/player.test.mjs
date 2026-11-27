import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const app = path.join(root, "web");
const media = path.join(app, "public", "media");
const library = readFileSync(path.join(app, "lib", "shorts.ts"), "utf8");

const entries = [...library.matchAll(/file:\s*"([^"]+)"[\s\S]*?poster:\s*"([^"]+)"/g)].map((m) => ({
  file: m[1],
  poster: m[2],
}));

test("the player library lists at least two shorts", () => {
  assert.ok(entries.length >= 2, "expected two or more shorts in web/lib/shorts.ts");
});

test("every player entry has a real, non-empty video and poster", () => {
  for (const { file, poster } of entries) {
    for (const name of [file, poster]) {
      const full = path.join(media, name);
      assert.ok(existsSync(full), `${name} is missing from web/public/media`);
      assert.ok(statSync(full).size > 20_000, `${name} looks empty`);
    }
  }
});

test("the player streams rather than forcing a download", () => {
  const player = readFileSync(path.join(app, "app", "player.tsx"), "utf8");
  const page = readFileSync(path.join(app, "app", "page.tsx"), "utf8");
  assert.match(player, /preload="metadata"/, "the video should only preload metadata");
  assert.match(player, /playsInline/, "the video should play inline on phones");
  assert.doesNotMatch(page, /<video[^>]*autoPlay/, "the page must not pull the whole file on load");
  // The videos are plain static media; no download is needed to watch.
  assert.match(player, /src=\{`\/media\/\$\{short\.file\}`\}/, "the player should read /media/<file>");
});
