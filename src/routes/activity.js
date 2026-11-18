import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { listActivity } from "../services/audit.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/", async (req, res, next) => {
  try {
    const logs = await listActivity(150);
    res.json({ logs });
  } catch (e) { next(e); }
});

export default r;
