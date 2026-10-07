export const eventLabels={job_search:'Búsqueda de empleo',sources_updated:'Fuentes actualizadas',register:'Cuenta creada',login:'Inicio de sesión',logout:'Cierre de sesión',profile_updated:'Perfil actualizado',linkedin_connected:'LinkedIn conectado',offer_created:'Oferta guardada',offer_updated:'Oferta actualizada',offer_deleted:'Oferta eliminada',analysis_viewed:'Análisis consultado',notification:'Notificación preparada',page_view:'Página visitada'};
export function initializeAdmin(db){
 const columns=db.prepare('PRAGMA table_info(users)').all().map(x=>x.name);
 for(const name of ['created_at','last_login'])if(!columns.includes(name))db.exec(`ALTER TABLE users ADD COLUMN ${name} TEXT`);
 db.exec('CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,user TEXT NOT NULL,type TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS events_user_date ON events(user,created_at);');
}
export function recordEvent(db,user,type,details={}){if(!eventLabels[type])throw new Error('Evento desconocido');const safe={};for(const k of ['title','status','page','offerId'])if(typeof details[k]==='string')safe[k]=details[k].slice(0,300);db.prepare('INSERT INTO events(user,type,details,created_at) VALUES(?,?,?,?)').run(user,type,JSON.stringify(safe),new Date().toISOString());}
export function adminOverview(db,params){
 const q=(params.get('q')||'').slice(0,200).toLowerCase();const selected=params.get('user')||'';
 const page=Math.max(1,Math.min(100000,Number.parseInt(params.get('page'))||1));const eventPage=Math.max(1,Math.min(100000,Number.parseInt(params.get('eventPage'))||1));const pageSize=20;
 const where="WHERE instr(lower(email),?)>0 OR instr(lower(coalesce(json_extract(profile,'$.name'),'')),?)>0";
 const total=db.prepare('SELECT COUNT(*) AS count FROM users '+where).get(q,q).count;
 const users=db.prepare(`SELECT id,email,profile,created_at,last_login,(SELECT COUNT(*) FROM events WHERE events.user=users.id) AS interactions,(SELECT MAX(created_at) FROM events WHERE events.user=users.id) AS last_activity FROM users ${where} ORDER BY coalesce(created_at,'') DESC,email LIMIT ? OFFSET ?`).all(q,q,pageSize,(page-1)*pageSize).map(u=>{const p=JSON.parse(u.profile);return{id:u.id,email:u.email,name:p.name,role:p.role==='admin'?'admin':'user',premium:p.premium,linkedin:!!p.linkedin,createdAt:u.created_at,lastLogin:u.last_login,lastActivity:u.last_activity,interactions:u.interactions};});
 const eventWhere=selected?'WHERE e.user=?':'';const args=selected?[selected]:[];
 const eventTotal=db.prepare('SELECT COUNT(*) AS count FROM events e '+eventWhere).get(...args).count;
 const activity=db.prepare(`SELECT e.id,e.user,e.type,e.details,e.created_at,u.email,json_extract(u.profile,'$.name') AS name FROM events e JOIN users u ON u.id=e.user ${eventWhere} ORDER BY e.id DESC LIMIT ? OFFSET ?`).all(...args,pageSize,(eventPage-1)*pageSize).map(e=>({...e,label:eventLabels[e.type],details:JSON.parse(e.details),createdAt:e.created_at}));
 const trackingStarted=db.prepare('SELECT MIN(created_at) AS date FROM events').get().date;
 return {summary:{users:db.prepare('SELECT COUNT(*) AS count FROM users').get().count,activeUsers:db.prepare('SELECT COUNT(DISTINCT user) AS count FROM events WHERE created_at>=?').get(new Date(Date.now()-7*86400000).toISOString()).count,interactions:db.prepare('SELECT COUNT(*) AS count FROM events').get().count,activeSessions:db.prepare('SELECT COUNT(DISTINCT user) AS count FROM sessions WHERE expires>?').get(Date.now()).count},users,activity,total,eventTotal,page,eventPage,pageSize,trackingStarted};
}
