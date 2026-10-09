import http from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const dataDirectory=process.env.DATA_DIRECTORY||fileURLToPath(new URL('../data/',import.meta.url));
const offset=Number(process.env.PORT_OFFSET||0);
export const ports={auth:4101+offset,jobs:4102+offset,analysis:4103+offset,mail:4104+offset,discovery:4105+offset,community:4106+offset};
export function database(name){mkdirSync(dataDirectory,{recursive:true,mode:0o700});if(process.platform!=='win32')chmodSync(dataDirectory,0o700);const dbPath=resolve(dataDirectory,name+'.sqlite'),db=new DatabaseSync(dbPath);if(process.platform!=='win32')chmodSync(dbPath,0o600);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');return db;}
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export async function body(req,limit=100000){let out='';for await(const chunk of req){out+=chunk;if(Buffer.byteLength(out)>limit)fail('Petición demasiado grande',413);}try{const value=out?JSON.parse(out):{};if(!value||typeof value!=='object'||Array.isArray(value))fail('Se requiere un objeto JSON');return value;}catch{fail('JSON no válido');}}
export function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
export function serve(name,handler){const secret=process.env.INTERNAL_SECRET;if(!secret||secret.length<32||secret.includes('replace-with'))throw new Error('Configura INTERNAL_SECRET de al menos 32 caracteres antes de iniciar un servicio interno.');const hash=value=>createHash('sha256').update(value).digest();return http.createServer({requestTimeout:60000,headersTimeout:15000,maxHeaderSize:16384},async(req,res)=>{try{const supplied=req.headers['x-internal-secret'];if(typeof supplied!=='string'||!timingSafeEqual(hash(supplied),hash(secret)))fail('No autorizado',401);await handler(req,res,new URL(req.url,'http://local'));}catch(e){json(res,{error:e.status?e.message:'Error interno del servicio'},e.status||500);}}).listen(ports[name],'127.0.0.1',()=>console.log(name+' listo en '+ports[name]));}
export async function call(name,path,options={}){const {timeoutMs=15000,...requestOptions}=options;const res=await fetch('http://127.0.0.1:'+ports[name]+path,{...requestOptions,headers:{'Content-Type':'application/json','x-internal-secret':process.env.INTERNAL_SECRET,...options.headers},signal:AbortSignal.timeout(timeoutMs)});const result=await res.json();if(!res.ok)fail(result.error,res.status);return result;}
export function text(value,max=300){return typeof value==='string'?value.trim().slice(0,max):'';}
export function email(value){const v=text(value).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))fail('Correo no válido');return v;}
