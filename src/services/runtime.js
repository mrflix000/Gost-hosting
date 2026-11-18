/**
 * Process runner for Node.js & Python — bots, tools, Telegram bots, long-running jobs.
 * Does NOT require HTTP. Logs stream to the panel Terminal.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import net from "node:net";
import http from "node:http";
import { EventEmitter } from "node:events";

const root = path.resolve(process.env.PROJECT_FILES_ROOT || "./project-files");
const running = new Map(); // projectId -> entry
export const runtimeEvents = new EventEmitter();

function projectDir(ownerId, projectId) {
  return path.join(root, String(ownerId), String(projectId));
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

function pushLog(entry, type, text) {
  const line = { type, text: String(text).slice(0, 2000), time: new Date().toISOString() };
  entry.logs.push(line);
  if (entry.logs.length > 500) entry.logs.shift();
  runtimeEvents.emit("log", { projectId: entry.projectId, ...line });
}

function runCmd(cmd, args, cwd, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false", PYTHONUNBUFFERED: "1" }
    });
    let out = "";
    p.stdout.on("data", d => { out += d; });
    p.stderr.on("data", d => { out += d; });
    const t = setTimeout(() => { try { p.kill(); } catch {} resolve({ code: -1, out }); }, timeoutMs);
    p.on("exit", code => { clearTimeout(t); resolve({ code: code ?? 0, out }); });
    p.on("error", err => { clearTimeout(t); resolve({ code: 1, out: err.message }); });
  });
}

export function getStatus(projectId) {
  const e = running.get(String(projectId));
  if (!e) return { running: false, logs: [] };
  return {
    running: true,
    port: e.port,
    runtime: e.runtime,
    pid: e.proc.pid,
    startedAt: e.startedAt,
    name: e.name,
    logs: e.logs.slice(-80)
  };
}

export function listRunning() {
  return [...running.entries()].map(([id, e]) => ({
    projectId: id,
    port: e.port,
    runtime: e.runtime,
    pid: e.proc.pid,
    name: e.name,
    startedAt: e.startedAt
  }));
}

export async function installDeps({ ownerId, projectId, runtime }) {
  const dir = projectDir(ownerId, projectId);
  if (runtime === "node") {
    try {
      await fs.access(path.join(dir, "package.json"));
    } catch {
      return { ok: false, message: "No package.json" };
    }
    const r = await runCmd("npm", ["install", "--omit=dev"], dir, 180000);
    return { ok: r.code === 0, message: r.out.slice(-1500) || "npm install done", code: r.code };
  }
  if (runtime === "python") {
    try {
      await fs.access(path.join(dir, "requirements.txt"));
    } catch {
      return { ok: false, message: "No requirements.txt" };
    }
    const r = await runCmd("pip3", ["install", "-r", "requirements.txt", "--break-system-packages"], dir, 180000);
    return { ok: r.code === 0 || r.code === -1, message: r.out.slice(-1500) || "pip install done", code: r.code };
  }
  return { ok: false, message: "Unsupported runtime" };
}

export async function addPackageInstall({ ownerId, projectId, runtime, name, version }) {
  const dir = projectDir(ownerId, projectId);
  const pkg = version && version !== "latest" ? `${name}@${version}` : name;
  if (runtime === "node") {
    const r = await runCmd("npm", ["install", pkg, "--save"], dir, 180000);
    return { ok: r.code === 0, message: r.out.slice(-1500), code: r.code };
  }
  if (runtime === "python") {
    const r = await runCmd("pip3", ["install", pkg, "--break-system-packages"], dir, 180000);
    // append to requirements if missing
    try {
      const reqPath = path.join(dir, "requirements.txt");
      let cur = "";
      try { cur = await fs.readFile(reqPath, "utf8"); } catch {}
      if (!cur.split(/\n/).some(l => l.trim().startsWith(name))) {
        await fs.writeFile(reqPath, cur + (cur.endsWith("\n") || !cur ? "" : "\n") + name + "\n");
      }
    } catch {}
    return { ok: r.code === 0, message: r.out.slice(-1500), code: r.code };
  }
  return { ok: false, message: "Unsupported" };
}

export async function startProject({ projectId, ownerId, runtime, name }) {
  const id = String(projectId);
  if (running.has(id)) return getStatus(id);

  const dir = projectDir(ownerId, projectId);
  await fs.access(dir);

  const port = await freePort();
  const env = {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "production",
    PYTHONUNBUFFERED: "1"
  };

  // Install deps best-effort before start
  const dep = await installDeps({ ownerId, projectId, runtime });

  let cmd, args;
  if (runtime === "node") {
    let entry = "index.js";
    for (const cand of ["index.js", "bot.js", "main.js", "server.js", "app.js"]) {
      try { await fs.access(path.join(dir, cand)); entry = cand; break; } catch {}
    }
    cmd = "node";
    args = [entry];
  } else if (runtime === "python") {
    let entry = "app.py";
    for (const cand of ["bot.py", "main.py", "app.py", "run.py"]) {
      try { await fs.access(path.join(dir, cand)); entry = cand; break; } catch {}
    }
    cmd = "python3";
    args = [entry];
  } else {
    const err = new Error("Only node and python are supported");
    err.status = 400;
    throw err;
  }

  const proc = spawn(cmd, args, { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });

  const entry = {
    projectId: id,
    proc,
    port,
    runtime,
    name: name || id,
    logs: [],
    startedAt: new Date().toISOString(),
    ownerId
  };
  running.set(id, entry);

  if (dep.message) pushLog(entry, dep.ok ? "ok" : "info", "deps: " + dep.message.split("\n").slice(-5).join(" | "));
  pushLog(entry, "ok", `Starting ${runtime} "${name || id}" · ${cmd} ${args.join(" ")} · PORT=${port}`);

  proc.stdout.on("data", d => {
    String(d).split(/\r?\n/).filter(Boolean).forEach(line => pushLog(entry, "info", line));
  });
  proc.stderr.on("data", d => {
    String(d).split(/\r?\n/).filter(Boolean).forEach(line => pushLog(entry, "err", line));
  });
  proc.on("exit", (code, signal) => {
    pushLog(entry, code === 0 ? "ok" : "err", `Process exited code=${code} signal=${signal || "-"}`);
    running.delete(id);
    runtimeEvents.emit("exit", { projectId: id, code, signal });
  });
  proc.on("error", err => {
    pushLog(entry, "err", err.message);
    running.delete(id);
  });

  await new Promise(r => setTimeout(r, 600));
  return getStatus(id);
}

export function stopProject(projectId) {
  const id = String(projectId);
  const e = running.get(id);
  if (!e) return { running: false };
  pushLog(e, "info", "Stopping…");
  try {
    e.proc.kill("SIGTERM");
    setTimeout(() => { try { e.proc.kill("SIGKILL"); } catch {} }, 4000);
  } catch {}
  running.delete(id);
  return { running: false };
}

export function proxyToProject(projectId, req, res) {
  const e = running.get(String(projectId));
  if (!e) {
    res.status(503).type("html").send(`<!doctype html><html><body style="font-family:system-ui;background:#0b0914;color:#f4f0ff;display:grid;place-items:center;min-height:100vh">
<div style="text-align:center"><h2>Not running</h2>
<p style="color:#9b92b5">Start the project from Gost Hosting first (bots may not serve HTTP).</p>
<a href="/" style="color:#a855f7">Panel</a></div></body></html>`);
    return;
  }
  const url = new URL(req.url, "http://127.0.0.1");
  let pathPart = url.pathname.replace(new RegExp(`^/run/${projectId}`), "") || "/";
  const targetPath = pathPart + (url.search || "");
  const opts = {
    hostname: "127.0.0.1",
    port: e.port,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${e.port}` }
  };
  const proxy = http.request(opts, pref => {
    res.writeHead(pref.statusCode || 502, pref.headers);
    pref.pipe(res);
  });
  proxy.on("error", err => {
    res.status(502).type("text").send(
      "No HTTP response (normal for Telegram bots).\n\n" +
      "Check Terminal logs in the panel.\n" +
      "Error: " + err.message
    );
  });
  req.pipe(proxy);
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    for (const [, e] of running) {
      try { e.proc.kill("SIGTERM"); } catch {}
    }
  });
}
