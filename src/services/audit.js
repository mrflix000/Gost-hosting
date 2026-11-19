import { query } from "../db/pool.js";
import { isSqlite } from "../config/env.js";

export async function audit(actorId, action, details = {}) {
  const detailsStr = isSqlite() ? JSON.stringify(details) : details;
  try {
    await query(
      "INSERT INTO activity_logs(actor_id, action, details) VALUES(?, ?, ?)",
      [actorId || null, action, detailsStr]
    );
  } catch (e) {
    console.error("Audit failed:", e.message);
  }
}

export async function listActivity(limit = 100) {
  const res = await query(
    `SELECT a.id, a.action, a.details, a.created_at, u.username
     FROM activity_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.id DESC LIMIT ?`,
    [limit]
  );
  return res.rows.map(r => ({
    ...r,
    details: typeof r.details === "string" ? JSON.parse(r.details || "{}") : r.details
  }));
}
