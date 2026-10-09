import {randomUUID} from 'node:crypto';
import {body,call,fail,json,text} from './common.mjs';
export const sharingVersion='application-profile-v1';
export function initializeHiring(db){db.exec(`
 CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,offer_id TEXT NOT NULL,company_id TEXT NOT NULL,junior_id TEXT NOT NULL,junior_name TEXT NOT NULL,company_name TEXT NOT NULL,offer_title TEXT NOT NULL,profile TEXT,status TEXT NOT NULL,created_at TEXT NOT NULL,applied_at TEXT,updated_at TEXT NOT NULL,consent_version TEXT,UNIQUE(offer_id,junior_id));
 CREATE TABLE IF NOT EXISTS private_messages(id TEXT PRIMARY KEY,application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,sender_id TEXT NOT NULL,sender_name TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS private_messages_thread ON private_messages(application_id,created_at);
 CREATE INDEX IF NOT EXISTS applications_company ON applications(company_id,updated_at);
 CREATE INDEX IF NOT EXISTS applications_junior ON applications(junior_id,updated_at);
 CREATE TABLE IF NOT EXISTS offer_decisions(offer_id TEXT NOT NULL,user_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(offer_id,user_id));
 CREATE TABLE IF NOT EXISTS hiring_events(id TEXT PRIMARY KEY,application_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL);
 `);}
