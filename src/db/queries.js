import {pool} from "./pool.js";
export const findUserByLogin = v => pool.query(
 "SELECT * FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1)",[v]);
export const listUsers = () => pool.query(
 "SELECT id,username,email,role,status,created_at FROM users ORDER BY created_at DESC");
export const listProjectsFor = (user) => user.role==="admin"
 ? pool.query("SELECT p.*,u.username owner_name FROM projects p JOIN users u ON u.id=p.owner_id ORDER BY p.id DESC")
 : pool.query("SELECT * FROM projects WHERE owner_id=$1 ORDER BY id DESC",[user.id]);
