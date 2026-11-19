import pg from "pg";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { isSqlite, getDbPath } from "../config/env.js";
import { normalize } from "./sql.js";

let sqliteDb = null;
let pgPool = null;

export function getDb() {
  if (isSqlite()) {
    if (!sqliteDb) {
      const dbPath = getDbPath();
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      sqliteDb = new Database(dbPath);
      sqliteDb.pragma("journal_mode = WAL");
      sqliteDb.pragma("foreign_keys = ON");
    }
    return { type: "sqlite", db: sqliteDb };
  }

  if (!pgPool) {
    pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 10
    });
  }
  return { type: "pg", pool: pgPool };
}

export async function query(sqlText, params = []) {
  const { text, params: p } = normalize(sqlText, params);
  const driver = getDb();

  if (driver.type === "sqlite") {
    const stmt = driver.db.prepare(text);
    if (/^\s*(SELECT|PRAGMA)/i.test(text)) {
      const rows = stmt.all(...p);
      return { rows, rowCount: rows.length };
    }
    const info = stmt.run(...p);
    return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  return driver.pool.query(text, p);
}

export async function queryOne(sqlText, params = []) {
  const res = await query(sqlText, params);
  return res.rows[0] || null;
}

export async function closeDb() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}
