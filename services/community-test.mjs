import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync} from 'node:fs';
test('Comunidad: tipos, migración, privacidad, propiedad, publicación y persistencia',async()=>{
 const testRoot=new URL('../../../work/community-tests/',import.meta.url);mkdirSync(testRoot,{recursive:true});const dir=mkdtempSync(new URL('run-',testRoot));process.env.DATA_DIRECTORY=dir;process.env.INTERNAL_SECRET='isolated-test-secret-with-32-characters-minimum';process.env.PORT_OFFSET='2300';process.env.PUBLIC_ORIGIN='http://localhost:5173';const servers=[];let db,communityDb;
 try{
  for(const name of ['auth','community','gateway'])servers.push((await import('./'+name+'.mjs')).server);
  const {database}=await import('./common.mjs');db=database('auth');communityDb=database('community');
  async function request(path,method='GET',data,cookie=''){const r=await fetch('http://127.0.0.1:6400/api'+path,{method,headers:{Origin:'http://localhost:5173','Content-Type':'application/json',cookie},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  async function register(name,accountType){const r=await request('/auth/register','POST',{name,email:name+'@example.test',password:'isolated-long-test-password',...(accountType?{accountType}:{})});assert.equal(r.status,200);return r;}
  assert.equal((await request('/offers')).status,401);
  const internal=await fetch('http://127.0.0.1:6406/posts',{headers:{'x-user':'forged','x-account-type':'company'}});assert.equal(internal.status,401);
  const wrongOrigin=await fetch('http://127.0.0.1:6400/api/auth/register',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:JSON.stringify({name:'No',email:'blocked@example.test',password:'test-password-long'})});assert.equal(wrongOrigin.status,403);
  const junior=await register('Junior','junior'),other=await register('Other','junior'),company=await register('Company','company'),second=await register('Second','company'),legacy=await register('Legacy');
  const stored=db.prepare('SELECT password,salt FROM users WHERE id=?').get(junior.data.id);assert.notEqual(stored.password,'isolated-long-test-password');assert.equal(stored.password.length,128);assert.equal(stored.salt.length,32);const rawToken=junior.cookie.split('=')[1];assert.equal(db.prepare('SELECT token FROM sessions WHERE token=?').get(rawToken),undefined);
  assert.equal((await request('/offers','GET',null,junior.cookie)).status,200);assert.equal((await request('/offers','GET',null,junior.cookie)).data.total,0);
  assert.equal((await request('/posts','GET',null,legacy.cookie)).status,428);
  db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({...legacy.data.profile,role:'admin',resume:{concepts:[{name:'Preserved'}]},resumeCompleted:true}),legacy.data.id);
  const chosen=await request('/auth/type','POST',{accountType:'junior'},legacy.cookie);assert.equal(chosen.status,200);assert.equal(chosen.data.profile.role,'admin');assert.equal(chosen.data.profile.resume.concepts[0].name,'Preserved');
  assert.equal((await request('/auth/type','POST',{accountType:'company'},legacy.cookie)).status,409);
  assert.equal((await request('/admin/overview','GET',null,junior.cookie)).status,403);assert.equal((await request('/admin/overview','GET',null,legacy.cookie)).status,200);
  assert.equal((await request('/auth/cv/analyze','POST',{content:'obsolete'},junior.cookie)).status,404);assert.equal((await request('/discovery/jobs','GET',null,junior.cookie)).status,404);
  assert.equal((await request('/juniors','GET',null,company.cookie)).data.total,0);
  const profile=await request('/auth/profile','PATCH',{description:'Aprendo construyendo',studies:'Grado informática',vocationalTraining:'FP DAW',languages:'Español C2',skills:'React, SQL',internships:'Proyecto de prácticas',contribution:'Diseño interfaces',publicProfile:true,acceptedPublication:true,publicationConsentVersion:'junior-profile-v1',role:'admin',accountType:'company',password:'spoof'},junior.cookie);
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
  assert.equal((await request('/offers/'+offerId,'PATCH',{image:'data:image/svg+xml;base64,PHN2Zz4='},company.cookie)).status,400);const huge='data:image/png;base64,'+Buffer.alloc(500001).toString('base64');assert.equal((await request('/posts','POST',{title:'Too large',content:'Image limit',images:[huge]},junior.cookie)).status,400);
  const post=await request('/posts','POST',{title:'Investigación SQL',content:'Resultados y metodología propia',kind:'research',tags:'SQL, datos',authorName:'Spoof',status:'draft'},junior.cookie);assert.equal(post.status,201);assert.equal(post.data.authorName,'Junior');
  assert.equal((await request('/posts/'+post.data.id,'GET',null,other.cookie)).status,404);assert.equal((await request('/posts/'+post.data.id,'PATCH',{content:'Hijack'},other.cookie)).status,403);
  await request('/posts/'+post.data.id,'PATCH',{status:'published'},junior.cookie);assert.equal((await request('/posts?q=SQL','GET',null,company.cookie)).data.total,1);
  assert.equal(JSON.parse(communityDb.prepare('SELECT data FROM posts WHERE id=?').get(post.data.id).data).content,'Resultados y metodología propia');
  // Publication images, private access, coherent reactions, comments and attribution.
  assert.equal((await request('/posts/'+post.data.id,'PATCH',{images:[image]},junior.cookie)).status,200);
  assert.equal((await request('/posts/'+post.data.id,'GET',null,company.cookie)).data.images[0],image);
  assert.equal((await request('/posts/'+post.data.id,'PATCH',{images:['data:image/svg+xml;base64,PHN2Zz4=']},junior.cookie)).status,400);
  assert.equal((await request('/posts/'+post.data.id,'PATCH',{images:Array(5).fill(image)},junior.cookie)).status,400);
  const react=(value,account=other)=>request('/posts/'+post.data.id+'/reaction','PUT',{value},account.cookie);
  assert.equal((await react('like')).data.likes,1);assert.equal((await react('like')).data.likes,1);
  const changedReaction=await react('dislike');assert.equal(changedReaction.data.likes,0);assert.equal(changedReaction.data.dislikes,1);assert.equal(changedReaction.data.myReaction,'dislike');
  assert.equal((await react(null)).data.dislikes,0);
  const comment=await request('/posts/'+post.data.id+'/comments','POST',{content:'Buena investigación',images:[image]},company.cookie);assert.equal(comment.status,201);
  assert.equal((await request('/posts/'+post.data.id+'/comments','GET',null,junior.cookie)).data.items[0].images[0],image);
  assert.equal((await request('/posts/'+post.data.id+'/comments/'+comment.data.id,'DELETE',null,other.cookie)).status,403);
  assert.equal((await request('/posts/'+post.data.id+'/comments','POST',{images:['data:image/png;base64,YWJj']},other.cookie)).status,400);
  const repost=await request('/posts/'+post.data.id+'/repost','POST',{},company.cookie);assert.equal(repost.status,201);assert.equal(repost.data.original.ownerId,junior.data.id);assert.equal(repost.data.authorName,'Company');assert.equal(repost.data.original.authorName,'Junior');
  assert.equal((await request('/posts/'+post.data.id+'/repost','POST',{},company.cookie)).data.id,repost.data.id);
  assert.equal((await request('/posts/'+repost.data.id,'PATCH',{content:'Changed attribution'},company.cookie)).status,403);
  await request('/posts/'+post.data.id,'PATCH',{status:'draft'},junior.cookie);
  const hiddenOriginal=await request('/posts/'+repost.data.id,'GET',null,company.cookie);assert.equal(hiddenOriginal.data.original,null);assert.equal(hiddenOriginal.data.originalUnavailable,true);assert.equal(hiddenOriginal.data.content,'');
  assert.equal((await react('like')).status,404);assert.equal((await request('/posts/'+post.data.id+'/comments','GET',null,other.cookie)).status,404);assert.equal((await request('/posts/'+post.data.id+'/repost','POST',{},other.cookie)).status,404);
  await request('/posts/'+post.data.id,'PATCH',{status:'published'},junior.cookie);
  // Consent is required to republish a hidden profile, even when bypassing the UI.
  await request('/auth/profile','PATCH',{publicProfile:false},junior.cookie);
  assert.equal((await request('/auth/profile','PATCH',{publicProfile:true},junior.cookie)).status,400);
  await request('/auth/profile','PATCH',{publicProfile:true,acceptedPublication:true,publicationConsentVersion:'junior-profile-v1'},junior.cookie);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM profile_consents WHERE user=?').get(junior.data.id).n>=2);
  // Reports validate accessible targets and retain context; only administrators can moderate.
  const report=await request('/reports','POST',{targetType:'post',targetId:post.data.id,reason:'Contenido que requiere revisión',context:'Contexto de prueba',targetUser:company.data.id},other.cookie);assert.equal(report.status,201);
  assert.equal(db.prepare('SELECT target_user FROM reports WHERE id=?').get(report.data.id).target_user,junior.data.id);
  assert.equal((await request('/reports','POST',{targetType:'user',targetId:company.data.id,sourcePostId:post.data.id,sourceCommentId:comment.data.id,reason:'Conducta a revisar'},other.cookie)).status,201);
  assert.equal((await request('/reports','POST',{targetType:'user',targetId:second.data.id,sourcePostId:post.data.id,reason:'Target spoof'},other.cookie)).status,400);
  assert.equal((await request('/admin/reports','GET',null,other.cookie)).status,403);
  assert.equal((await request('/admin/users/'+junior.data.id+'/restriction','POST',{mode:'permanent',reason:'Mala conducta'},other.cookie)).status,403);
  assert.equal((await request('/admin/users/'+legacy.data.id+'/restriction','POST',{mode:'permanent',reason:'Self ban'},legacy.cookie)).status,403);
  const blockPath='/admin/users/'+junior.data.id+'/restriction';
  const blocked=await request(blockPath,'POST',{mode:'temporary',reason:'Mala conducta',until:new Date(Date.now()+86400000).toISOString()},legacy.cookie);assert.equal(blocked.status,200);assert.equal(blocked.data.active,true);
  const meBlocked=await request('/auth/me','GET',null,junior.cookie);assert.equal(meBlocked.data.restriction.reason,'Mala conducta');assert.ok(meBlocked.data.restriction.until);
  assert.equal((await request('/posts','GET',null,junior.cookie)).status,200);
  for(const [path,method,payload] of [['/posts','POST',{title:'Blocked',content:'Cannot publish',images:[image]}],['/posts/'+post.data.id,'PATCH',{images:[image]}],['/posts/'+post.data.id+'/comments','POST',{content:'Blocked',images:[image]}],['/posts/'+post.data.id+'/reaction','PUT',{value:'like'}],['/posts/'+post.data.id+'/repost','POST',{}],['/auth/profile','PATCH',{publicProfile:true,acceptedPublication:true,publicationConsentVersion:'junior-profile-v1'}]])assert.equal((await request(path,method,payload,junior.cookie)).status,403,path);
  assert.equal((await request('/auth/profile','PATCH',{publicProfile:false},junior.cookie)).status,200);
  assert.equal((await request('/reports','POST',{targetType:'user',targetId:company.data.id,sourcePostId:post.data.id,sourceCommentId:comment.data.id,reason:'Lectura y denuncia disponibles'},junior.cookie)).status,201);
  db.prepare('UPDATE restrictions SET until=? WHERE user=?').run(new Date(Date.now()-1000).toISOString(),junior.data.id);
  assert.equal((await request('/auth/me','GET',null,junior.cookie)).data.restriction.active,false);
  assert.equal((await request('/posts/'+post.data.id+'/comments','POST',{content:'Temporal expirado'},junior.cookie)).status,201);
  const companyBlock='/admin/users/'+company.data.id+'/restriction';await request(companyBlock,'POST',{mode:'permanent',reason:'Conducta reiterada'},legacy.cookie);
  assert.equal((await request('/offers','POST',{title:'Blocked',description:'Blocked offer',image},company.cookie)).status,403);
  assert.equal((await request('/auth/profile','PATCH',{description:'Cannot change'},company.cookie)).status,403);
  assert.equal((await request('/posts/'+post.data.id+'/comments','POST',{content:'Blocked'},company.cookie)).status,403);
  assert.equal((await request('/auth/me','GET',null,company.cookie)).data.restriction.mode,'permanent');
  assert.equal((await request(companyBlock,'DELETE',{reason:'Revisión completada'},legacy.cookie)).data.active,false);
  assert.equal((await request('/posts/'+post.data.id+'/reaction','PUT',{value:'like'},company.cookie)).status,200);
  assert.equal((await request('/admin/reports/'+report.data.id,'PATCH',{status:'resolved',resolution:'Bloqueo temporal aplicado y revisado'},legacy.cookie)).status,200);
  const resolved=await request('/admin/reports?status=resolved','GET',null,legacy.cookie);assert.equal(resolved.data.items[0].id,report.data.id);
  const audit=await request('/admin/audit','GET',null,legacy.cookie);assert.ok(audit.data.items.some(a=>a.action==='user_blocked'));assert.ok(audit.data.items.some(a=>a.action==='user_unblocked'));assert.ok(audit.data.items.some(a=>a.action==='report_resolved'));
  // Admin can switch only their own workspace; ordinary accounts cannot.
  assert.equal((await request('/auth/workspace','POST',{accountType:'company'},other.cookie)).status,403);
  await request('/auth/profile','PATCH',{description:'Junior space',skills:'React',publicProfile:true,acceptedPublication:true,publicationConsentVersion:'junior-profile-v1'},legacy.cookie);
  const companyAdmin=await request('/auth/workspace','POST',{accountType:'company'},legacy.cookie);assert.equal(companyAdmin.data.profile.role,'admin');assert.equal(companyAdmin.data.profile.accountType,'company');assert.equal(companyAdmin.data.profile.description,undefined);assert.equal(companyAdmin.data.profile.publicProfile,undefined);await request('/auth/profile','PATCH',{companyName:'Admin team',description:'Company space'},legacy.cookie);
  const adminOffer=await request('/offers','POST',{title:'Admin company opportunity',description:'Created in own company workspace'},legacy.cookie);assert.equal(adminOffer.status,201);assert.equal(adminOffer.data.ownerId,legacy.data.id);await request('/offers/'+adminOffer.data.id,'DELETE',null,legacy.cookie);
  const restored=await request('/auth/workspace','POST',{accountType:'junior'},legacy.cookie);assert.equal(restored.data.profile.description,'Junior space');assert.equal(restored.data.profile.companyName,undefined);assert.equal(restored.data.profile.skills,'React');const restoredCompany=await request('/auth/workspace','POST',{accountType:'company'},legacy.cookie);assert.equal(restoredCompany.data.profile.description,'Company space');assert.equal(restoredCompany.data.profile.companyName,'Admin team');await request('/auth/workspace','POST',{accountType:'junior'},legacy.cookie);assert.equal((await request('/admin/overview','GET',null,legacy.cookie)).status,200);

  await request('/auth/profile','PATCH',{publicProfile:false},junior.cookie);assert.equal((await request('/juniors/'+junior.data.id,'GET',null,company.cookie)).status,404);
  assert.equal((await request('/posts/'+post.data.id,'DELETE',null,junior.cookie)).status,200);assert.equal((await request('/posts/'+post.data.id,'GET',null,junior.cookie)).status,404);const tombstone=await request('/posts/'+repost.data.id,'GET',null,company.cookie);assert.equal(tombstone.data.originalUnavailable,true);assert.equal(tombstone.data.original,null);assert.equal(tombstone.data.originalAuthorName,'Junior');
  await request('/offers/'+offerId,'PATCH',{status:'closed'},company.cookie);assert.equal((await request('/offers','GET',null,junior.cookie)).data.total,0);assert.equal((await request('/offers?mine=true','GET',null,company.cookie)).data.total,1);
  assert.equal((await request('/offers/'+offerId,'DELETE',null,company.cookie)).status,200);
  const overview=await request('/admin/overview','GET',null,legacy.cookie);assert.ok(db.prepare('SELECT COUNT(*) AS n FROM events WHERE type=?').get('contribution_created').n>0);assert.ok(overview.data.activity.some(e=>e.type==='offer_deleted'));for(const u of overview.data.users){assert.equal(u.password,undefined);assert.equal(u.salt,undefined);}
 }finally{await Promise.all(servers.map(server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})));db?.close();communityDb?.close();}
});
