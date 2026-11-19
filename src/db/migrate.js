import "dotenv/config";
import { query, closeDb, getDb } from "./pool.js";
import { isSqlite } from "../config/env.js";

async function migrate() {
  const sqlite = isSqlite();

  if (sqlite) {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        runtime TEXT NOT NULL CHECK(runtime IN ('node','python','php')),
        description TEXT DEFAULT '',
        railway_project_id TEXT,
        railway_environment_id TEXT,
        railway_service_id TEXT,
        repository TEXT,
        status TEXT NOT NULL DEFAULT 'created',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        version TEXT DEFAULT 'latest',
        manager TEXT NOT NULL,
        installed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS session (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire TEXT NOT NULL
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire)`);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS users(
        id BIGSERIAL PRIMARY KEY,
        username VARCHAR(40) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK(role IN('admin','user')),
        status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN('active','suspended')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs(
        id BIGSERIAL PRIMARY KEY,
        actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS projects(
        id BIGSERIAL PRIMARY KEY,
        owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(80) NOT NULL,
        runtime VARCHAR(12) NOT NULL CHECK(runtime IN('node','python','php')),
        description TEXT DEFAULT '',
        railway_project_id TEXT,
        railway_environment_id TEXT,
        railway_service_id TEXT,
        repository TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'created',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS packages(
        id BIGSERIAL PRIMARY KEY,
        project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        version VARCHAR(40) DEFAULT 'latest',
        manager VARCHAR(20) NOT NULL,
        installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS session(
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire)`);
  }

  console.log("Migration complete (" + (sqlite ? "SQLite" : "PostgreSQL") + ")");
  await closeDb();
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
