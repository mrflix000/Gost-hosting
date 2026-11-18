import { Router } from "express";
import argon2 from "argon2";
import { query, queryOne } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { audit } from "../services/audit.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/users", async (req, res, next) => {
  try {
    const q = await query(
      "SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ users: q.rows });
  } catch (e) { next(e); }
});

r.post("/users", async (req, res, next) => {
  try {
    const { username, email, password, role = "user" } = req.body;
    if (!username || !email || !password || password.length < 10) {
      return res.status(400).json({ error: "Username, email and password (10+ chars) required" });
    }
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await query(
      "INSERT INTO users(username, email, password_hash, role) VALUES(?, ?, ?, ?)",
      [username, email.toLowerCase(), hash, role === "admin" ? "admin" : "user"]
    );
    await audit(req.session.user.id, "user.create", { username });
    res.status(201).json({ ok: true });
  } catch (e) {
    if (String(e.message).includes("UNIQUE") || e.code === "23505") {
      return res.status(409).json({ error: "Username or email already exists" });
    }
    next(e);
  }
});

r.patch("/users/:id", async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const u = await queryOne("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!u) return res.status(404).json({ error: "User not found" });
    if (status) await query("UPDATE users SET status = ? WHERE id = ?", [status, u.id]);
    if (role) await query("UPDATE users SET role = ? WHERE id = ?", [role, u.id]);
    await audit(req.session.user.id, "user.update", { id: u.id, status, role });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.delete("/users/:id", async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.session.user.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    await query("DELETE FROM users WHERE id = ?", [req.params.id]);
    await audit(req.session.user.id, "user.delete", { id: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
