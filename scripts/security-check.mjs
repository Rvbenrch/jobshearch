import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const privatePath=p=>p==='.env'||(/^\.env\./.test(p)&&p!=='.env.example')||/^(data|backups|uploads)\//.test(p)||/\.(sqlite|db)(?:-(?:wal|shm))?$/i.test(p)||/\.(key|pem)$/i.test(p)||/admin-access\.txt$/i.test(p);
const pattern='sk-(proj-)?[A-Za-z0-9_-]{25,}|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}';
const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n');
const commits=process.argv.includes('--staged-only')?[]:execFileSync('git',['rev-list','--all'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
let privateFiles=files.filter(privatePath).length,tokenMatches=0;
for(const file of files){try{if(new RegExp(pattern).test(readFileSync(file,'utf8')))tokenMatches++;}catch{}}
const staged=execFileSync('git',['diff','--cached','--name-only','--diff-filter=ACMR'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const file of staged){const content=execFileSync('git',['show',':'+file],{encoding:'utf8',maxBuffer:16000000});if(new RegExp(pattern).test(content))tokenMatches++;}
let historicalPrivate=0;
for(const ref of commits){historicalPrivate+=execFileSync('git',['ls-tree','-r','--name-only',ref],{encoding:'utf8'}).split('\n').filter(privatePath).length;const r=spawnSync('git',['grep','-I','-l','-E',pattern,ref],{encoding:'utf8'});if(r.status>1)throw Error('No se pudo comprobar el historial Git');if(r.stdout.trim())tokenMatches+=r.stdout.trim().split('\n').length;}
const ignored=spawnSync('git',['check-ignore','.env','data/auth.sqlite','data/community.sqlite','data/admin-access.txt'],{encoding:'utf8'}).stdout.trim().split('\n').length===4;
console.log(JSON.stringify({trackedPrivateFiles:privateFiles,localCommitsScanned:commits.length,historicalPrivateFiles:historicalPrivate,tokenPatternMatches:tokenMatches,privatePathsIgnored:ignored}));
if(privateFiles||historicalPrivate||tokenMatches||!ignored)process.exitCode=1;
// This check deliberately reports counts, never discovered secret values. It cannot recognize every possible password or secret format.
