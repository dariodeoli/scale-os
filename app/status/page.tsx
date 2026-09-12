'use client';

import {useEffect,useState} from 'react';
import {CheckCircle2,Clock3,TriangleAlert} from 'lucide-react';
import {WorkspaceFooter} from '../workspace-footer';

export default function StatusPage(){
 const [state,setState]=useState<'checking'|'available'|'unavailable'>('checking');
 useEffect(()=>{let active=true;fetch('/core-api/health',{cache:'no-store'}).then(response=>{if(active)setState(response.ok?'available':'unavailable');}).catch(()=>active&&setState('unavailable'));return()=>{active=false;};},[]);
 const label=state==='available'?'API y base de datos disponibles':state==='unavailable'?'API sin respuesta en esta comprobación':'Comprobando API y base de datos…';
 return <main className="login-page"><section className="login-card status-card"><img src="/brand/icon-192.png" width={56} height={56} alt="Scale OS"/><h1>Estado de Scale OS</h1><p className={`status-indicator ${state}`} aria-live="polite">{state==='available'?<CheckCircle2 aria-hidden="true"/>:state==='unavailable'?<TriangleAlert aria-hidden="true"/>:<Clock3 aria-hidden="true"/>}{label}</p><dl><div><dt>Aplicación</dt><dd>Disponible por HTTPS</dd></div><div><dt>Autenticación</dt><dd>Protegida por sesión</dd></div><div><dt>Correo transaccional</dt><dd>Supervisado mediante WEEM</dd></div></dl><p className="form-note">El estado de la API se comprueba en este momento. Los demás componentes se indican por configuración; esta pantalla se mantiene disponible como comunicación de respaldo.</p><p><a className="secondary" href="https://sistema.scaleparaguay.com/">Landing</a> <a className="secondary" href="/">Abrir Scale OS</a></p><WorkspaceFooter/></section></main>;
}
