import {serve,json,body,fail} from './common.mjs';
export function analyze(job,profile){
 const required=(job.skills||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const owned=(profile.skills||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const matched=required.filter(x=>owned.includes(x)),missing=required.filter(x=>!owned.includes(x));
 const pending=!!profile.resumeSubmittedAt&&!profile.resumeCompleted;const score=!pending&&required.length?Math.round(matched.length/required.length*100):null;
 const coverage=[!!job.description,required.length>0,job.applicants!==null,job.vacancies!==null,!!job.companyNotes].filter(Boolean).length;
 return {score,matched,missing,method:'Coincidencia exacta de competencias declaradas; cada competencia tiene el mismo peso.',confidence:pending?'Perfil pendiente':coverage>=4?'Media':'Baja',probability:null,probabilityReason:'Sin datos del proceso de selección y de los demás candidatos no se puede calcular una probabilidad de contratación fiable.',competition:job.applicants&&job.vacancies?Math.round(job.applicants/job.vacancies*10)/10:null,company:{name:job.company,notes:job.companyNotes||'Añade información contrastada de la empresa para analizarla.',source:job.companySource||null,verified:false},recommendations:missing.length?missing.map(s=>'Aporta evidencia o formación en '+s):['Comprueba que tu CV incluye ejemplos de las competencias del puesto.'],coverage};
}
export const server=process.argv[1]?.endsWith('analysis.mjs')?serve('analysis',async(req,res,url)=>{if(req.method==='POST'&&url.pathname==='/analyze'){const b=await body(req);if(!b.job||!b.profile)fail('Faltan datos');json(res,analyze(b.job,b.profile));}else fail('Ruta no encontrada',404);}):null;
