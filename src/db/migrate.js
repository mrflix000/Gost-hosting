import "dotenv/config";
import {pool} from "./pool.js";
await pool.query(`
CREATE TABLE IF NOT EXISTS users(
 id BIGSERIAL PRIMARY KEY, username VARCHAR(40) UNIQUE NOT NULL,
 email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK(role IN('admin','user')),
 status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN('active','suspended')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS activity_logs(
 id BIGSERIAL PRIMARY KEY, actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
 action VARCHAR(100) NOT NULL, details JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS projects(
 id BIGSERIAL PRIMARY KEY, owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name VARCHAR(80) NOT NULL, runtime VARCHAR(12) NOT NULL CHECK(runtime IN('node','python','php')),
 railway_project_id TEXT, railway_environment_id TEXT, railway_service_id TEXT,
 repository TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS session(
 sid VARCHAR NOT NULL PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMP(6) NOT NULL);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);
`);
console.log("Migration complete"); await pool.end();
