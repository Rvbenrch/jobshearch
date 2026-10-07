import {randomBytes,randomUUID,scryptSync} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {database,email,dataDirectory} from './common.mjs';
import {resolve} from 'node:path';
const mail=email(process.argv[2]);
const db=database('auth');
db.exec('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,salt TEXT,profile TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT,expires INTEGER);');
const existing=db.prepare('SELECT id,profile FROM users WHERE email=?').get(mail);
const password=randomBytes(18).toString('base64url');
const salt=randomBytes(16).toString('hex');
const passwordHash=scryptSync(password,salt,64).toString('hex');
const id=existing?.id||randomUUID();
const profile={name:'Rubén',skills:'',premium:'unknown',linkedin:false,alerts:true,...(existing?JSON.parse(existing.profile):{}),role:'admin'};
db.exec('BEGIN IMMEDIATE');
try {
  if(existing)db.prepare('UPDATE users SET password=?,salt=?,profile=? WHERE id=?').run(passwordHash,salt,JSON.stringify(profile),id);
  else db.prepare('INSERT INTO users(id,email,password,salt,profile) VALUES(?,?,?,?,?)').run(id,mail,passwordHash,salt,JSON.stringify(profile));
  db.prepare('DELETE FROM sessions WHERE user=?').run(id);
  db.exec('COMMIT');
} catch(e){db.exec('ROLLBACK');throw e;}
writeFileSync(resolve(dataDirectory,'admin-access.txt'),`Acceso local a TalentScope\nCorreo: ${mail}\nContraseña: ${password}\nRol: administrador\n\nArchivo privado: no compartir ni subir a Git.\n`,{mode:0o600});
db.close();
console.log('Cuenta de administrador preparada. Credenciales en data/admin-access.txt (excluido de Git).');
