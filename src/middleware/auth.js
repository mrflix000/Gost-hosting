export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

/** Demo can read; block write methods */
export function blockDemoWrites(req, res, next) {
  if (req.session?.user?.role === "demo" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return res.status(403).json({ error: "Demo account is view-only" });
  }
  next();
}