export function createHiring(db){
 const offer=id=>{const row=db.prepare('SELECT * FROM offers WHERE id=?').get(id);if(!row)fail('Oferta no encontrada',404);return {...JSON.parse(row.data),id:row.id,ownerId:row.owner};};
 function openOffer(id,user){const o=offer(id);if(o.status!=='published')fail('La oferta no está abierta para nuevas candidaturas o conversaciones',409);if(o.ownerId===user)fail('No puedes presentarte a una oferta propia');return o;}
 function participant(id,user){const r=db.prepare('SELECT * FROM applications WHERE id=?').get(id);if(!r||![r.junior_id,r.company_id].includes(user))fail('Conversación no encontrada',404);return r;}
 function present(r,user){const live=db.prepare('SELECT data FROM offers WHERE id=?').get(r.offer_id);return {id:r.id,offerId:r.offer_id,offerTitle:r.offer_title,companyName:r.company_name,juniorName:r.junior_name,juniorId:r.junior_id,companyId:r.company_id,status:r.status,profile:r.status==='withdrawn'?null:r.profile?JSON.parse(r.profile):null,createdAt:r.created_at,appliedAt:r.applied_at,updatedAt:r.updated_at,offerStatus:live?JSON.parse(live.data).status:'deleted',messageCount:db.prepare('SELECT COUNT(*) AS n FROM private_messages WHERE application_id=?').get(r.id).n,participant:user===r.company_id?'company':'junior'};}
 const event=(id,user,action)=>db.prepare('INSERT INTO hiring_events VALUES(?,?,?,?,?)').run(randomUUID(),id,user,action,new Date().toISOString());
 async function writable(user){const r=await call('auth','/moderation/check',{headers:{'x-user':user}});if(r.active)fail('No puedes enviar candidaturas o mensajes: '+r.reason,403);}
 function create(o,user,author){const existing=db.prepare('SELECT * FROM applications WHERE offer_id=? AND junior_id=?').get(o.id,user);if(existing)return existing;if(db.prepare('SELECT COUNT(*) AS n FROM applications WHERE junior_id=?').get(user).n>=200)fail('Límite de 200 conversaciones/candidaturas',429);const n=db.prepare('SELECT COUNT(*) AS n FROM applications WHERE junior_id=? AND created_at>?').get(user,new Date(Date.now()-86400000).toISOString()).n;if(n>=20)fail('Máximo veinte nuevas conversaciones por día',429);const id=randomUUID(),now=new Date().toISOString();db.prepare("INSERT INTO applications VALUES(?,?,?,?,?,?,?,NULL,'contacted',?,NULL,?,NULL)").run(id,o.id,o.ownerId,user,author,o.companyName,o.title,now,now);event(id,user,'conversation_created');return db.prepare('SELECT * FROM applications WHERE id=?').get(id);}
 return async function handle(req,res,url,{user,type,author}){
  const parts=url.pathname.split('/').filter(Boolean),page=Math.max(1,Math.min(1000,Number.parseInt(url.searchParams.get('page'))||1));
  if(parts[0]==='offers'&&parts.length===3&&['application','conversation','decision','candidates'].includes(parts[2])){
   const id=parts[1],action=parts[2];
   if(action==='candidates'){if(req.method!=='GET'||type!=='company')fail('Acceso exclusivo para la empresa propietaria',403);if(offer(id).ownerId!==user)fail('No puedes ver candidatos de otra empresa',403);const rows=db.prepare('SELECT * FROM applications WHERE offer_id=? AND company_id=? ORDER BY updated_at DESC').all(id,user);json(res,{items:rows.slice((page-1)*20,page*20).map(r=>present(r,user)),total:rows.length,page,pageSize:20});return true;}
   if(type!=='junior')fail('Esta acción corresponde al espacio Junior',403);
   if(action==='decision'){if(req.method==='DELETE'){db.prepare('DELETE FROM offer_decisions WHERE offer_id=? AND user_id=?').run(id,user);json(res,{discarded:false});return true;}if(req.method==='PUT'){openOffer(id,user);db.prepare('INSERT INTO offer_decisions VALUES(?,?,?) ON CONFLICT(offer_id,user_id) DO NOTHING').run(id,user,new Date().toISOString());json(res,{discarded:true});return true;}fail('Método no permitido',405);}
   let existing=db.prepare('SELECT * FROM applications WHERE offer_id=? AND junior_id=?').get(id,user);
   if(req.method==='GET'){const o=offer(id);if(o.status!=='published'&&!existing)fail('Oferta no encontrada',404);json(res,{application:existing?present(existing,user):null,discarded:!!db.prepare('SELECT 1 FROM offer_decisions WHERE offer_id=? AND user_id=?').get(id,user),sharingVersion});return true;}
   if(action==='application'&&req.method==='DELETE'){if(!existing)fail('Candidatura no encontrada',404);db.prepare("UPDATE applications SET status='withdrawn',profile=NULL,updated_at=? WHERE id=?").run(new Date().toISOString(),existing.id);event(existing.id,user,'application_withdrawn');json(res,present(participant(existing.id,user),user));return true;}
   if(req.method!=='POST')fail('Método no permitido',405);await writable(user);
   if(action==='conversation'&&existing){json(res,present(existing,user));return true;}
   const o=openOffer(id,user),input=await body(req);
   if(action==='application'){
    if(input.acceptedSharing!==true||input.sharingVersion!==sharingVersion)fail('Acepta compartir tu perfil profesional con esta empresa',400);
    if(existing&&!['contacted','withdrawn'].includes(existing.status)){json(res,present(existing,user));return true;}
    const profile=await call('auth','/hiring/profile',{headers:{'x-session':req.headers['x-session']}});if(profile.id!==user)fail('Identidad no válida',403);
    openOffer(id,user);if(!existing)existing=create(o,user,author);const now=new Date().toISOString();db.prepare("UPDATE applications SET profile=?,junior_name=?,status='submitted',applied_at=?,updated_at=?,consent_version=? WHERE id=?").run(JSON.stringify(profile),profile.name,now,now,sharingVersion,existing.id);db.prepare('DELETE FROM offer_decisions WHERE offer_id=? AND user_id=?').run(id,user);event(existing.id,user,'application_submitted');json(res,present(participant(existing.id,user),user),201);return true;
   }
   if(!existing)existing=create(o,user,author);json(res,present(existing,user),201);return true;
  }
  if(parts[0]!=='applications')return false;
  if(parts.length===1&&req.method==='GET'){const column=type==='company'?'company_id':'junior_id';const rows=db.prepare('SELECT * FROM applications WHERE '+column+'=? ORDER BY updated_at DESC,id').all(user);json(res,{items:rows.slice((page-1)*20,page*20).map(r=>present(r,user)),total:rows.length,page,pageSize:20});return true;}
  if(parts.length<2||parts.length>3)fail('Ruta no encontrada',404);const r=participant(parts[1],user);
  // A switched admin keeps access to their own conversation, but may not impersonate another participant.
  if(parts.length===2&&req.method==='GET'){json(res,present(r,user));return true;}
  if(parts.length===2&&req.method==='DELETE'){if(r.junior_id!==user)fail('Solo el candidato puede retirar su candidatura',403);db.prepare("UPDATE applications SET status='withdrawn',profile=NULL,updated_at=? WHERE id=?").run(new Date().toISOString(),r.id);event(r.id,user,'application_withdrawn');json(res,present(participant(r.id,user),user));return true;}
  if(parts.length===2&&req.method==='PATCH'){if(r.company_id!==user||type!=='company')fail('Solo la empresa participante puede actualizar el estado',403);await writable(user);const b=await body(req);if(!['reviewing','shortlisted','rejected'].includes(b.status)||['contacted','withdrawn'].includes(participant(r.id,user).status))fail('Estado de candidatura no válido',409);db.prepare('UPDATE applications SET status=?,updated_at=? WHERE id=?').run(b.status,new Date().toISOString(),r.id);event(r.id,user,'application_'+b.status);json(res,present(participant(r.id,user),user));return true;}
  if(parts[2]!=='messages')fail('Ruta no encontrada',404);
  if(req.method==='GET'){const after=text(url.searchParams.get('after'),100);let afterRow;if(after){afterRow=db.prepare('SELECT sequence FROM (SELECT id,rowid AS sequence FROM private_messages WHERE application_id=?) WHERE id=?').get(r.id,after);if(!afterRow)fail('Cursor de mensajes no válido',400);}const items=db.prepare('SELECT id,sender_id AS senderId,sender_name AS senderName,content,created_at AS createdAt FROM private_messages WHERE application_id=? AND rowid>? ORDER BY rowid LIMIT 50').all(r.id,afterRow?.sequence||0);const last=items.at(-1)?.id||after||null;const lastRow=last?db.prepare('SELECT rowid AS n FROM private_messages WHERE id=?').get(last):null;const more=!!db.prepare('SELECT 1 FROM private_messages WHERE application_id=? AND rowid>? LIMIT 1').get(r.id,lastRow?.n||0);json(res,{items,nextCursor:last,hasMore:more});return true;}
  if(req.method==='POST'){await writable(user);if((r.junior_id===user&&type!=='junior')||(r.company_id===user&&type!=='company'))fail('Abre el espacio correspondiente para responder',403);const b=await body(req),content=text(b.content,4000);if(!content)fail('Escribe un mensaje');if(typeof b.content!=='string'||b.content.length>4000)fail('Máximo 4000 caracteres por mensaje');const n=db.prepare('SELECT COUNT(*) AS n FROM private_messages WHERE sender_id=? AND created_at>?').get(user,new Date(Date.now()-86400000).toISOString()).n;if(n>=100)fail('Máximo cien mensajes por día',429);const id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO private_messages VALUES(?,?,?,?,?,?)').run(id,r.id,user,author,content,now);db.prepare('UPDATE applications SET updated_at=? WHERE id=?').run(now,r.id);event(r.id,user,'message_sent');json(res,{id,senderId:user,senderName:author,content,createdAt:now},201);return true;}
  fail('Método no permitido',405);
 };
}
