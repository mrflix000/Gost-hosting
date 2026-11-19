import { Router } from "express";
import argon2 from "argon2";
import { query, queryOne } from "../db/pool.js";
import { audit } from "../services/audit.js";

const r = Router();

r.post("/login", async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (!username || !password) {
      return res.status(400).json({ error: "Enter username/email and password" });
    }

    const u = await queryOne(
      "SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)",
      [username, username]
    );

    if (!u) {
      return res.status(401).json({ error: "Wrong username or password" });
    }
    if (u.status === "pending") {
      return res.status(403).json({ error: "Account pending admin approval" });
    }
    if (u.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }
    if (u.status !== "active") {
      return res.status(403).json({ error: "Account not active" });
    }

    let ok = false;
    try {
      ok = await argon2.verify(u.password_hash, password);
    } catch {
      ok = false;
    }
    if (!ok) {
      return res.status(401).json({ error: "Wrong username or password" });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate(err => (err ? reject(err) : resolve()));
    });
    req.session.user = {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role
    };
    await new Promise((resolve, reject) => {
      req.session.save(err => (err ? reject(err) : resolve()));
    });
    await audit(u.id, "auth.login");
    res.json({ user: req.session.user });
  } catch (e) {
    next(e);
  }
});

r.post("/register", async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!username || username.length < 3 || username.length > 40) {
      return res.status(400).json({ error: "Username 3–40 characters" });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }
    if (password.length < 10) {
      return res.status(400).json({ error: "Password at least 10 characters" });
    }
    const exists = await queryOne(
      "SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)",
      [username, email]
    );
    if (exists) {
      return res.status(409).json({ error: "Username or email already used" });
    }
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await query(
      "INSERT INTO users(username, email, password_hash, role, status) VALUES(?, ?, ?, 'user', 'pending')",
      [username, email, hash]
    );
    await audit(null, "auth.register", { username, email });
    res.status(201).json({ ok: true, message: "Registered — wait for admin approval" });
  } catch (e) {
    next(e);
  }
});

r.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("gost.sid");
    res.json({ ok: true });
  });
});

r.get("/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

export default r;
