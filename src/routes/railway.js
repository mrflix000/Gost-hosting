import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as railway from "../railway/client.js";
import { audit } from "../services/audit.js";

const r = Router();
r.use(requireAuth, requireAdmin);

r.get("/projects", async (req, res, next) => {
  try {
    const projects = await railway.listProjects();
    res.json({ projects });
  } catch (e) { next(e); }
});

r.post("/services", async (req, res, next) => {
  try {
    const { projectId, name, repository } = req.body;
    const svc = await railway.createService(projectId, name, repository);
    await audit(req.session.user.id, "railway.service_create", { name });
    res.json({ service: svc });
  } catch (e) { next(e); }
});

r.post("/deploy", async (req, res, next) => {
  try {
    const { serviceId, environmentId } = req.body;
    await railway.deploy(serviceId, environmentId);
    await audit(req.session.user.id, "railway.deploy", { serviceId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/redeploy", async (req, res, next) => {
  try {
    const { serviceId, environmentId } = req.body;
    await railway.redeploy(serviceId, environmentId);
    await audit(req.session.user.id, "railway.redeploy", { serviceId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.delete("/services/:id", async (req, res, next) => {
  try {
    await railway.deleteService(req.params.id);
    await audit(req.session.user.id, "railway.service_delete", { id: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
