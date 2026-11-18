import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";

const root = path.resolve(process.env.PROJECT_FILES_ROOT || "./project-files");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".php": "text/plain; charset=utf-8",
  ".py": "text/plain; charset=utf-8"
};

function safeJoin(base, ...parts) {
  const target = path.resolve(base, ...parts);
  if (!target.startsWith(path.resolve(base))) {
    const err = new Error("Invalid path");
    err.status = 400;
    throw err;
  }
  return target;
}

export async function servePreview(userId, projectId, filePath, res) {
  const base = path.join(root, String(userId), String(projectId));
  let rel = (filePath || "").replace(/^\/+/, "") || "index.html";
  // block traversal
  if (rel.includes("..") || path.isAbsolute(rel)) {
    res.status(400).send("Invalid path");
    return;
  }

  let full = safeJoin(base, rel);
  try {
    let st = await fs.stat(full);
    if (st.isDirectory()) {
      full = safeJoin(base, rel, "index.html");
      st = await fs.stat(full);
    }
    const ext = path.extname(full).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.setHeader("Content-Type", type);
    res.setHeader("X-Gost-Preview", "1");
    createReadStream(full).pipe(res);
  } catch {
    // fallback: try index.html or show simple page
    try {
      const idx = safeJoin(base, "index.html");
      await fs.access(idx);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      createReadStream(idx).pipe(res);
    } catch {
      res.status(404).type("html").send(`<!doctype html><html><body style="font-family:system-ui;background:#0b0914;color:#f4f0ff;display:grid;place-items:center;min-height:100vh">
<div style="text-align:center"><h2>Preview not found</h2>
<p style="color:#9b92b5">No index.html in this project. Upload or create files first.</p>
<p><a href="/" style="color:#a855f7">Back to Gost Hosting</a></p></div></body></html>`);
    }
  }
}
