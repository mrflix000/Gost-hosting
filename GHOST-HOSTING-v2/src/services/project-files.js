import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
const root=path.resolve(process.env.PROJECT_FILES_ROOT||"./project-files");
function safeName(name){if(typeof name!=="string"||!name||name.length>120||name==="."||name===".."||/[\\/\\0]/.test(name))throw Object.assign(new Error("Invalid file name"),{status:400});return name}
function folder(userId,projectId){return path.join(root,String(userId),String(projectId))}
export async function ensureProjectFolder(userId,projectId){await fs.mkdir(folder(userId,projectId),{recursive:true})}
export async function listFiles(userId,projectId){await ensureProjectFolder(userId,projectId);return (await fs.readdir(folder(userId,projectId),{withFileTypes:true})).filter(x=>x.isFile()).map(x=>x.name)}
export async function writeFile(userId,projectId,name,content){name=safeName(name);if(typeof content!=="string"||content.length>500000)throw Object.assign(new Error("Text file too large"),{status:413});await ensureProjectFolder(userId,projectId);await fs.writeFile(path.join(folder(userId,projectId),name),content,{encoding:"utf8",flag:"w"});}
export async function readFile(userId,projectId,name){name=safeName(name);return fs.readFile(path.join(folder(userId,projectId),name),"utf8")}
export async function renameFile(userId,projectId,from,to){from=safeName(from);to=safeName(to);await fs.rename(path.join(folder(userId,projectId),from),path.join(folder(userId,projectId),to))}
export async function removeFile(userId,projectId,name){name=safeName(name);await fs.unlink(path.join(folder(userId,projectId),name))}
export function newProjectKey(){return crypto.randomUUID()}
