import test from 'node:test';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';import {mkdirSync,mkdtempSync,copyFileSync,readFileSync} from 'node:fs';import {join} from 'node:path';import {snapshot} from './backup.mjs';
test('Backup: WAL coherente, integridad y restauración independiente de ambos servicios',()=>{
 const root=new URL('../../../work/backup-tests/',import.meta.url);mkdirSync(root,{recursive:true});const dir=mkdtempSync(new URL('run-',root)),source=join(dir,'source'),dest=join(dir,'backup'),restored=join(dir,'restored');mkdirSync(source);mkdirSync(restored);
 for(const name of ['auth','community']){const db=new DatabaseSync(join(source,name+'.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE fixture(id INTEGER PRIMARY KEY,value TEXT);');db.prepare('INSERT INTO fixture VALUES(?,?)').run(1,name==='auth'?'hashed synthetic credentials':'private synthetic message');db.close();}
 assert.throws(()=>snapshot(source,dest),/Detén/);assert.throws(()=>snapshot(source,join(source,'nested'),{stopped:true}),/fuera/);assert.equal(snapshot(source,dest,{stopped:true}),2);assert.throws(()=>snapshot(source,dest,{stopped:true}),/ya existe/);
 assert.equal(JSON.parse(readFileSync(join(dest,'manifest.json'))).files.length,2);
 for(const name of ['auth','community']){copyFileSync(join(dest,name+'.sqlite'),join(restored,name+'.sqlite'));const db=new DatabaseSync(join(restored,name+'.sqlite'));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fixture').get().n,1);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close();}
});
