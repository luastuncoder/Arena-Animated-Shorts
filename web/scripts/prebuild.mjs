// Vercel builds only the repository, and the rendered videos live in
// ../deliverables (committed). Copy them into public/media before `next build`
// so the player serves real files from its own origin.
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolved from this file, so it works from the repo root or from web/.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dst = path.join(webRoot, "public", "media");
const src = path.resolve(webRoot, "..", "deliverables");

const map = [
  ["clockmakers-bird.mp4", "clockmakers-bird.mp4"],
  ["clockmakers-bird-poster.jpg", "clockmakers-bird-poster.jpg"],
  ["kite-thief.mp4", "kite-thief.mp4"],
  ["kite-thief-poster.jpg", "kite-thief-poster.jpg"],
  ["animated-test-v2-web.mp4", "unexpected-landing.mp4"],
  ["animated-test-v2-poster.jpg", "unexpected-landing-poster.jpg"],
];

await mkdir(dst, { recursive: true });
for (const [from, to] of map) {
  try {
    const s = await stat(path.join(src, from));
    await copyFile(path.join(src, from), path.join(dst, to));
    console.log(`[prebuild] ${to} · ${(s.size / 1048576).toFixed(1)} MB`);
  } catch {
    const have = await readdir(dst).catch(() => []);
    console.log(`[prebuild] ${to}: source missing, ${have.includes(to) ? "using the copy already in public/media" : "WARNING: not available"}`);
  }
}
