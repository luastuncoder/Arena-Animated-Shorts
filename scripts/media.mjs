import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tool = process.argv[2];
const packages = { ffmpeg: "@ffmpeg-installer/ffmpeg", ffprobe: "@ffprobe-installer/ffprobe" };
if (!Object.hasOwn(packages, tool)) {
  console.error("Usage: node scripts/media.mjs ffmpeg|ffprobe [arguments...]");
  process.exit(1);
}
const executable = require(packages[tool]).path;
const child = spawnSync(executable, process.argv.slice(3), { stdio: "inherit" });
if (child.error) throw child.error;
process.exit(child.status ?? 1);
