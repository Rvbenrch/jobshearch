import assert from 'node:assert/strict';
const base='http://127.0.0.1:4100/api';
async function request(path,method='GET',data,cookie=''){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',cookie},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const unique=Date.now();
assert.equal((await request('/jobs')).status,401);
const a=await request('/auth/register','POST',{email:`qa-${unique}@example.test`,password:'test-password-long',name:'Prueba técnica'});assert.equal(a.status,200);assert.ok(a.cookie?.startsWith('ts_session='));
await request('/auth/profile','PATCH',{skills:'React, SQL',premium:'yes',alerts:true},a.cookie);
const offer=await request('/jobs','POST',{title:'Oferta de prueba',company:'Empresa ficticia',description:'Descripción de prueba',skills:'React, SQL, REST',applicants:40,vacancies:2},a.cookie);assert.equal(offer.status,200);assert.equal(offer.data.notification.status,'preview');
const analysis=await request(`/jobs/${offer.data.id}/analysis`,'GET',null,a.cookie);assert.equal(analysis.data.score,67);assert.equal(analysis.data.probability,null);assert.equal(analysis.data.competition,20);
const b=await request('/auth/register','POST',{email:`qa-other-${unique}@example.test`,password:'test-password-long',name:'Otra cuenta'});assert.equal((await request(`/jobs/${offer.data.id}`,'GET',null,b.cookie)).status,404);assert.equal((await request('/jobs','GET',null,b.cookie)).data.length,0);
const invalid=await request('/jobs','POST',{title:'Prueba',company:'Prueba',description:'Prueba',url:'javascript:alert(1)'},a.cookie);assert.equal(invalid.status,400);
const updated=await request(`/jobs/${offer.data.id}`,'PATCH',{status:'interview'},a.cookie);assert.equal(updated.data.status,'interview');
assert.equal((await request('/mail/history','GET',null,a.cookie)).data[0].status,'preview');
assert.equal((await request('/auth/linkedin/start','GET',null,a.cookie)).status,503);
await request(`/jobs/${offer.data.id}`,'DELETE',null,a.cookie);assert.equal((await request('/jobs','GET',null,a.cookie)).data.length,0);
await request('/auth/logout','POST',null,a.cookie);assert.equal((await request('/auth/me','GET',null,a.cookie)).status,401);
await request('/auth/logout','POST',null,b.cookie);
console.log('Comprobados registro, sesión, perfil, ofertas, análisis, aislamiento entre cuentas, validación de enlaces, correo en vista previa y cierre de sesión.');
