import {defineConfig} from 'vite';
export default defineConfig({base:'/jobshearch/',publicDir:false,envDir:false,plugins:[{name:'demo-styles',enforce:'pre',transform(code,id){if(id.endsWith('/style.css'))return code.replace(/url\(['"]?\/web\/architecture\.png['"]?\)/g,'none');}}],build:{outDir:'dist-demo',rollupOptions:{input:'demo.html'}}});
