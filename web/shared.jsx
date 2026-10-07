import React,{useState,useEffect} from 'react';
import {Radar,LayoutDashboard,BriefcaseBusiness,Building2,Mail,Settings2,LogOut,ArrowUpRight,ShieldCheck,LoaderCircle,Check,X,Blocks as LayersIcon} from 'lucide-react';
import './style.css';
import './remodel.css';
export async function api(path,method='GET',data){const r=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const b=await r.json();if(!r.ok)throw new Error(b.error||'No se pudo completar la acción');return b;}
export function useUser(){const[user,setUser]=useState(null),[loading,setLoading]=useState(true);useEffect(()=>{api('/auth/me').then(setUser).catch(()=>{}).finally(()=>setLoading(false));},[]);return{user,setUser,loading};}
export function Brand(){return <a className="brand" href="/"><span className="brandmark"><Radar size={25}/></span>Junior <span>Scope</span><small>BETA</small></a>;}
export function Notice({message,onClose}){return message&&<div className="toast" role="status">{message}<button aria-label="Cerrar aviso" onClick={onClose}><X size={16}/></button></div>;}
export function Loading(){return <div className="loading"><LoaderCircle className="spin"/> Preparando tu espacio…</div>;}
export function Modal({title,onClose,children}){useEffect(()=>{const f=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',f);return()=>document.removeEventListener('keydown',f);},[onClose]);return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header><div><span className="eyebrow">JUNIOR SCOPE</span><h2>{title}</h2></div><button className="icon-button" autoFocus aria-label="Cerrar ventana" onClick={onClose}><X/></button></header>{children}</section></div>;}
