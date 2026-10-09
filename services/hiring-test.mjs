import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync} from 'node:fs';
test('Candidaturas: consentimiento, privacidad, propiedad, retirada, bloqueos y mensajes persistentes',async()=>{
 const root=new URL('../../../work/hiring-tests/',import.meta.url);mkdirSync(root,{recursive:true});process.env.DATA_DIRECTORY=mkdtempSync(new URL('run-',root));process.env.INTERNAL_SECRET='isolated-hiring-test-secret-minimum-32-characters';process.env.PORT_OFFSET='3300';process.env.PUBLIC_ORIGIN='http://localhost:5173';const servers=[];let auth,db;
 try{
  for(const name of ['auth','community','gateway'])servers.push((await import('./'+name+'.mjs')).server);
  const {database}=await import('./common.mjs');auth=database('auth');db=database('community');
  async function req(path,method='GET',body,cookie=''){const r=await fetch('http://127.0.0.1:7400/api'+path,{method,headers:{Origin:'http://localhost:5173','Content-Type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  async function register(name,type){const r=await req('/auth/register','POST',{name,email:name+'@example.test',password:'isolated-hiring-test-password',accountType:type});assert.equal(r.status,200);return r;}
  const junior=await register('Junior','junior'),other=await register('Other','junior'),company=await register('Company','company'),second=await register('Second','company'),admin=await register('Admin','junior');
  auth.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({...admin.data.profile,role:'admin'}),admin.data.id);
  await req('/auth/profile','PATCH',{studies:'Informática',skills:'React, SQL',publicProfile:false},junior.cookie);
  auth.prepare('UPDATE users SET profile=json_set(profile,\'$.resume\',json(?)) WHERE id=?').run(JSON.stringify({secret:'legacy CV must remain private'}),junior.data.id);
  const o=await req('/offers','POST',{title:'Frontend junior',description:'Aprende en equipo',status:'published'},company.cookie);assert.equal(o.status,201);const path='/offers/'+o.data.id;
  assert.equal((await req('/juniors','GET',null,company.cookie)).data.total,0);
  assert.equal((await req(path+'/application','POST',{},junior.cookie)).status,400);
  const contact=await req(path+'/conversation','POST',{},junior.cookie);assert.equal(contact.status,201);assert.equal(contact.data.profile,null);const id=contact.data.id;
  const apply=()=>req(path+'/application','POST',{acceptedSharing:true,sharingVersion:'application-profile-v1'},junior.cookie);
  const a=await apply();assert.equal(a.status,201);assert.equal(a.data.id,id);assert.equal(a.data.profile.studies,'Informática');assert.equal(a.data.status,'submitted');
  for(const key of ['email','password','salt','resume','role','workspaceProfiles'])assert.equal(a.data.profile[key],undefined);
  assert.equal((await apply()).data.id,id);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM applications').get().n,1);
  const msg=await req('/applications/'+id+'/messages','POST',{content:'<script>alert(1)</script> ¿Cómo es el equipo?',senderId:other.data.id},junior.cookie);assert.equal(msg.status,201);assert.equal(msg.data.senderId,junior.data.id);
  const reply=await req('/applications/'+id+'/messages','POST',{content:'Somos un equipo pequeño'},company.cookie);assert.equal(reply.status,201);
  for(const stranger of [other,second,admin]){assert.equal((await req('/applications/'+id,'GET',null,stranger.cookie)).status,404);assert.equal((await req('/applications/'+id+'/messages','GET',null,stranger.cookie)).status,404);assert.equal((await req('/applications/'+id+'/messages','POST',{content:'Intrusión'},stranger.cookie)).status,404);}
  assert.equal((await req(path+'/candidates','GET',null,second.cookie)).status,403);
  assert.equal((await req(path+'/candidates','GET',null,company.cookie)).data.items[0].profile.skills,'React, SQL');
  assert.equal((await req('/applications/'+id,'PATCH',{status:'shortlisted'},junior.cookie)).status,403);
  assert.equal((await req('/applications/'+id,'PATCH',{status:'shortlisted'},company.cookie)).data.status,'shortlisted');
  assert.equal((await req('/applications/'+id+'/messages','GET',null,company.cookie)).data.items.length,2);
  assert.equal((await req('/applications/'+id+'/messages?after='+msg.data.id,'GET',null,company.cookie)).data.items[0].id,reply.data.id);
  assert.equal((await req('/applications/'+id+'/messages?after=unknown','GET',null,company.cookie)).status,400);
  assert.equal((await req(path+'/decision','PUT',{},junior.cookie)).data.discarded,true);
  assert.equal((await req('/offers','GET',null,junior.cookie)).data.total,0);assert.equal((await req('/offers?discarded=true','GET',null,junior.cookie)).data.total,1);assert.equal((await req('/offers','GET',null,other.cookie)).data.total,1);
  assert.equal((await req(path+'/decision','DELETE',null,junior.cookie)).data.discarded,false);
  assert.equal((await req('/applications/'+id,'DELETE',null,junior.cookie)).data.profile,null);
  assert.equal((await req('/applications/'+id,'GET',null,company.cookie)).data.status,'withdrawn');assert.equal(db.prepare('SELECT profile FROM applications WHERE id=?').get(id).profile,null);
  assert.equal((await req('/applications/'+id,'PATCH',{status:'reviewing'},company.cookie)).status,409);
  assert.equal((await apply()).data.status,'submitted');
  await req('/admin/users/'+junior.data.id+'/restriction','POST',{mode:'permanent',reason:'Abuso de pruebas'},admin.cookie);
  assert.equal((await apply()).status,403);assert.equal((await req('/applications/'+id+'/messages','POST',{content:'Blocked'},junior.cookie)).status,403);
  assert.equal((await req('/applications/'+id+'/messages','GET',null,junior.cookie)).status,200);
  assert.equal((await req('/applications/'+id,'DELETE',null,junior.cookie)).status,200);assert.equal((await req(path+'/decision','PUT',{},junior.cookie)).status,200);
  await req(path,'PATCH',{status:'closed'},company.cookie);
  assert.equal((await req(path+'/conversation','POST',{},other.cookie)).status,409);
  assert.equal((await req(path+'/application','POST',{acceptedSharing:true,sharingVersion:'application-profile-v1'},other.cookie)).status,409);
  assert.equal((await req('/applications/'+id+'/messages','POST',{content:'La oferta ha cerrado'},company.cookie)).status,201);
  await req(path,'DELETE',null,company.cookie);
  assert.equal((await req('/applications/'+id,'GET',null,junior.cookie)).data.offerStatus,'deleted');assert.equal((await req('/applications','GET',null,company.cookie)).data.total,1);
  assert.equal((await req(path+'/decision','DELETE',null,junior.cookie)).status,200);
  const persisted=db.prepare('SELECT content FROM private_messages WHERE id=?').get(reply.data.id);assert.equal(persisted.content,'Somos un equipo pequeño');
  const now=new Date().toISOString();for(let i=0;i<100;i++)db.prepare('INSERT INTO private_messages VALUES(?,?,?,?,?,?)').run('quota-'+i,id,company.data.id,'Company','quota fixture',now);
  assert.equal((await req('/applications/'+id+'/messages','POST',{content:'Over quota'},company.cookie)).status,429);
 }finally{for(const server of servers)await new Promise(r=>{server.close(r);server.closeAllConnections();});auth?.close();db?.close();}
});
