import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomBytes} from 'node:crypto';
import {plainText,extractRequirements,normalizeAdzuna,filterOffers} from './discovery-model.mjs';import {marketSummary} from './market-model.mjs';
test('Filtra países sin asignar un país a ubicaciones remotas genéricas',()=>{
 const jobs=[{id:'es',location:'Madrid, Spain'},{id:'fr',location:'Paris'},{id:'remote',location:'Remote'},{id:'us',location:'Remote - US'},{id:'au',location:'Australia'}].map(j=>({...j,title:'Developer',description:'React'}));
 assert.deepEqual(filterOffers(jobs,{country:'es'}).map(j=>j.id),['es']);
 assert.deepEqual(filterOffers(jobs,{country:'fr'}).map(j=>j.id),['fr']);
 assert.deepEqual(filterOffers(jobs,{country:'us'}).map(j=>j.id),['us']);
 assert.equal(filterOffers(jobs,{}).length,5);
 assert.equal(filterOffers(jobs,{country:'es',location:'Paris'}).length,0);
});
test('Normaliza requisitos, HTML y salarios sin inventar candidatos',()=>{assert.equal(plainText('&lt;p&gt;React &amp; SQL&lt;/p&gt;'),'React & SQL');assert.equal(plainText('<script>alert(1)</script><p>Hola</p>'),'Hola');assert.equal(extractRequirements('React and TypeScript. Bachelor degree or equivalent experience.').skills,'React, TypeScript');assert.ok(extractRequirements('Bachelor degree or equivalent experience.').education.includes('equivalent'));const j=normalizeAdzuna({id:'1',title:'Developer',description:'React',salary_min:30000,salary_is_predicted:1,redirect_url:'javascript:alert(1)'},'es');assert.equal(j.url,'');assert.equal(j.salary.predicted,true);assert.equal(j.descriptionComplete,false);assert.equal(filterOffers([j],{salaryOnly:true}).length,0);const m=marketSummary([{id:'a',url:'https://example.test/a',company:'A',location:'Remote',skills:'React'}, {id:'b',url:'https://example.test/a',company:'A',skills:'React'}],[]);assert.equal(m.totalOffers,1);assert.equal(m.demand,null);});
test('Buscador REST: fuentes, importación, duplicados, permisos y mercado',async()=>{
process.env.DATA_DIRECTORY=mkdtempSync(join(tmpdir(),'talentscope-discovery-'));process.env.PORT_OFFSET='800';process.env.INTERNAL_SECRET=randomBytes(32).toString('hex');delete process.env.ADZUNA_APP_ID;delete process.env.ADZUNA_APP_KEY;
const originalFetch=globalThis.fetch;const servers=[];let db;
globalThis.fetch=async(input,options)=>{const u=new URL(typeof input==='string'?input:input.url);if(u.hostname==='boards-api.greenhouse.io'){const slug=u.pathname.split('/')[3];const j={id:42,title:'React Developer',content:'<p>React, SQL. Bachelor degree or equivalent experience.</p>',location:{name:'Madrid, Spain'},absolute_url:'https://example.test/'+slug+'/job42',updated_at:'2026-10-07T08:00:00Z'};return new Response(JSON.stringify(u.pathname.endsWith('/42')?{...j,pay_input_ranges:[{min_cents:4000000,max_cents:5000000,currency_type:'EUR',title:'Rango publicado'}]}:{jobs:[j]}),{status:200});}return originalFetch(input,options);};
try{for(const name of ['auth','jobs','mail','discovery','gateway'])servers.push((await import('./'+name+'.mjs')).server);const argv=process.argv[1];process.argv[1]='analysis.mjs';servers.push((await import('./analysis.mjs')).server);process.argv[1]=argv;
async function request(path,method='GET',data,cookie=''){const r=await fetch('http://127.0.0.1:4900/api'+path,{method,headers:{cookie,'Content-Type':'application/json',Origin:'http://127.0.0.1:5173'},...(data?{body:JSON.stringify(data)}:{})});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
assert.equal((await request('/discover/search')).status,401);const regular=await request('/auth/register','POST',{email:'searcher@example.test',name:'Buscador',password:'long-test-password'});const cookie=regular.cookie;const {database}=await import('./common.mjs');db=database('auth');db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({...regular.data.profile,resumeCompleted:true}),regular.data.id);
const sources=await request('/discover/sources','GET',null,cookie);assert.equal(sources.data.boards.length,3);assert.equal(sources.data.adzuna,false);
assert.equal((await request('/discover/search?country=es','GET',null,cookie)).data.total,3);assert.equal((await request('/discover/search?country=fr','GET',null,cookie)).data.total,0);
const result=await request('/discover/search?q=React&location=Madrid','GET',null,cookie);assert.equal(result.status,200);assert.equal(result.data.total,3);assert.ok(result.data.jobs.every(j=>j.companyInfo.name===j.company&&j.companyInfo.business&&j.description&&j.url));assert.ok(result.data.sources.every(s=>s.status==='ok'));
const id=result.data.jobs[0].id;const offer=await request('/discover/offer?id='+encodeURIComponent(id),'GET',null,cookie);assert.equal(offer.data.salary.min,40000);assert.ok(offer.data.education.includes('Bachelor'));
const imported=await request('/discover/import','POST',{id},cookie);assert.equal(imported.status,200);assert.equal(imported.data.source,'Greenhouse');assert.equal(imported.data.applicants,null);assert.equal(imported.data.companyInfo.name,result.data.jobs[0].company);assert.equal(imported.data.salary.min,40000);
const again=await request('/discover/import','POST',{id},cookie);assert.equal(again.data.alreadySaved,true);assert.equal((await request('/jobs','GET',null,cookie)).data.length,1);
assert.equal((await request('/discover/sources','POST',{provider:'greenhouse',slug:'new',company:'New'},cookie)).status,403);
db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({...regular.data.profile,role:'admin',resumeCompleted:true}),regular.data.id);
assert.equal((await request('/discover/sources','POST',{provider:'greenhouse',slug:'../../localhost',company:'Bad'},cookie)).status,400);
assert.equal((await request('/discover/search?provider=adzuna','GET',null,cookie)).status,503);
const info=await request('/companies/info?name=Datadog','GET',null,cookie);assert.equal(info.data.email,'info@datadoghq.com');assert.ok(info.data.contactType.includes('generales'));
const market=await request('/market/overview','GET',null,cookie);assert.equal(market.status,200);assert.equal(market.data.totalOffers,3);assert.equal(market.data.demand,null);
const history=await request('/admin/overview','GET',null,cookie);assert.ok(history.data.activity.some(e=>e.type==='job_search'));
}finally{globalThis.fetch=originalFetch;await Promise.all(servers.map(s=>new Promise(resolve=>{s.closeAllConnections();s.close(resolve);})));db?.close();}
});
