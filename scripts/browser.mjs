import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Use an explicitly provided browser, or the pinned headless Chromium on Linux
 * x64. The latter also supplies NSS and software WebGL on minimal sandboxes.
 * Elsewhere, let Remotion find/download its normal browser.
 */
export async function browserExecutable() {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) {
    const executable = path.resolve(process.env.REMOTION_BROWSER_EXECUTABLE);
    if (!fs.existsSync(executable)) throw new Error(`Browser not found: ${executable}`);
    return executable;
  }
  if (process.platform !== "linux" || process.arch !== "x64") return undefined;

  // The package pins its extraction helper alongside its Chromium build. Use
  // it explicitly so the Lambda libraries are also available outside Lambda.
  const { default: LambdaFS } = require("@sparticuz/chromium/build/lambdafs.js");
  const packageDir = path.dirname(require.resolve("@sparticuz/chromium/package.json"));
  const bin = path.join(packageDir, "bin");
  const [executable, libs] = await Promise.all([
    LambdaFS.inflate(path.join(bin, "chromium.br")),
    LambdaFS.inflate(path.join(bin, "al2023.tar.br")),
    LambdaFS.inflate(path.join(bin, "swiftshader.tar.br")),
    LambdaFS.inflate(path.join(bin, "fonts.tar.br")),
  ]);
  process.env.LD_LIBRARY_PATH = [path.join(libs, "lib"), os.tmpdir(), process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(path.delimiter);
  return executable;
}
