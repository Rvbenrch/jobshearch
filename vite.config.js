import {defineConfig} from 'vite';
export default defineConfig({resolve:{preserveSymlinks:true},server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':'http://127.0.0.1:4100'}},build:{rollupOptions:{input:{main:'index.html',account:'account.html',admin:'admin.html'}}}});
