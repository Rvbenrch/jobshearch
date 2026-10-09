import http from 'node:http';import {spawn} from 'node:child_process';import {existsSync,createReadStream,statSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {resolve,extname,sep} from 'node:path';import {randomBytes} from 'node:crypto';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
if(existsSync('.env'))process.loadEnvFile('.env');
process.env.PUBLIC_ORIGIN||=process.env.RENDER_EXTERNAL_URL;
if(!process.env.PUBLIC_ORIGIN)throw new Error('Configura PUBLIC_ORIGIN con la URL pública del despliegue.');
const publicUrl=new URL(process.env.PUBLIC_ORIGIN);if(publicUrl.origin!==process.env.PUBLIC_ORIGIN||publicUrl.username||publicUrl.password)throw new Error('PUBLIC_ORIGIN debe ser un origen sin ruta ni credenciales.');if(publicUrl.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(publicUrl.hostname))throw new Error('El despliegue público requiere HTTPS.');
if(!existsSync('dist/index.html'))throw new Error('Ejecuta npm run build antes de npm start.');
process.env.INTERNAL_SECRET||=randomBytes(48).toString('hex');
const children=['auth','community','gateway'].map(name=>spawn(process.execPath,['services/'+name+'.mjs'],{stdio:'inherit',env:process.env}));
const gatewayPort=4100+Number(process.env.PORT_OFFSET||0);
const root=resolve('dist');const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};let stopping=false;
export const server=http.createServer({requestTimeout:60000,headersTimeout:15000,maxHeaderSize:16384},async(req,res)=>{
 if(process.env.PUBLIC_ORIGIN.startsWith('https:'))res.setHeader('Strict-Transport-Security','max-age=31536000');
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 try{const url=new URL(req.url,'http://local');
  if(url.pathname==='/health'){const r=await fetch('http://127.0.0.1:'+gatewayPort+'/health',{signal:AbortSignal.timeout(2000)});res.writeHead(r.status===200?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({ready:r.status===200}));return;}
  if(url.pathname.startsWith('/api/')){const upstream=http.request({hostname:'127.0.0.1',port:gatewayPort,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});upstream.setTimeout(30000,()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Servicio no disponible'}));});req.pipe(upstream);return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+sep)||!existsSync(path)||!statSync(path).isFile()){res.writeHead(404);res.end('Página no encontrada');return;}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':path.includes(sep+'assets'+sep)?'public,max-age=31536000,immutable':'no-cache'});if(req.method==='HEAD')res.end();else createReadStream(path).pipe(res);
 }catch{if(!res.headersSent)res.writeHead(503);res.end('Servicio no disponible');}
}).listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('Junior Scope publicado por el servidor de producción.'));
export async function shutdown(){if(stopping)return;stopping=true;const exits=children.map(child=>new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null){resolve();return;}child.once('exit',resolve);child.kill();}));await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});await Promise.all(exits);}
function stop(code=0){if(stopping)return;void shutdown().finally(()=>process.exit(code));setTimeout(()=>process.exit(code),3000).unref();}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());for(const child of children){child.on('error',()=>stop(1));child.on('exit',()=>{if(!stopping)stop(1);});}
