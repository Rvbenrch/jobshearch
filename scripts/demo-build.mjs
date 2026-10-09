import {build} from 'vite';
import {renameSync,writeFileSync,readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
await build({configFile:'vite.demo.config.js'});
renameSync('dist-demo/demo.html','dist-demo/index.html');
writeFileSync('dist-demo/.nojekyll','');
function inspect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='assets')throw new Error('Directorio inesperado en la demo');inspect(path);}else{if(!/\.(html|css|js)$/.test(entry.name)&&entry.name!=='.nojekyll')throw new Error('Archivo inesperado en la demo');const content=readFileSync(path,'utf8');if(/sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/.test(content))throw new Error('Posible secreto en el artefacto');}}}
inspect('dist-demo');console.log('Demo estática verificada: solo HTML, CSS y JavaScript.');
