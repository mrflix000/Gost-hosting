import {pool} from "../db/pool.js";
export async function audit(actor,action,details={}){await pool.query(
 "INSERT INTO activity_logs(actor_id,action,details) VALUES($1,$2,$3)",[actor||null,action,JSON.stringify(details)]);}
