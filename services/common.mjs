import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export const ports={auth:4101,jobs:4102,analysis:4103,mail:4104};
export function database(name){mkdirSync(resolve('data'),{recursive:true});const db=new DatabaseSync(resolve('data',name+'.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');return db;}
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export async function body(req){let out='';for await(const chunk of req){out+=chunk;if(out.length>100000)fail('Petición demasiado grande',413);}try{return out?JSON.parse(out):{};}catch{fail('JSON no válido');}}
export function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
export function serve(name,handler){return http.createServer(async(req,res)=>{try{if(req.headers['x-internal-secret']!==process.env.INTERNAL_SECRET)fail('No autorizado',401);await handler(req,res,new URL(req.url,'http://local'));}catch(e){json(res,{error:e.status?e.message:'Error interno del servicio'},e.status||500);}}).listen(ports[name],'127.0.0.1',()=>console.log(name+' listo en '+ports[name]));}
export async function call(name,path,options={}){const res=await fetch('http://127.0.0.1:'+ports[name]+path,{...options,headers:{'Content-Type':'application/json','x-internal-secret':process.env.INTERNAL_SECRET,...options.headers},signal:AbortSignal.timeout(15000)});const result=await res.json();if(!res.ok)fail(result.error,res.status);return result;}
export function text(value,max=300){return typeof value==='string'?value.trim().slice(0,max):'';}
export function email(value){const v=text(value).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))fail('Correo no válido');return v;}
