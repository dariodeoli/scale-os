'use client';

import {useEffect,useState} from 'react';
import {Activity,CheckCircle2,Clock3,Globe,Mail,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react';
import {WorkspaceFooter} from '../workspace-footer';
import './status.css';

type Check='checking'|'available'|'unavailable';

export default function StatusPage(){
 const [state,setState]=useState<Check>('checking');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setState('checking');fetch('/core-api/health',{cache:'no-store'}).then(response=>{if(active)setState(response.ok?'available':'unavailable');}).catch(()=>active&&setState('unavailable'));return()=>{active=false;};},[attempt]);
 const label=state==='available'?'API y base de datos disponibles':state==='unavailable'?'API sin respuesta en esta comprobación':'Comprobando API y base de datos…';
 const components=[
  {icon:<Activity size={17}/>,name:'Aplicación',detail:'Disponible por HTTPS',tone:'available',chip:'Operativo'},
  {icon:<ShieldCheck size={17}/>,name:'Autenticación',detail:'Protegida por sesión',tone:'available',chip:'Configurado'},
  {icon:<Mail size={17}/>,name:'Correo transaccional',detail:'Supervisado mediante WEEM',tone:'available',chip:'Supervisado'},
  {icon:<Globe size={17}/>,name:'API y base de datos',detail:state==='available'?'Responde a la comprobación en vivo':state==='unavailable'?'Sin respuesta en esta comprobación':'Comprobando ahora…',tone:state,chip:state==='available'?'Operativo':state==='unavailable'?'Sin respuesta':'Comprobando'},
 ];
 return <main className="login-page status-page"><section className="status-shell">
  <header className="status-hero">
   <span className="status-brand"><img src="/brand/icon-192.png" width={52} height={52} alt="Scale OS"/></span>
   <div className="status-hero-copy">
    <p className="status-eyebrow">Comunicación de respaldo</p>
    <h1>Estado de Scale OS</h1>
    <p className={`status-chip is-${state}`} aria-live="polite">{state==='available'?<CheckCircle2 size={14} aria-hidden="true"/>:state==='unavailable'?<TriangleAlert size={14} aria-hidden="true"/>:<Clock3 size={14} aria-hidden="true"/>}{label}</p>
   </div>
   <button className="secondary status-refresh" type="button" disabled={state==='checking'} onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={14}/>{state==='checking'?'Comprobando…':'Volver a comprobar'}</button>
  </header>
  <ul className="status-components" aria-label="Componentes supervisados">
   {components.map(component=><li key={component.name}>
    <span className={`status-component-icon is-${component.tone}`} aria-hidden="true">{component.icon}</span>
    <div><b>{component.name}</b><small>{component.detail}</small></div>
    <span className={`status-chip sm is-${component.tone}`}>{component.chip}</span>
   </li>)}
  </ul>
  <p className="form-note">El estado de la API se comprueba en este momento. Los demás componentes se indican por configuración; esta pantalla se mantiene disponible como comunicación de respaldo.</p>
  <div className="status-actions"><a className="secondary" href="https://sistema.scaleparaguay.com/">Landing</a><a className="secondary" href="/">Abrir Scale OS</a></div>
  <WorkspaceFooter/>
 </section></main>;
}
