import http from 'node:http';
import {call,json,body,fail,text} from './common.mjs';
import {allowedOrigin} from './origin.mjs';
const cookie=req=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ts_session='))?.slice(11)||'';
const counts=new Map();
export const server=http.createServer({requestTimeout:60000,headersTimeout:15000,maxHeaderSize:16384},async(req,res)=>{try{
 const url=new URL(req.url,'http://local'),p=url.pathname.replace(/^\/api/,'');
 const key=req.socket.remoteAddress,now=Date.now();let count=counts.get(key);if(counts.size>5000)for(const [k,v] of counts)if(v.until<now)counts.delete(k);if(!count||count.until<now)count={n:0,until:now+60000};count.n++;counts.set(key,count);if(count.n>150)fail('Demasiadas peticiones',429);
 if(req.method!=='GET'&&(!req.headers.origin||!allowedOrigin(req.headers.origin,process.env.PUBLIC_ORIGIN||'http://localhost:5173')))fail('Origen no permitido',403);
 if(p==='/health'&&req.method==='GET'){await Promise.all([call('auth','/health',{timeoutMs:1500}),call('community','/health',{timeoutMs:1500})]);json(res,{ready:true});return;}
 const secure=(process.env.PUBLIC_ORIGIN||'').startsWith('https:')?'; Secure':'';
 if(['/auth/register','/auth/login'].includes(p)){if(req.method!=='POST')fail('Método no permitido',405);const result=await call('auth',p.replace('/auth',''),{method:'POST',body:JSON.stringify(await body(req)),headers:{'x-client-ip':key}});res.setHeader('Set-Cookie','ts_session='+result.token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800'+secure);json(res,result.user);return;}
 const token=cookie(req),u=await call('auth','/me',{headers:{'x-session':token}}),headers={'x-session':token,'x-user':u.id,'x-account-type':u.profile.accountType||'','x-author-name':encodeURIComponent(u.profile.accountType==='company'?(u.profile.companyName||u.profile.name):u.profile.name)};
 if(p==='/auth/me'&&req.method==='GET'){json(res,u);return;}
 if(p==='/auth/logout'&&req.method==='POST'){await call('auth','/logout',{method:'POST',headers});res.setHeader('Set-Cookie','ts_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+secure);json(res,{ok:true});return;}
 if(['/auth/type','/auth/workspace'].includes(p)&&req.method==='POST'||p==='/auth/profile'&&req.method==='PATCH'){json(res,await call('auth',p.replace('/auth',''),{method:req.method,headers,body:JSON.stringify(await body(req))}));return;}
 if(p.startsWith('/admin/')){if(u.profile.role!=='admin')fail('Administración está reservada a cuentas con permiso de administrador.',403);if(!['GET','POST','PATCH','DELETE'].includes(req.method))fail('Método no permitido',405);json(res,await call('auth',p+url.search,{method:req.method,headers,...(req.method!=='GET'?{body:JSON.stringify(await body(req))}:{})}));return;}
 if(!['junior','company'].includes(u.profile.accountType))fail('Selecciona Junior o Empresa para continuar',428);
 if(p==='/juniors'||p.startsWith('/juniors/')){if(req.method!=='GET')fail('Método no permitido',405);json(res,await call('auth',p+url.search,{headers}));return;}
 if(p==='/reports'&&req.method==='POST'){const b=await body(req);let targetUser,subject;
  if(b.targetType==='post'){subject=await call('community','/posts/'+encodeURIComponent(text(b.targetId,100)),{headers});if(subject.status!=='published')fail('Solo puedes denunciar publicaciones visibles',404);targetUser=subject.ownerId;}
  else if(b.targetType==='user'){if(b.sourcePostId){const post=await call('community','/posts/'+encodeURIComponent(text(b.sourcePostId,100)),{headers});if(post.status!=='published')fail('Publicación no disponible',404);if(b.sourceCommentId){subject=await call('community','/posts/'+encodeURIComponent(post.id)+'/comments/'+encodeURIComponent(text(b.sourceCommentId,100)),{headers});targetUser=subject.ownerId;}else{subject=post;targetUser=post.ownerId;}}else{subject=await call('auth','/juniors/'+encodeURIComponent(text(b.targetId,100)),{headers});targetUser=subject.id;}if(targetUser!==b.targetId)fail('El usuario no corresponde al contenido visible',400);}
  else fail('Selecciona usuario o publicación');
  json(res,await call('auth','/reports',{method:'POST',headers,body:JSON.stringify({targetType:b.targetType,targetId:text(b.targetId,100),targetUser,reason:b.reason,context:text(b.context,3000)+'\nReferencia visible: '+text(subject.title||subject.content||subject.name,300)+(b.sourcePostId?' · Publicación '+text(b.sourcePostId,100):'')})}),201);return;}
 if(p==='/applications'||p.startsWith('/applications/')||p==='/offers'||p.startsWith('/offers/')||p==='/posts'||p.startsWith('/posts/')){
  if(!['GET','POST','PATCH','DELETE','PUT'].includes(req.method))fail('Método no permitido',405);
  const privateRoute=p.startsWith('/applications')||/^\/offers\/[^/]+\/(application|conversation|decision|candidates)$/.test(p);const withdrawal=privateRoute&&(req.method==='DELETE'||p.endsWith('/decision'));if(req.method!=='GET'&&!withdrawal&&u.restriction.active)fail('No puedes publicar contenido: '+u.restriction.reason+(u.restriction.until?' · Hasta '+u.restriction.until:' · Bloqueo permanente'),403);
  const result=await call('community',p+url.search,{method:req.method,headers,...(['POST','PATCH','PUT','DELETE'].includes(req.method)?{body:JSON.stringify(await body(req,3000000))}:{})});
  let event;if(!privateRoute&&p.split('/').length<=3&&['POST','PATCH','DELETE'].includes(req.method))event=(p.startsWith('/offers')?'offer':'contribution')+'_'+({POST:'created',PATCH:'updated',DELETE:'deleted'}[req.method]);else if(p.endsWith('/reaction')&&req.method==='PUT')event='reaction_updated';else if(p.endsWith('/repost')&&req.method==='POST')event='post_reposted';else if(p.endsWith('/comments')&&req.method==='POST')event='comment_created';else if(p.includes('/comments/')&&req.method==='DELETE')event='comment_deleted';if(event)await call('auth','/activity',{method:'POST',headers,body:JSON.stringify({type:event,title:result.title||'',id:result.id||p.split('/')[2]})});
  json(res,result,req.method==='POST'?201:200);return;
 }
 fail('Ruta no encontrada',404);
 }catch(e){json(res,{error:e.status?e.message:'Servicio no disponible'},e.status||503);}}).listen(4100+Number(process.env.PORT_OFFSET||0),'127.0.0.1');
