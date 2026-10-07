import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync} from 'node:fs';
test('Comunidad: tipos, migración, privacidad, propiedad, publicación y persistencia',async()=>{
 const testRoot=new URL('../../../work/community-tests/',import.meta.url);mkdirSync(testRoot,{recursive:true});const dir=mkdtempSync(new URL('run-',testRoot));process.env.DATA_DIRECTORY=dir;process.env.INTERNAL_SECRET='isolated-test-secret';process.env.PORT_OFFSET='2300';process.env.PUBLIC_ORIGIN='http://localhost:5173';const servers=[];let db,communityDb;
 try{
  for(const name of ['auth','community','gateway'])servers.push((await import('./'+name+'.mjs')).server);
  const {database}=await import('./common.mjs');db=database('auth');communityDb=database('community');
  async function request(path,method='GET',data,cookie=''){const r=await fetch('http://127.0.0.1:6400/api'+path,{method,headers:{Origin:'http://localhost:5173','Content-Type':'application/json',cookie},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  async function register(name,accountType){const r=await request('/auth/register','POST',{name,email:name+'@example.test',password:'isolated-long-test-password',...(accountType?{accountType}:{})});assert.equal(r.status,200);return r;}
  assert.equal((await request('/offers')).status,401);
  const junior=await register('Junior','junior'),other=await register('Other','junior'),company=await register('Company','company'),second=await register('Second','company'),legacy=await register('Legacy');
  assert.equal((await request('/offers','GET',null,junior.cookie)).status,200);assert.equal((await request('/offers','GET',null,junior.cookie)).data.total,0);
  assert.equal((await request('/posts','GET',null,legacy.cookie)).status,428);
  db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({...legacy.data.profile,role:'admin',resume:{concepts:[{name:'Preserved'}]},resumeCompleted:true}),legacy.data.id);
  const chosen=await request('/auth/type','POST',{accountType:'junior'},legacy.cookie);assert.equal(chosen.status,200);assert.equal(chosen.data.profile.role,'admin');assert.equal(chosen.data.profile.resume.concepts[0].name,'Preserved');
  assert.equal((await request('/auth/type','POST',{accountType:'company'},legacy.cookie)).status,409);
  assert.equal((await request('/admin/overview','GET',null,junior.cookie)).status,403);assert.equal((await request('/admin/overview','GET',null,legacy.cookie)).status,200);
  assert.equal((await request('/auth/cv/analyze','POST',{content:'obsolete'},junior.cookie)).status,404);assert.equal((await request('/discovery/jobs','GET',null,junior.cookie)).status,404);
  assert.equal((await request('/juniors','GET',null,company.cookie)).data.total,0);
  const profile=await request('/auth/profile','PATCH',{description:'Aprendo construyendo',studies:'Grado informática',vocationalTraining:'FP DAW',languages:'Español C2',skills:'React, SQL',internships:'Proyecto de prácticas',contribution:'Diseño interfaces',publicProfile:true,role:'admin',accountType:'company',password:'spoof'},junior.cookie);
  assert.equal(profile.status,200);assert.equal(profile.data.profile.accountType,'junior');assert.equal(profile.data.profile.role,undefined);assert.equal(profile.data.profile.password,undefined);
  const directory=await request('/juniors?q=DAW','GET',null,company.cookie);assert.equal(directory.data.total,1);assert.equal(directory.data.items[0].vocationalTraining,'FP DAW');for(const key of ['email','password','salt','role','resume'])assert.equal(directory.data.items[0][key],undefined);
  assert.equal((await request('/auth/profile','PATCH',{portfolio:'javascript:alert(1)'},junior.cookie)).status,400);
  assert.equal((await request('/offers','POST',{title:'No'},junior.cookie)).status,403);assert.equal((await request('/offers','POST',{title:'No'},legacy.cookie)).status,403);assert.equal((await request('/posts','POST',{title:'No'},company.cookie)).status,403);
  assert.equal((await request('/offers','POST',{title:'Junior dev',description:'Construye con nosotros',yearsExperience:2},company.cookie)).status,400);
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=';
  const created=await request('/offers','POST',{title:'Junior frontend',description:'Formación y acompañamiento',salary:'24000 EUR/año',languages:'Inglés B1',degrees:'Informática',vocationalTraining:'DAW o DAM',internships:'Prácticas de estudios',image,ownerId:second.data.id,companyName:'Spoof'},company.cookie);assert.equal(created.status,201);const offerId=created.data.id;assert.equal(created.data.ownerId,company.data.id);assert.equal(created.data.companyName,'Company');
  assert.equal((await request('/offers/'+offerId,'GET',null,junior.cookie)).status,404);assert.equal((await request('/offers?mine=true','GET',null,company.cookie)).data.total,1);
  assert.equal((await request('/offers/'+offerId,'PATCH',{title:'Hijack'},second.cookie)).status,403);assert.equal((await request('/offers/'+offerId,'DELETE',null,second.cookie)).status,403);
  assert.equal((await request('/offers/'+offerId,'PATCH',{status:'published'},company.cookie)).status,200);const publicOffer=await request('/offers/'+offerId,'GET',null,junior.cookie);assert.equal(publicOffer.data.salary,'24000 EUR/año');assert.equal(publicOffer.data.image,image);assert.equal(publicOffer.data.vocationalTraining,'DAW o DAM');
  assert.equal((await request('/offers/'+offerId,'PATCH',{image:'data:image/svg+xml;base64,PHN2Zz4='},company.cookie)).status,400);
  const post=await request('/posts','POST',{title:'Investigación SQL',content:'Resultados y metodología propia',kind:'research',tags:'SQL, datos',authorName:'Spoof',status:'draft'},junior.cookie);assert.equal(post.status,201);assert.equal(post.data.authorName,'Junior');
  assert.equal((await request('/posts/'+post.data.id,'GET',null,other.cookie)).status,404);assert.equal((await request('/posts/'+post.data.id,'PATCH',{content:'Hijack'},other.cookie)).status,403);
  await request('/posts/'+post.data.id,'PATCH',{status:'published'},junior.cookie);assert.equal((await request('/posts?q=SQL','GET',null,company.cookie)).data.total,1);
  assert.equal(JSON.parse(communityDb.prepare('SELECT data FROM posts WHERE id=?').get(post.data.id).data).content,'Resultados y metodología propia');
  await request('/auth/profile','PATCH',{publicProfile:false},junior.cookie);assert.equal((await request('/juniors/'+junior.data.id,'GET',null,company.cookie)).status,404);
  assert.equal((await request('/posts/'+post.data.id,'DELETE',null,junior.cookie)).status,200);assert.equal((await request('/posts/'+post.data.id,'GET',null,junior.cookie)).status,404);
  await request('/offers/'+offerId,'PATCH',{status:'closed'},company.cookie);assert.equal((await request('/offers','GET',null,junior.cookie)).data.total,0);assert.equal((await request('/offers?mine=true','GET',null,company.cookie)).data.total,1);
  assert.equal((await request('/offers/'+offerId,'DELETE',null,company.cookie)).status,200);
  const overview=await request('/admin/overview','GET',null,legacy.cookie);assert.ok(overview.data.activity.some(e=>e.type==='contribution_created'));assert.ok(overview.data.activity.some(e=>e.type==='offer_deleted'));for(const u of overview.data.users){assert.equal(u.password,undefined);assert.equal(u.salt,undefined);}
 }finally{await Promise.all(servers.map(server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})));db?.close();communityDb?.close();}
});
