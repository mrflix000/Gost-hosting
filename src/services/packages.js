import { query, queryOne } from "../db/pool.js";
import { addPackageInstall } from "./runtime.js";

export const PACKAGE_CATALOG = {
  node: [
    { name: "telegraf", description: "Telegram bots (modern)", manager: "npm" },
    { name: "node-telegram-bot-api", description: "Telegram Bot API", manager: "npm" },
    { name: "grammy", description: "Telegram bots (lightweight)", manager: "npm" },
    { name: "discord.js", description: "Discord bots", manager: "npm" },
    { name: "axios", description: "HTTP client", manager: "npm" },
    { name: "node-fetch", description: "Fetch API", manager: "npm" },
    { name: "dotenv", description: "Env variables", manager: "npm" },
    { name: "express", description: "Web / webhooks", manager: "npm" },
    { name: "ws", description: "WebSockets", manager: "npm" },
    { name: "cron", description: "Scheduled jobs", manager: "npm" },
    { name: "node-cron", description: "Cron jobs", manager: "npm" },
    { name: "sqlite3", description: "SQLite", manager: "npm" },
    { name: "better-sqlite3", description: "Fast SQLite", manager: "npm" },
    { name: "mongoose", description: "MongoDB", manager: "npm" },
    { name: "ioredis", description: "Redis", manager: "npm" },
    { name: "cheerio", description: "HTML scraping", manager: "npm" },
    { name: "puppeteer-core", description: "Browser automation", manager: "npm" },
    { name: "form-data", description: "Multipart forms", manager: "npm" },
    { name: "uuid", description: "UUIDs", manager: "npm" },
    { name: "dayjs", description: "Dates", manager: "npm" }
  ],
  python: [
    { name: "python-telegram-bot", description: "Telegram bots (PTB)", manager: "pip" },
    { name: "aiogram", description: "Telegram bots (async)", manager: "pip" },
    { name: "telebot", description: "pyTelegramBotAPI", manager: "pip" },
    { name: "pyTelegramBotAPI", description: "Telegram Bot API", manager: "pip" },
    { name: "discord.py", description: "Discord bots", manager: "pip" },
    { name: "requests", description: "HTTP library", manager: "pip" },
    { name: "httpx", description: "Async HTTP", manager: "pip" },
    { name: "aiohttp", description: "Async HTTP server/client", manager: "pip" },
    { name: "flask", description: "Web / webhooks", manager: "pip" },
    { name: "fastapi", description: "Modern API", manager: "pip" },
    { name: "python-dotenv", description: "Env files", manager: "pip" },
    { name: "apscheduler", description: "Schedulers", manager: "pip" },
    { name: "sqlalchemy", description: "SQL toolkit", manager: "pip" },
    { name: "beautifulsoup4", description: "HTML parsing", manager: "pip" },
    { name: "lxml", description: "XML/HTML", manager: "pip" },
    { name: "pillow", description: "Images", manager: "pip" },
    { name: "pandas", description: "Data analysis", manager: "pip" },
    { name: "pytz", description: "Timezones", manager: "pip" }
  ]
};

export async function listPackages(projectId) {
  const res = await query(
    "SELECT id, name, version, manager, installed_at FROM packages WHERE project_id = ? ORDER BY installed_at DESC",
    [projectId]
  );
  return res.rows;
}

export async function addPackage(projectId, name, version = "latest", manager = "npm", meta = {}) {
  const existing = await queryOne(
    "SELECT id FROM packages WHERE project_id = ? AND name = ?",
    [projectId, name]
  );
  if (existing) {
    await query("UPDATE packages SET version = ?, manager = ? WHERE id = ?", [version, manager, existing.id]);
  } else {
    await query(
      "INSERT INTO packages(project_id, name, version, manager) VALUES(?, ?, ?, ?)",
      [projectId, name, version, manager]
    );
  }

  // Real install on disk if owner/runtime provided
  let installResult = null;
  if (meta.ownerId && meta.runtime) {
    installResult = await addPackageInstall({
      ownerId: meta.ownerId,
      projectId,
      runtime: meta.runtime,
      name,
      version
    });
  }
  return { installResult };
}

export async function removePackage(projectId, packageId) {
  await query("DELETE FROM packages WHERE id = ? AND project_id = ?", [packageId, projectId]);
}

export function getCatalog(runtime) {
  return PACKAGE_CATALOG[runtime] || [];
}
