'use client';

import {useEffect,useState} from 'react';
import {Activity,CheckCircle2,Clock3,Globe,Mail,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {AccessLayout} from '../access-layout';
import {StateChip} from '../ui-v2';

type Check='checking'|'available'|'unavailable';

const ROW='flex flex-wrap items-center gap-3 border-b border-ink-600/60 py-3 last:border-0';

export default function StatusPage(){
 const [state,setState]=useState<Check>('checking');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setState('checking');fetch('/core-api/health',{cache:'no-store'}).then(response=>{if(active)setState(response.ok?'available':'unavailable');}).catch(()=>active&&setState('unavailable'));return()=>{active=false;};},[attempt]);
 const label=state==='available'?'API y base de datos disponibles':state==='unavailable'?'API sin respuesta en esta comprobación':'Comprobando API y base de datos…';
 const tone=state==='available'?'ok' as const:state==='unavailable'?'bad' as const:'mute' as const;
 const components=[
  {icon:<Activity size={17}/>,name:'Aplicación',detail:'Disponible por HTTPS',tone:'ok' as const,chip:'Operativo'},
  {icon:<ShieldCheck size={17}/>,name:'Autenticación',detail:'Protegida por sesión',tone:'ok' as const,chip:'Configurado'},
  {icon:<Mail size={17}/>,name:'Correo transaccional',detail:'Supervisado mediante WEEM',tone:'ok' as const,chip:'Supervisado'},
  {icon:<Globe size={17}/>,name:'API y base de datos',detail:state==='available'?'Responde a la comprobación en vivo':state==='unavailable'?'Sin respuesta en esta comprobación':'Comprobando ahora…',tone,chip:state==='available'?'Operativo':state==='unavailable'?'Sin respuesta':'Comprobando'},
 ];
 return <AccessLayout wide eyebrow="Comunicación de respaldo">
  <div className="grid gap-2">
   <h1 className="text-2xl font-bold tracking-tight text-fore">Estado de Scale OS</h1>
   <p aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm text-mute">
    <StateChip tone={tone} title="Comprobación en vivo del API">{state==='available'?<CheckCircle2 size={14} aria-hidden="true"/>:state==='unavailable'?<TriangleAlert size={14} aria-hidden="true"/>:<Clock3 size={14} aria-hidden="true"/>} {label}</StateChip>
    <button className="secondary" type="button" disabled={state==='checking'} onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={14} aria-hidden="true"/>{state==='checking'?'Comprobando…':'Volver a comprobar'}</button>
   </p>
  </div>
  <ul className="grid" aria-label="Componentes supervisados">
   {components.map(component=><li key={component.name} className={ROW}>
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute" aria-hidden="true">{component.icon}</span>
    <div className="min-w-0 flex-1"><b className="block text-[13.5px] font-semibold text-fore">{component.name}</b><small className="block text-[11.5px] text-mute">{component.detail}</small></div>
    <StateChip tone={component.tone}>{component.chip}</StateChip>
   </li>)}
  </ul>
  <p className="text-[11.5px] text-mute">El estado de la API se comprueba en este momento. Los demás componentes se indican por configuración; esta pantalla se mantiene disponible como comunicación de respaldo.</p>
  <div className="flex flex-wrap items-center gap-2"><a className="secondary" href="https://sistema.scaleparaguay.com/">Landing</a><a className="secondary" href="/">Abrir Scale OS</a></div>
 </AccessLayout>;
}
