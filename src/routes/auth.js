import { Router } from "express";
import argon2 from "argon2";
import { query, queryOne } from "../db/pool.js";
import { audit } from "../services/audit.js";

const r = Router();

r.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const u = await queryOne(
      "SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)",
      [String(username || ""), String(username || "")]
    );
    if (!u || u.status !== "active" || !(await argon2.verify(u.password_hash, String(password || "")))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.regenerate(async (e) => {
      if (e) return next(e);
      req.session.user = { id: u.id, username: u.username, email: u.email, role: u.role };
      await audit(u.id, "auth.login");
      res.json({ user: req.session.user });
    });
  } catch (e) {
    next(e);
  }
});

r.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("ghost.sid");
    res.json({ ok: true });
  });
});

r.get("/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

export default r;
