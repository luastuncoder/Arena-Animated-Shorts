import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(".");
const kit = path.join(root, "public/bridge/kenney");
const upstream = path.join(root, ".claude/skills/cartoon-3d-short/templates/bridge/world.ts");

function externalUris(glb) {
  const buffer = fs.readFileSync(glb);
  assert.equal(buffer.subarray(0, 4).toString(), "glTF", `${glb} is not a GLB`);
  assert.equal(buffer.readUInt32LE(4), 2, "expected glTF 2.0");
  assert.equal(buffer.readUInt32LE(8), buffer.length, "GLB declared length does not match file");
  const jsonSize = buffer.readUInt32LE(12);
  assert.equal(buffer.subarray(16, 20).toString(), "JSON", "missing glTF JSON chunk");
  const doc = JSON.parse(buffer.subarray(20, 20 + jsonSize).toString());
  return [...(doc.images || []), ...(doc.buffers || [])]
    .map((item) => item.uri)
    .filter((uri) => uri && !uri.startsWith("data:"));
}

test("all example models and their external files are present locally", () => {
  const source = fs.readFileSync(upstream, "utf8");
  const list = source.match(/const KENNEY = \[([\s\S]*?)\];/);
  assert.ok(list, "could not locate the template's model list");
  const names = [...list[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(names.length, 26);
  for (const name of names) {
    const model = path.join(kit, `${name}.glb`);
    assert.ok(fs.existsSync(model), `missing model: ${name}`);
    for (const uri of externalUris(model)) {
      assert.ok(!/^[a-z]+:/i.test(uri), `remote resource in ${name}: ${uri}`);
      const resource = path.resolve(path.dirname(model), decodeURIComponent(uri));
      assert.ok(resource.startsWith(`${kit}${path.sep}`), `resource escapes kit directory: ${uri}`);
      assert.ok(fs.existsSync(resource), `missing resource ${uri} for ${name}`);
    }
  }
});

test("all directly installed Remotion packages use one exact version", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  const remotion = Object.entries(dependencies).filter(([name]) => name === "remotion" || name.startsWith("@remotion/"));
  assert.ok(remotion.length > 1);
  for (const [name, version] of remotion) assert.equal(version, dependencies.remotion, `${name} version mismatch`);
});
