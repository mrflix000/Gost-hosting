import {Router} from "express";import {pool} from "../db/pool.js";import {requireAdmin} from "../middleware/auth.js";
const r=Router();r.get("/",requireAdmin,async(req,res,next)=>{try{const q=await pool.query("SELECT a.*,u.username FROM activity_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 150");res.json({activity:q.rows})}catch(e){next(e)}});export default r;
