"use client";
import {useState} from 'react';
import {api} from './operations';
import {teamRoleLabels} from './team-directory';
import './growth-dashboard.css';
export function DemoToolbar({role}:{role:string}){const [busy,setBusy]=useState(false),[error,setError]=useState('');return <section className="demo-session-note"><p><b>Demo privado · Sin dinero real.</b> Datos, cuentas y documentos ilustrativos, sin validez fiscal. Fechas recientes. Sin correos ni invitaciones externas. Cotización ilustrativa, no tasa de mercado.</p><label>Probar permiso <select value={role} disabled={busy} onChange={async e=>{setBusy(true);try{await api('/api/demo/role',{role:e.target.value});window.location.assign('/produccion');}catch(e){setError(e instanceof Error?e.message:'No se pudo cambiar');setBusy(false);}}}>{Object.entries(teamRoleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><a href="https://sistema.scaleparaguay.com/demo">Iniciar otro Demo</a>{error&&<p role="alert">{error}</p>}</section>;}
