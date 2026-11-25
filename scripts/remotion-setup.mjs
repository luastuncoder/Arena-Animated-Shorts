import fs from "node:fs";
import path from "node:path";
import { browserExecutable } from "./browser.mjs";

/** Bundle the workspace and select one composition for either a still or video. */
export async function prepareRender({ entry, id, dpr }) {
  if (process.env.REMOTION_TMP) {
    const tmp = path.resolve(process.env.REMOTION_TMP);
    fs.mkdirSync(tmp, { recursive: true });
    process.env.TMPDIR = process.env.TMP = process.env.TEMP = tmp;
  }
  const executable = await browserExecutable();
  const { bundle } = await import("@remotion/bundler");
  const { selectComposition } = await import("@remotion/renderer");
  const inputProps = dpr === undefined ? {} : { post: { dpr } };
  const chromiumOptions = { gl: process.env.REMOTION_GL || "swangle" };
  const serveUrl = await bundle({
    entryPoint: path.resolve(entry),
    publicDir: path.resolve("public"),
  });
  const composition = await selectComposition({
    serveUrl,
    id,
    inputProps,
    browserExecutable: executable,
    chromiumOptions,
    timeoutInMilliseconds: 180000,
  });
  return { serveUrl, composition, inputProps, browserExecutable: executable, chromiumOptions };
}

export const onBrowserLog = (log) => {
  if (log.type === "error" || log.type === "warning") {
    console.error(`[browser ${log.type}] ${log.text.slice(0, 500)}`);
  }
};

export function positiveNumber(value, name) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number.`);
  return parsed;
}
