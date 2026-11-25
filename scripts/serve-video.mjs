import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Serve only the player and its own media, never the repository or its secrets.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const media = path.join(root, "deliverables/animated-test-10s.mp4");
const routes = {
  "/": { path: path.join(root, "preview/index.html"), type: "text/html; charset=utf-8" },
  "/poster.jpg": { path: path.join(root, "preview/poster.jpg"), type: "image/jpeg" },
  "/video.mp4": { path: media, type: "video/mp4" },
  "/download": { path: media, type: "video/mp4", download: true },
};

const port = Number(process.env.PORT || 4173);
const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const route = routes[pathname];
  if (!route) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  let size;
  try {
    size = statSync(route.path).size;
  } catch {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" }).end("The requested file is not ready.");
    return;
  }
  const headers = {
    "Content-Type": route.type,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  };
  if (route.download) headers["Content-Disposition"] = 'attachment; filename="animated-test-10s.mp4"';

  let start = 0;
  let end = size - 1;
  let status = 200;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    if (!match[1]) {
      const suffix = Number(match[2]);
      start = Math.max(0, size - suffix);
    } else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(Number(match[2]), size - 1);
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = createReadStream(route.path, { start, end });
  stream.on("error", () => res.destroy());
  stream.pipe(res);
});
server.listen(port, "0.0.0.0", () => console.log(`Video player ready on port ${port}`));
