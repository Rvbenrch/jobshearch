import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync,chmodSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function snapshot(source,destination,{stopped=false}={}){
 if(!stopped)throw new Error('Detén Auth, Community y el servidor antes de respaldar ambas bases.');
 source=resolve(source);destination=resolve(destination);const rel=relative(source,destination);if(!rel||(!rel.startsWith('..')&&!isAbsolute(rel)))throw new Error('Usa una carpeta nueva fuera del directorio de datos.');
 if(existsSync(destination))throw new Error('La carpeta de destino ya existe; no se sobrescriben respaldos.');
 const sources=['auth','community'].map(n=>resolve(source,n+'.sqlite'));if(sources.some(p=>!existsSync(p)))throw new Error('Deben existir ambas bases.');
 mkdirSync(destination,{recursive:true,mode:0o700});const handles=[];try{
  const versions=[];for(const path of sources){const db=new DatabaseSync(path,{readOnly:true});handles.push(db);versions.push(db.prepare('PRAGMA data_version').get().data_version);}
  const files=[];for(let i=0;i<handles.length;i++){const name=['auth','community'][i]+'.sqlite',path=resolve(destination,name);handles[i].prepare('VACUUM INTO ?').run(path);if(process.platform!=='win32')chmodSync(path,0o600);const check=new DatabaseSync(path,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||check.prepare('PRAGMA foreign_key_check').all().length)throw new Error('El respaldo no supera la comprobación de integridad.');}finally{check.close();}files.push({name,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});}
  if(handles.some((db,i)=>db.prepare('PRAGMA data_version').get().data_version!==versions[i]))throw new Error('Hubo escrituras durante el respaldo. No uses esta copia; detén todos los servicios y repite en una carpeta nueva.');
  writeFileSync(resolve(destination,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),method:'VACUUM INTO; services stopped',files},null,2),{mode:0o600});return files.length;
 }finally{for(const db of handles)db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{const [source,destination,ack]=process.argv.slice(2);if(!source||!destination||ack!=='--services-stopped')throw new Error('Uso: node scripts/backup.mjs DATA_DIRECTORY NUEVA_CARPETA --services-stopped');const n=snapshot(source,destination,{stopped:true});console.log('Respaldo verificado: '+n+' bases. Mantén esta carpeta privada, cifrada y fuera de Git.');}catch(e){console.error(e.message);process.exitCode=1;}}
