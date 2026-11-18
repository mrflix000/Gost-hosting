import argon2 from "argon2";
import {pool} from "../db/pool.js";
export async function bootstrapOwner(){
 const {ADMIN_USERNAME,ADMIN_EMAIL,ADMIN_PASSWORD}=process.env;
 if(!ADMIN_USERNAME||!ADMIN_EMAIL||!ADMIN_PASSWORD)throw new Error("Set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD.");
 if(ADMIN_PASSWORD.length<14)throw new Error("ADMIN_PASSWORD must be at least 14 characters.");
 const found=await pool.query("SELECT id FROM users WHERE username=$1 OR email=$2",[ADMIN_USERNAME,ADMIN_EMAIL.toLowerCase()]);
 if(found.rowCount)return;
 const hash=await argon2.hash(ADMIN_PASSWORD,{type:argon2.argon2id});
 await pool.query("INSERT INTO users(username,email,password_hash,role) VALUES($1,$2,$3,'admin')",
 [ADMIN_USERNAME,ADMIN_EMAIL.toLowerCase(),hash]);
}
