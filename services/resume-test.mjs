import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomBytes} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';import {resumeTermsVersion} from './resume-contract.mjs';
process.env.DATA_DIRECTORY=mkdtempSync(join(tmpdir(),'talentscope-resume-'));process.env.PORT_OFFSET='1700';process.env.INTERNAL_SECRET=randomBytes(32).toString('hex');
const {extractResume,validateCandidates}=await import('./resume.mjs');
const document='Professional CV. I build applications with React and SQL. I completed a degree in computer science. Private note not to store: RAW-DOCUMENT-SENTINEL. Contact private@example.test.';
const file={filename:'cv.txt',content:Buffer.from(document).toString('base64')};
test('Lectura de TXT, DOCX y PDF; rechaza archivos inválidos y evidencia inventada',async()=>{
 assert.equal((await extractResume(file)).document,document);
 const docx=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="test"><w:body><w:p><w:r><w:t>'+document+'</w:t></w:r></w:p></w:body></w:document>')});
 assert.ok((await extractResume({filename:'cv.docx',content:Buffer.from(docx).toString('base64')})).document.includes('React and SQL'));
 const stream='BT /F1 12 Tf 50 700 Td ('+document.replace(/[()]/g,'')+') Tj ET';const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const xref=Buffer.byteLength(pdf);pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 assert.ok((await extractResume({filename:'cv.pdf',content:Buffer.from(pdf).toString('base64')})).document.includes('React and SQL'));
 await assert.rejects(()=>extractResume({filename:'cv.pdf',content:file.content}),/PDF válido/);
 await assert.rejects(()=>extractResume({filename:'cv.exe',content:file.content}),/Formatos/);
 await assert.rejects(()=>extractResume({filename:'cv.txt',content:Buffer.from('Short').toString('base64')}),/suficiente texto/);
 const concepts=validateCandidates({concepts:[{name:'React',evidence:'React and SQL',category:'technical'},{name:'Rust',evidence:'Unpublished invented evidence',category:'technical'}]},document);assert.equal(concepts.length,1);assert.equal(concepts[0].name,'React');
});
test('CV REST: consentimiento, IA, confirmación, aislamiento, afinidad y eliminación',async()=>{
 delete process.env.OPENAI_API_KEY;
 const originalFetch=globalThis.fetch,servers=[];let calls=0,db;
 globalThis.fetch=async(input,options)=>{if(String(input)==='https://api.openai.com/v1/chat/completions'){calls++;const inputBody=JSON.parse(options.body);assert.equal(inputBody.store,false);assert.ok(!inputBody.messages[1].content.includes('private@example.test'));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({concepts:[{name:'React',evidence:'React and SQL',category:'technical'},{name:'SQL',evidence:'React and SQL',category:'technical'}]})}}]}));}return originalFetch(input,options);};
 try{
  for(const name of ['auth','jobs','mail','gateway'])servers.push((await import('./'+name+'.mjs')).server);const argv=process.argv[1];process.argv[1]='analysis.mjs';servers.push((await import('./analysis.mjs')).server);process.argv[1]=argv;
  async function request(path,method='GET',body,cookie=''){const r=await fetch('http://127.0.0.1:5800/api'+path,{method,headers:{cookie,Origin:'http://127.0.0.1:5173','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  assert.equal((await request('/auth/cv/policy')).status,401);const registered=await request('/auth/register','POST',{email:'resume@example.test',name:'CV User',password:'long-test-password'}),cookie=registered.cookie;
  assert.equal((await request('/jobs','GET',null,cookie)).status,428);
  assert.equal((await request('/auth/profile','PATCH',{skills:'React',resumeCompleted:true},cookie)).data.profile.resumeCompleted,undefined);
  assert.equal((await request('/jobs','GET',null,cookie)).status,428);
  assert.equal((await request('/auth/cv/analyze','POST',file,cookie)).status,400);assert.equal(calls,0);
  const input={...file,acceptedTerms:true,acceptedProcessing:true,termsVersion:resumeTermsVersion};assert.equal((await request('/auth/cv/analyze','POST',input,cookie)).status,503);assert.equal(calls,0);
  process.env.OPENAI_API_KEY='test-key-not-a-real-secret';const draft=await request('/auth/cv/analyze','POST',input,cookie);assert.equal(draft.status,200);assert.equal(calls,1);assert.equal(draft.data.concepts.length,2);
  assert.equal((await request('/jobs','GET',null,cookie)).status,428);
  const other=await request('/auth/register','POST',{email:'other@example.test',password:'other-long-password'});assert.equal((await request('/auth/cv/confirm','POST',{selected:['1']},other.cookie)).status,409);
  assert.equal((await request('/auth/cv/confirm','POST',{selected:['invalid']},cookie)).status,400);
  const confirmed=await request('/auth/cv/confirm','POST',{selected:['1']},cookie);assert.equal(confirmed.status,200);assert.equal(confirmed.data.profile.skills,'React');assert.equal(confirmed.data.profile.resumeCompleted,true);
  const job=await request('/jobs','POST',{title:'Developer',company:'Fixture',description:'React SQL',skills:'React, SQL'},cookie);assert.equal(job.status,200);assert.equal((await request('/jobs/'+job.data.id+'/analysis','GET',null,cookie)).data.score,50);
  const {database}=await import('./common.mjs');db=database('auth');const stored=JSON.stringify(db.prepare('SELECT profile FROM users WHERE id=?').get(registered.data.id));assert.ok(!stored.includes('RAW-DOCUMENT-SENTINEL'));assert.ok(!stored.includes('cv.txt'));assert.equal(db.prepare('SELECT version FROM resume_consents WHERE user=?').get(registered.data.id).version,resumeTermsVersion);assert.ok(readdirSync(process.env.DATA_DIRECTORY).every(name=>!name.endsWith('.txt')&&!name.endsWith('.pdf')));
  const removed=await request('/auth/cv','DELETE',null,cookie);assert.equal(removed.data.profile.resumeCompleted,false);assert.equal(removed.data.profile.skills,'');assert.equal(removed.data.profile.resume,undefined);assert.equal((await request('/jobs','GET',null,cookie)).status,428);
  db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({name:'Admin',role:'admin'}),other.data.id);assert.equal((await request('/admin/overview','GET',null,other.cookie)).status,428);
 }finally{globalThis.fetch=originalFetch;delete process.env.OPENAI_API_KEY;await Promise.all(servers.map(s=>new Promise(resolve=>{s.closeAllConnections();s.close(resolve);})));db?.close();}
});
