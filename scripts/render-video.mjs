import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { onBrowserLog, positiveNumber, prepareRender } from "./remotion-setup.mjs";

const { values } = parseArgs({
  options: {
    id: { type: "string", default: "BridgeShort" },
    entry: { type: "string", default: "src/index.ts" },
    output: { type: "string", default: "out/bridge-example/video.mp4" },
    scale: { type: "string", default: "1" },
    dpr: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    concurrency: { type: "string", default: "1" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log("npm run render -- [--id BridgeShort] [--output out/video.mp4] [--scale 1.3333333333333333] [--from 0 --to 29] [--dpr 0.5] [--concurrency 1]");
  process.exit(0);
}
if (path.extname(values.output).toLowerCase() !== ".mp4") throw new Error("--output must end in .mp4.");
const scale = positiveNumber(values.scale, "--scale");
const dpr = values.dpr === undefined ? undefined : positiveNumber(values.dpr, "--dpr");
const concurrency = positiveNumber(values.concurrency, "--concurrency");
if (!Number.isInteger(concurrency)) throw new Error("--concurrency must be a positive integer.");
if ((values.from === undefined) !== (values.to === undefined)) throw new Error("Pass both --from and --to, or neither.");
let frameRange;
if (values.from !== undefined) {
  const from = Number(values.from), to = Number(values.to);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) throw new Error("Invalid frame range.");
  frameRange = [from, to];
}
fs.mkdirSync(path.dirname(path.resolve(values.output)), { recursive: true });
const options = await prepareRender({ entry: values.entry, id: values.id, dpr });
if (frameRange && frameRange[1] >= options.composition.durationInFrames) throw new Error("Frame range is outside the composition.");
const { renderMedia } = await import("@remotion/renderer");
await renderMedia({
  ...options,
  codec: "h264",
  crf: 16,
  outputLocation: path.resolve(values.output),
  scale,
  concurrency,
  frameRange,
  timeoutInMilliseconds: 180000,
  onBrowserLog,
  onProgress: ({ progress }) => process.stdout.write(`\rRendering ${Math.round(progress * 100)}%`),
});
console.log(`\nRendered ${values.id} to ${values.output}`);
