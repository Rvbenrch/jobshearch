import React,{useEffect,useState} from 'react';
import {LoaderCircle,FileCheck,AlertCircle} from 'lucide-react';
import {api} from './shared.jsx';
export function ResumeStatus({user}){
 const [state,setState]=useState({job:user.profile.resumeJob,completed:user.profile.resumeCompleted}),[error,setError]=useState('');
 useEffect(()=>{let active=true,timer;async function poll(){try{const result=await api('/auth/cv/status');if(!active)return;setState(result);setError('');if(result.job?.status==='processing')timer=setTimeout(poll,5000);}catch(e){if(active){setError('No se pudo actualizar el estado del CV. Reintentando…');timer=setTimeout(poll,10000);}}}if(user.profile.resumeSubmittedAt)poll();return()=>{active=false;clearTimeout(timer);};},[user.id,user.profile.resumeJob?.id]);
 const job=state.job;if(!job||job.status==='confirmed')return null;const working=job.status==='processing',ready=job.status==='ready';
 return <section className={'resume-status '+(ready?'ready':working?'working':'failed')} role="status" aria-live="polite">{working?<LoaderCircle className="spin" size={21}/>:ready?<FileCheck size={21}/>:<AlertCircle size={21}/>}<div><b>{working?'Estamos preparando tu perfil en segundo plano':ready?'Tu perfil está listo para revisar':'El análisis del CV necesita atención'}</b><p>{error||(working?'Puedes buscar ofertas y cambiar de página. La afinidad de tu nuevo perfil estará disponible después de confirmarlo.':ready?'Revisa los conceptos extraídos para activar el ajuste de las ofertas a tu perfil.':job.error||'Vuelve a subir el CV para completar el perfil.')}</p></div><a className="secondary" href={working?'/account.html':'/account.html?reviewCV=1'}>{working?'Ver mi currículum':ready?'Revisar perfil':'Reintentar análisis'}</a></section>;
}
