import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomBytes} from 'node:crypto';
test('Administración: permisos, historial y ausencia de secretos',async()=>{
 process.env.DATA_DIRECTORY=mkdtempSync(join(tmpdir(),'talentscope-admin-'));process.env.PORT_OFFSET='600';process.env.INTERNAL_SECRET=randomBytes(32).toString('hex');
 const servers=[];let db;
 try{
  servers.push((await import('./auth.mjs')).server);
  for(const name of ['jobs','mail','gateway'])servers.push((await import('./'+name+'.mjs')).server);
  const oldArg=process.argv[1];process.argv[1]='analysis.mjs';servers.push((await import('./analysis.mjs')).server);process.argv[1]=oldArg;
  async function request(path,method='GET',data,cookie=''){const r=await fetch('http://127.0.0.1:4700/api'+path,{method,headers:{'Content-Type':'application/json',cookie,Origin:'http://127.0.0.1:5173'},...(data?{body:JSON.stringify(data)}:{})});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  assert.equal((await request('/admin/overview')).status,401);
  const regular=await request('/auth/register','POST',{email:'member@example.test',password:'test-long-password',name:'Persona',role:'admin'});assert.equal(regular.status,200);const {database}=await import('./common.mjs');db=database('auth');assert.equal((await request('/jobs','GET',null,regular.cookie)).status,428);db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({...regular.data.profile,resumeCompleted:true}),regular.data.id);assert.notEqual(regular.data.profile.role,'admin');
  assert.equal((await request('/admin/overview','GET',null,regular.cookie)).status,403);
  await request('/auth/profile','PATCH',{name:'Persona',skills:'React',role:'admin'},regular.cookie);assert.equal((await request('/admin/overview','GET',null,regular.cookie)).status,403);
  const admin=await request('/auth/register','POST',{email:'admin@example.test',password:'another-long-password',name:'Admin'});
  db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({...admin.data.profile,role:'admin',resumeCompleted:true}),admin.data.id);
  const offer=await request('/jobs','POST',{title:'QA offer',company:'Fixture',description:'Fixture',skills:'React'},regular.cookie);assert.equal(offer.status,200);
  await request('/jobs/'+offer.data.id+'/analysis','GET',null,regular.cookie);
  await request('/jobs/'+offer.data.id,'PATCH',{status:'applied'},regular.cookie);
  await request('/activity','POST',{page:'jobs',password:'not-to-be-logged',token:'not-to-be-logged'},regular.cookie);
  assert.equal((await request('/activity','POST',{page:'admin'},regular.cookie)).status,403);
  const dashboard=await request('/admin/overview','GET',null,admin.cookie);assert.equal(dashboard.status,200);assert.equal(dashboard.data.summary.users,2);
  const member=dashboard.data.users.find(u=>u.id===regular.data.id);assert.ok(member.createdAt);assert.ok(member.lastLogin);assert.ok(member.interactions>=6);
  const response=JSON.stringify(dashboard.data);for(const secret of ['test-long-password','another-long-password','not-to-be-logged','"password"','"salt"','"token"'])assert.ok(!response.includes(secret));
  const filtered=await request('/admin/overview?user='+regular.data.id+'&q=member','GET',null,admin.cookie);assert.equal(filtered.data.users.length,1);assert.ok(filtered.data.activity.every(e=>e.user===regular.data.id));for(const type of ['offer_created','offer_updated','page_view'])assert.ok(filtered.data.activity.some(e=>e.type===type));
  assert.equal((await request('/admin/overview?eventPage=2','GET',null,admin.cookie)).data.activity.length,0);
 }finally{await Promise.all(servers.map(s=>new Promise(resolve=>{s.closeAllConnections();s.close(resolve);})));db?.close();}
});
