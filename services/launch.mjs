import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
if(existsSync('.env'))process.loadEnvFile('.env');
process.env.INTERNAL_SECRET||=randomBytes(48).toString('hex');
process.env.PUBLIC_ORIGIN||='http://localhost:5173';
const children=['auth','jobs','analysis','mail','discovery','gateway'].map(s=>spawn(process.execPath,['services/'+s+'.mjs'],{stdio:'inherit',env:process.env}));
children.push(spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit',env:process.env}));
function stop(){for(const c of children)c.kill();}
process.on('SIGINT',()=>{stop();process.exit(0);});process.on('SIGTERM',()=>{stop();process.exit(0);});for(const c of children)c.on('exit',code=>{if(code){stop();process.exit(code);}});
