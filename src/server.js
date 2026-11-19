import "dotenv/config";
import express from "express";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEnv, isSqlite } from "./config/env.js";
import { query } from "./db/pool.js";
import { bootstrapOwner } from "./services/bootstrap.js";
import { errorHandler } from "./middleware/errors.js";
import { blockDemoWrites } from "./middleware/auth.js";
import auth from "./routes/auth.js";
import admin from "./routes/admin.js";
import projects from "./routes/projects.js";
import railway from "./routes/railway.js";
import activity from "./routes/activity.js";
import { servePreview } from "./services/preview.js";
import { proxyToProject, getStatus as runtimeStatus } from "./services/runtime.js";
import { queryOne } from "./db/pool.js";

validateEnv();

const app = express();
const dir = path.dirname(fileURLToPath(import.meta.url));

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 200, standardHeaders: true, legacyHeaders: false }));

app.use(session({
  name: "gost.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: "auto",
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/"
  }
}));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: process.env.APP_NAME || "Gost Hosting",
    db: isSqlite() ? "sqlite" : "postgres"
  });
});

app.use("/api/auth", auth);
app.use("/api/admin", blockDemoWrites, admin);
app.use("/api/projects", blockDemoWrites, projects);
app.use("/api/railway", blockDemoWrites, railway);
app.use("/api/activity", activity);


// Live file preview for projects (static hosting from project folder)
app.get("/preview/:projectId/*", async (req, res, next) => {
  try {
    if (!req.session?.user) return res.status(401).send("Login required");
    const projectId = req.params.projectId;
    const p = await queryOne(
      "SELECT * FROM projects WHERE id = ? AND (? = 'admin' OR owner_id = ?)",
      [projectId, req.session.user.role, req.session.user.id]
    );
    if (!p) return res.status(404).send("Project not found");
    const filePath = req.params[0] || "";
    await servePreview(p.owner_id, p.id, filePath, res);
  } catch (e) { next(e); }
});
app.get("/preview/:projectId", async (req, res, next) => {
  try {
    if (!req.session?.user) return res.status(401).send("Login required");
    const projectId = req.params.projectId;
    const p = await queryOne(
      "SELECT * FROM projects WHERE id = ? AND (? = 'admin' OR owner_id = ?)",
      [projectId, req.session.user.role, req.session.user.id]
    );
    if (!p) return res.status(404).send("Project not found");
    await servePreview(p.owner_id, p.id, "index.html", res);
  } catch (e) { next(e); }
});


// Live runtime proxy — Node/Python processes
app.all("/run/:projectId", async (req, res, next) => {
  try {
    if (!req.session?.user) return res.status(401).send("Login required");
    const projectId = req.params.projectId;
    const p = await queryOne(
      "SELECT * FROM projects WHERE id = ? AND (? = 'admin' OR owner_id = ?)",
      [projectId, req.session.user.role, req.session.user.id]
    );
    if (!p) return res.status(404).send("Project not found");
    proxyToProject(p.id, req, res);
  } catch (e) { next(e); }
});
app.all("/run/:projectId/*", async (req, res, next) => {
  try {
    if (!req.session?.user) return res.status(401).send("Login required");
    const projectId = req.params.projectId;
    const p = await queryOne(
      "SELECT * FROM projects WHERE id = ? AND (? = 'admin' OR owner_id = ?)",
      [projectId, req.session.user.role, req.session.user.id]
    );
    if (!p) return res.status(404).send("Project not found");
    proxyToProject(p.id, req, res);
  } catch (e) { next(e); }
});

app.use(express.static(path.join(dir, "../public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(dir, "../public/index.html"));
});

app.use(errorHandler);

async function ensureSchema() {
  const sqlite = isSqlite();
  if (sqlite) {
    await query(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await query(`CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await query(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      runtime TEXT NOT NULL,
      description TEXT DEFAULT '',
      railway_project_id TEXT,
      railway_environment_id TEXT,
      railway_service_id TEXT,
      repository TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await query(`CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      version TEXT DEFAULT 'latest',
      manager TEXT NOT NULL,
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } else {
    await query(`CREATE TABLE IF NOT EXISTS users(
      id BIGSERIAL PRIMARY KEY, username VARCHAR(40) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'user', status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS activity_logs(
      id BIGSERIAL PRIMARY KEY, actor_id BIGINT,
      action VARCHAR(100) NOT NULL, details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS projects(
      id BIGSERIAL PRIMARY KEY, owner_id BIGINT NOT NULL, name VARCHAR(80) NOT NULL,
      runtime VARCHAR(12) NOT NULL, description TEXT DEFAULT '',
      railway_project_id TEXT, railway_environment_id TEXT, railway_service_id TEXT,
      repository TEXT, status VARCHAR(20) NOT NULL DEFAULT 'created',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS packages(
      id BIGSERIAL PRIMARY KEY, project_id BIGINT NOT NULL, name VARCHAR(120) NOT NULL,
      version VARCHAR(40) DEFAULT 'latest', manager VARCHAR(20) NOT NULL,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }
}

async function start() {
  await ensureSchema();
  await bootstrapOwner();
  try {
    const { bootstrapDemo } = await import("./services/bootstrap.js");
    await bootstrapDemo();
  } catch (e) { console.log("demo bootstrap:", e.message); }
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Gost Hosting online on :${port} (${isSqlite() ? "SQLite" : "PostgreSQL"})`);
  });
}

start().catch(e => {
  console.error("Failed to start:", e);
  process.exit(1);
});
