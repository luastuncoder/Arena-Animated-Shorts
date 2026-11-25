import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const defaultPython = process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python";
const python = process.env.SHORTS_PYTHON || path.resolve(defaultPython);
if (!fs.existsSync(python)) {
  console.error(`Python not found at ${python}. Create .venv and install requirements.txt first, or set SHORTS_PYTHON to an executable path.`);
  process.exit(1);
}
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const ffprobe = require("@ffprobe-installer/ffprobe").path;
const env = { ...process.env, PATH: [path.dirname(ffmpeg), path.dirname(ffprobe), process.env.PATH].filter(Boolean).join(path.delimiter) };
const child = spawnSync(python, process.argv.slice(2), { stdio: "inherit", env });
if (child.error) throw child.error;
process.exit(child.status ?? 1);
