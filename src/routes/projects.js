import { Router } from "express";
import multer from "multer";
import { query, queryOne } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
import { manifest } from "../services/runtime-manifests.js";
import {
  ensureProjectFolder, writeFile, listFiles, readFile,
  renameFile, removeFile, extractZip, saveUploadedFile
} from "../services/project-files.js";
import { listPackages, addPackage, removePackage, getCatalog } from "../services/packages.js";
import { startProject, stopProject, getStatus, proxyToProject } from "../services/runtime.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 50) * 1024 * 1024 }
});

const r = Router();
r.use(requireAuth);

async function owned(req, id) {
  return queryOne(
    "SELECT * FROM projects WHERE id = ? AND (? = 'admin' OR owner_id = ?)",
    [id, req.session.user.role, req.session.user.id]
  );
}

r.get("/", async (req, res, next) => {
  try {
    let rows;
    if (req.session.user.role === "admin") {
      const q = await query(
        "SELECT p.*, u.username AS owner_name FROM projects p JOIN users u ON u.id = p.owner_id ORDER BY p.id DESC"
      );
      rows = q.rows;
    } else {
      const q = await query(
        "SELECT * FROM projects WHERE owner_id = ? ORDER BY id DESC",
        [req.session.user.id]
      );
      rows = q.rows;
    }
    res.json({ projects: rows });
  } catch (e) { next(e); }
});

r.post("/", async (req, res, next) => {
  try {
    const { name, runtime, description = "" } = req.body;
    if (!name || name.length > 80 || !["node", "python"].includes(runtime)) {
      return res.status(400).json({ error: "Choose a valid project name and runtime" });
    }
    const result = await query(
      "INSERT INTO projects(owner_id, name, runtime, description) VALUES(?, ?, ?, ?)",
      [req.session.user.id, name, runtime, description]
    );
    // Get the new id
    let project;
    if (result.lastInsertRowid) {
      project = await queryOne("SELECT * FROM projects WHERE id = ?", [result.lastInsertRowid]);
    } else {
      project = await queryOne(
        "SELECT * FROM projects WHERE owner_id = ? AND name = ? ORDER BY id DESC LIMIT 1",
        [req.session.user.id, name]
      );
    }
    await ensureProjectFolder(req.session.user.id, project.id);
    for (const [file, content] of Object.entries(manifest(runtime, name))) {
      await writeFile(req.session.user.id, project.id, file, content);
    }
    await audit(req.session.user.id, "project.create", { id: project.id, runtime });
    res.status(201).json({ project });
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    res.json({ project: p });
  } catch (e) { next(e); }
});

r.patch("/:id", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    const { name, runtime, description } = req.body;
    if (name !== undefined) {
      if (!name || name.length > 80) return res.status(400).json({ error: "Invalid name" });
      await query("UPDATE projects SET name = ? WHERE id = ?", [name, p.id]);
    }
    if (runtime !== undefined) {
      if (!["node", "python"].includes(runtime)) return res.status(400).json({ error: "Invalid runtime" });
      await query("UPDATE projects SET runtime = ? WHERE id = ?", [runtime, p.id]);
    }
    if (description !== undefined) {
      await query("UPDATE projects SET description = ? WHERE id = ?", [description, p.id]);
    }
    await audit(req.session.user.id, "project.update", { id: p.id, name, runtime });
    const updated = await queryOne("SELECT * FROM projects WHERE id = ?", [p.id]);
    res.json({ project: updated });
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    await query("DELETE FROM projects WHERE id = ?", [p.id]);
    await audit(req.session.user.id, "project.delete", { id: p.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Files
r.get("/:id/files", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    res.json({ files: await listFiles(p.owner_id, p.id) });
  } catch (e) { next(e); }
});

r.get("/:id/files/:name", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    const content = await readFile(p.owner_id, p.id, req.params.name);
    res.json({ name: req.params.name, content });
  } catch (e) { next(e); }
});

r.put("/:id/files/:name", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    await writeFile(p.owner_id, p.id, req.params.name, String(req.body.content ?? ""));
    await audit(req.session.user.id, "file.save", { projectId: p.id, name: req.params.name });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/:id/files/rename", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    await renameFile(p.owner_id, p.id, req.body.from, req.body.to);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.delete("/:id/files/:name", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    await removeFile(p.owner_id, p.id, req.params.name);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ZIP upload + extract
r.post("/:id/upload-zip", upload.single("zip"), async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    if (!req.file) return res.status(400).json({ error: "No ZIP file uploaded" });
    const result = await extractZip(p.owner_id, p.id, req.file.buffer);
    await audit(req.session.user.id, "project.zip_extract", { projectId: p.id, ...result });
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

// Single file upload
r.post("/:id/upload", upload.single("file"), async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const result = await saveUploadedFile(p.owner_id, p.id, req.file.originalname, req.file.buffer);
    await audit(req.session.user.id, "file.upload", { projectId: p.id, name: result.name });
    res.json({ ok: true, file: result });
  } catch (e) { next(e); }
});

// Packages
r.get("/:id/packages", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    const installed = await listPackages(p.id);
    const catalog = getCatalog(p.runtime);
    res.json({ installed, catalog, runtime: p.runtime });
  } catch (e) { next(e); }
});

r.post("/:id/packages", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    const { name, version = "latest", manager } = req.body;
    if (!name) return res.status(400).json({ error: "Package name required" });
    const mgr = manager || (p.runtime === "node" ? "npm" : "pip");
    const result = await addPackage(p.id, name, version, mgr, {
      ownerId: p.owner_id,
      runtime: p.runtime
    });
    await audit(req.session.user.id, "package.add", { projectId: p.id, name, manager: mgr });
    res.json({ ok: true, install: result?.installResult || null });
  } catch (e) { next(e); }
});

r.delete("/:id/packages/:pkgId", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    await removePackage(p.id, req.params.pkgId);
    await audit(req.session.user.id, "package.remove", { projectId: p.id, pkgId: req.params.pkgId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});


// Runtime process control (Node / Python)
r.get("/:id/runtime", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    res.json(getStatus(p.id));
  } catch (e) { next(e); }
});

r.post("/:id/runtime/start", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    if (!["node", "python"].includes(p.runtime)) {
      return res.status(400).json({ error: "Only Node.js and Python can be started" });
    }
    const status = await startProject({
      projectId: p.id,
      ownerId: p.owner_id,
      runtime: p.runtime,
      name: p.name
    });
    await audit(req.session.user.id, "runtime.start", { projectId: p.id, runtime: p.runtime });
    res.json(status);
  } catch (e) { next(e); }
});

r.post("/:id/runtime/stop", async (req, res, next) => {
  try {
    const p = await owned(req, req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });
    const status = stopProject(p.id);
    await audit(req.session.user.id, "runtime.stop", { projectId: p.id });
    res.json(status);
  } catch (e) { next(e); }
});


export default r;
