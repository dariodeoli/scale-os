"use client";
import React,{useEffect,useState} from 'react';
import './live-visitors.css';

type VisitorSite={site:string;label:string;active:number};
type VisitorCounts={organization_id:string;estimated:true;synthetic:boolean;window_seconds:90;refresh_seconds:30;sites:VisitorSite[]};
type Props={organizationId:string;role:string;demo?:boolean};
const endpoint='/core-api/api/agency/live-visitors';

export function LiveVisitors({organizationId,role,demo=false}:Props){
 const permitted=['owner','admin'].includes(role);
 // Remount on tenant, role or demo changes so old numbers cannot flash in another company.
 return permitted?<LiveVisitorPanel key={`${organizationId}:${role}:${demo}`} organizationId={organizationId} demo={demo}/>:null;
}

function LiveVisitorPanel({organizationId,demo}:{organizationId:string;demo:boolean}){
 const [counts,setCounts]=useState<VisitorCounts|null>(null),[error,setError]=useState(false);
 useEffect(()=>{
  if(demo)return;
  let stopped=false,pending=false,lastAttempt=-Infinity,controller:AbortController|undefined;
  const load=async()=>{
   if(stopped||pending||document.visibilityState!=='visible'||Date.now()-lastAttempt<30000)return;
   pending=true;lastAttempt=Date.now();controller=new AbortController();
   const timeout=setTimeout(()=>controller?.abort(),8000);
   try{
    const response=await fetch(endpoint,{credentials:'include',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('Unavailable');
    const data:VisitorCounts=await response.json();
    if(String(data.organization_id)!==String(organizationId)||data.synthetic||!Array.isArray(data.sites)||
      data.sites.some(site=>typeof site.site!=='string'||typeof site.label!=='string'||!Number.isSafeInteger(site.active)||site.active<0))throw new Error('Scope mismatch');
    if(!stopped){setCounts(data);setError(false);}
   }catch{if(!stopped){setCounts(null);setError(true);}}
   finally{clearTimeout(timeout);pending=false;}
  };
  const visibility=()=>{if(document.visibilityState==='visible')void load();else controller?.abort();};
  void load();const timer=setInterval(()=>void load(),30000);
  document.addEventListener('visibilitychange',visibility);
  return()=>{stopped=true;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility);};
 },[organizationId,demo]);
 const sites=demo?[{site:'demo-website',label:'Web de ejemplo',active:3}]:counts?.sites;
 return <section className="panel live-visitors" aria-label="Visitantes en la web">
  <div className="live-visitors-heading"><h2>Visitantes en la web</h2><span>{demo?'Ejemplo ficticio':'Activos ahora · estimación'}</span></div>
  <p className="live-visitors-note">{demo?'Demo: estos 3 visitantes son ficticios. No consulta ni modifica las estadísticas de Scale.':'Sesiones anónimas con una página visible en los últimos 90 segundos. No identifica personas. Se actualiza cada 30 segundos.'}</p>
  {!demo&&error?<p role="status">Contador temporalmente no disponible.</p>:!sites?<p role="status">Consultando visitantes…</p>:sites.length===0?<p>No hay sitios vinculados a esta empresa.</p>:<div className="live-visitors-sites" aria-live="polite" aria-atomic="true">{sites.map(site=><article key={site.site}><span>{site.label}</span><strong>{site.active.toLocaleString('es-PY')}</strong><small>{demo?'visitantes ficticios':'sesiones activas estimadas'}</small></article>)}</div>}
  {!demo&&<p className="live-visitors-note">Una sesión puede abarcar varias pestañas del mismo sitio. Navegadores, dominios distintos y bloqueadores pueden cambiar la estimación.</p>}
 </section>;
}
