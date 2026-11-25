import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { onBrowserLog, positiveNumber, prepareRender } from "./remotion-setup.mjs";

const { values } = parseArgs({
  options: {
    id: { type: "string", default: "BridgeShort" },
    entry: { type: "string", default: "src/index.ts" },
    frame: { type: "string", default: "60" },
    output: { type: "string", default: "out/bridge-example/frame-60.png" },
    scale: { type: "string", default: "0.25" },
    dpr: { type: "string" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log("npm run still -- [--id BridgeShort] [--frame 60] [--output out/frame.png] [--scale 0.25] [--dpr 0.5] [--entry src/index.ts]");
  process.exit(0);
}
const frame = Number(values.frame);
if (!Number.isInteger(frame) || frame < 0) throw new Error("--frame must be a non-negative integer.");
const scale = positiveNumber(values.scale, "--scale");
const dpr = values.dpr === undefined ? undefined : positiveNumber(values.dpr, "--dpr");
const ext = path.extname(values.output).toLowerCase();
if (![".png", ".jpg", ".jpeg"].includes(ext)) throw new Error("--output must end in .png, .jpg or .jpeg.");
fs.mkdirSync(path.dirname(path.resolve(values.output)), { recursive: true });
const options = await prepareRender({ entry: values.entry, id: values.id, dpr });
if (frame >= options.composition.durationInFrames) throw new Error("--frame is outside the composition.");
const { renderStill } = await import("@remotion/renderer");
await renderStill({
  ...options,
  frame,
  output: path.resolve(values.output),
  imageFormat: ext === ".png" ? "png" : "jpeg",
  ...(ext === ".png" ? {} : { jpegQuality: 88 }),
  scale,
  timeoutInMilliseconds: 180000,
  onBrowserLog,
});
console.log(`Rendered ${values.id} frame ${frame} to ${values.output}`);
