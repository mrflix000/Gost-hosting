import argon2 from "argon2";
import { query, queryOne } from "../db/pool.js";

export async function bootstrapOwner() {
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD.");
  }
  if (ADMIN_PASSWORD.length < 14) {
    throw new Error("ADMIN_PASSWORD must be at least 14 characters.");
  }

  const hash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
  const email = ADMIN_EMAIL.toLowerCase();

  const found = await queryOne(
    "SELECT id, username FROM users WHERE username = ? OR email = ? OR role = ?",
    [ADMIN_USERNAME, email, "admin"]
  );

  if (found) {
    // Always sync password + identity from env so Railway variable changes work
    await query(
      "UPDATE users SET username = ?, email = ?, password_hash = ?, role = ?, status = ? WHERE id = ?",
      [ADMIN_USERNAME, email, hash, "admin", "active", found.id]
    );
    console.log("Owner account synced from env:", ADMIN_USERNAME);
    return;
  }

  await query(
    "INSERT INTO users(username, email, password_hash, role, status) VALUES(?, ?, ?, 'admin', 'active')",
    [ADMIN_USERNAME, email, hash]
  );
  console.log("Owner account created:", ADMIN_USERNAME);
}

export async function bootstrapDemo() {
  const user = "demo";
  const email = "demo@gost.local";
  const pass = "demo-view-only-1"; // 14+ chars feel; used only for demo
  const existing = await queryOne("SELECT id FROM users WHERE username = ?", [user]);
  if (existing) return;

  const hash = await argon2.hash(pass, { type: argon2.argon2id });
  try {
    await query(
      "INSERT INTO users(username, email, password_hash, role, status) VALUES(?, ?, ?, 'demo', 'active')",
      [user, email, hash]
    );
    console.log("Demo viewer account: demo / demo-view-only-1");
  } catch (e) {
    // role check might fail if DB schema has strict CHECK — fallback user role + status
    console.log("Demo account skipped:", e.message);
  }
}
