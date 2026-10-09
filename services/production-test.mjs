import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync} from 'node:fs';
test('Producción: HTTPS configurado, cabeceras, cookie privada y datos fuera de rutas públicas',async()=>{
 const root=new URL('../../../work/production-tests/',import.meta.url);mkdirSync(root,{recursive:true});process.env.DATA_DIRECTORY=mkdtempSync(new URL('run-',root));process.env.PORT_OFFSET='2800';process.env.PORT='7300';process.env.HOST='127.0.0.1';process.env.PUBLIC_ORIGIN='https://junior.example';process.env.INTERNAL_SECRET='private-production-test-secret-with-at-least-32-characters';const runtime=await import('./production.mjs');
 try{
  let ready=false;for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:7300/health');if(r.status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}assert.ok(ready,'Servicios de producción disponibles');
  const index=await fetch('http://127.0.0.1:7300/');assert.equal(index.status,200);assert.ok(index.headers.get('content-security-policy').includes("default-src 'self'"));assert.equal(index.headers.get('x-content-type-options'),'nosniff');assert.equal(index.headers.get('x-frame-options'),'DENY');assert.ok(index.headers.get('strict-transport-security').includes('max-age='));assert.ok(index.headers.get('permissions-policy').includes('camera=()'));
  for(const path of ['/.env','/data/auth.sqlite','/data/admin-access.txt','/..%2f.env'])assert.equal((await fetch('http://127.0.0.1:7300'+path)).status,404,path);
  const payload={name:'Production test',email:'production@example.test',password:'private-fixture-password-long',accountType:'junior'};
  const noOrigin=await fetch('http://127.0.0.1:7300/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(noOrigin.status,403);
  const register=await fetch('http://127.0.0.1:7300/api/auth/register',{method:'POST',headers:{Origin:'https://junior.example','Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(register.status,200);const cookie=register.headers.get('set-cookie');for(const attribute of ['HttpOnly','Secure','SameSite=Lax'])assert.ok(cookie.includes(attribute));const user=await register.json();for(const key of ['password','salt','token'])assert.equal(user[key],undefined);
  const headers={Cookie:cookie.split(';')[0],Origin:'https://junior.example','Content-Type':'application/json'};const admin=await fetch('http://127.0.0.1:7300/api/admin/reports',{headers:{...headers,'x-user':'forged','x-account-type':'admin','x-internal-secret':process.env.INTERNAL_SECRET}});assert.equal(admin.status,403);
  const excessive=await fetch('http://127.0.0.1:7300/api/auth/profile',{method:'PATCH',headers,body:JSON.stringify({description:'x'.repeat(110000)})});assert.equal(excessive.status,413);
  const logout=await fetch('http://127.0.0.1:7300/api/auth/logout',{method:'POST',headers,body:'{}'});assert.equal(logout.status,200);assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));assert.equal((await fetch('http://127.0.0.1:7300/api/auth/me',{headers})).status,401);
 }finally{await runtime.shutdown();}
});
