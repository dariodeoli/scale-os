"use client";
import {useState} from 'react';
import {api} from './operations';
import {teamRoleLabels} from './team-directory';
import {Dialog} from './dialog';
import {Info,RotateCcw} from 'lucide-react';
import './workspace-density.css';

export function DemoToolbar({role}:{role:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState(false);
 return <div className="demo-tools" aria-label="Controles de la demo">
  <button className="demo-badge" type="button" onClick={()=>setInfo(true)} aria-label="Información de la demo"><Info size={14}/>Demo</button>
  <select aria-label="Probar permiso" title="Probar otro permiso" value={role} disabled={busy} onChange={async e=>{
   setBusy(true);setError('');
   try{await api('/api/demo/role',{role:e.target.value});window.location.assign('/produccion');}
   catch(e){setError(e instanceof Error?e.message:'No se pudo cambiar');setBusy(false);}
  }}>{Object.entries(teamRoleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
  <a className="demo-reset" href="https://sistema.scaleparaguay.com/demo" title="Reiniciar demo" aria-label="Reiniciar demo"><RotateCcw size={16}/><span>Reiniciar</span></a>
  {error&&<p role="alert" className="demo-error">{error}</p>}
  {info&&<Dialog title="Tu espacio de prueba" close={()=>setInfo(false)}><p>Sin dinero real. Tus cambios no afectan a otras personas.</p><p>Movimientos y documentos ilustrativos, sin validez fiscal. Fechas recientes. Sin correos ni invitaciones externas. Cotización ilustrativa, no tasa de mercado.</p><p>Podés cambiar el permiso para conocer cada experiencia o reiniciar para recuperar los datos iniciales.</p></Dialog>}
 </div>;
}
