import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import AdmZip from "adm-zip";
import crypto from "node:crypto";

const root = path.resolve(process.env.PROJECT_FILES_ROOT || "./project-files");

function safeName(name) {
  if (typeof name !== "string" || !name || name.length > 180 || name === "." || name === ".." || /[\\/\0]/.test(name)) {
    const err = new Error("Invalid file name");
    err.status = 400;
    throw err;
  }
  return name;
}

function folder(userId, projectId) {
  return path.join(root, String(userId), String(projectId));
}

export async function ensureProjectFolder(userId, projectId) {
  await fs.mkdir(folder(userId, projectId), { recursive: true });
}

export async function listFiles(userId, projectId) {
  await ensureProjectFolder(userId, projectId);
  const entries = await fs.readdir(folder(userId, projectId), { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isFile()) {
      const st = await fs.stat(path.join(folder(userId, projectId), e.name));
      files.push({ name: e.name, size: st.size, mtime: st.mtime.toISOString() });
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export async function writeFile(userId, projectId, name, content) {
  name = safeName(name);
  if (typeof content !== "string" || content.length > 2_000_000) {
    const err = new Error("Text file too large (max 2MB)");
    err.status = 413;
    throw err;
  }
  await ensureProjectFolder(userId, projectId);
  await fs.writeFile(path.join(folder(userId, projectId), name), content, { encoding: "utf8", flag: "w" });
}

export async function readFile(userId, projectId, name) {
  name = safeName(name);
  return fs.readFile(path.join(folder(userId, projectId), name), "utf8");
}

export async function renameFile(userId, projectId, from, to) {
  from = safeName(from);
  to = safeName(to);
  await fs.rename(
    path.join(folder(userId, projectId), from),
    path.join(folder(userId, projectId), to)
  );
}

export async function removeFile(userId, projectId, name) {
  name = safeName(name);
  await fs.unlink(path.join(folder(userId, projectId), name));
}

export async function extractZip(userId, projectId, zipBuffer) {
  await ensureProjectFolder(userId, projectId);
  const dest = folder(userId, projectId);
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  let count = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = path.basename(entry.entryName);
    if (!name || name.startsWith(".") || name.includes("..")) continue;
    if (entry.header.size > 5_000_000) continue; // skip huge files
    const data = entry.getData();
    await fs.writeFile(path.join(dest, name), data);
    count++;
  }
  return { extracted: count };
}

export async function saveUploadedFile(userId, projectId, originalName, buffer) {
  const name = safeName(path.basename(originalName));
  await ensureProjectFolder(userId, projectId);
  await fs.writeFile(path.join(folder(userId, projectId), name), buffer);
  return { name, size: buffer.length };
}

export function newProjectKey() {
  return crypto.randomUUID();
}
