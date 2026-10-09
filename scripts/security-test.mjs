import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('Git: detecta secretos preparados aunque se limpien del archivo y detecta datos privados forzados',()=>{
 const root=new URL('../../../work/security-tests/',import.meta.url);mkdirSync(root,{recursive:true});const dir=mkdtempSync(new URL('run-',root));const git=(...args)=>execFileSync('git',args,{cwd:dir,stdio:['ignore','pipe','ignore']});git('init');writeFileSync(dir+'/.gitignore','.env\ndata/\n');git('add','.gitignore');const script=fileURLToPath(new URL('./security-check.mjs',import.meta.url));const scan=()=>spawnSync(process.execPath,[script,'--staged-only'],{cwd:dir,encoding:'utf8'});
 assert.equal(scan().status,0);
 writeFileSync(dir+'/config.js',"const secret='"+'sk-'+'proj-'+'A'.repeat(40)+"';");git('add','config.js');writeFileSync(dir+'/config.js','const secret="";');const staged=scan();assert.equal(staged.status,1);assert.ok(JSON.parse(staged.stdout).tokenPatternMatches>0);assert.ok(!staged.stdout.includes('A'.repeat(40)));
 git('add','config.js');assert.equal(scan().status,0);
 writeFileSync(dir+'/.env','PRIVATE_VALUE=fixture-only');git('add','-f','.env');const privateFile=scan();assert.equal(privateFile.status,1);assert.equal(JSON.parse(privateFile.stdout).trackedPrivateFiles,1);
});
