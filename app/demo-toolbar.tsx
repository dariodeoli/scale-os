"use client";
import {useState} from 'react';
import {api} from './operations';
import {teamRoleLabels} from './team-directory';
import {Dialog} from './dialog';
import {Info,RotateCcw} from 'lucide-react';
import {PortalPreview} from './manual';
import './workspace-density.css';

export function DemoToolbar({role}:{role:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState(false),[clientView,setClientView]=useState(false);
 return <div className="demo-tools" aria-label="Controles de la demo">
  <button className="demo-badge" type="button" onClick={()=>setInfo(true)} aria-label="Información de la demo"><Info size={14}/>Demo</button>
  <button className="demo-client-view" type="button" onClick={()=>setClientView(true)}>Así te ve tu cliente</button>
  <select aria-label="Probar permiso" title="Probar otro permiso" value={role} disabled={busy} onChange={async e=>{
   setBusy(true);setError('');
   try{await api('/api/demo/role',{role:e.target.value});window.location.assign('/produccion');}
   catch(e){setError(e instanceof Error?e.message:'No se pudo cambiar');setBusy(false);}
  }}>{Object.entries(teamRoleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
  <a className="demo-reset" href="https://sistema.scaleparaguay.com/demo" title="Reiniciar demo" aria-label="Reiniciar demo"><RotateCcw size={16}/><span>Reiniciar</span></a>
  {error&&<p role="alert" className="demo-error">{error}</p>}
  {info&&<Dialog title="Tu espacio de prueba" close={()=>setInfo(false)}><p>Sin dinero real. Tus cambios no afectan a otras personas.</p><p>Movimientos y documentos ilustrativos, sin validez fiscal. Fechas recientes. Sin correos ni invitaciones externas. Cotización ilustrativa, no tasa de mercado.</p><p>Podés cambiar el permiso para conocer cada experiencia o reiniciar para recuperar los datos iniciales.</p></Dialog>}
  {clientView&&<Dialog title="Así ve el cliente tu trabajo" close={()=>setClientView(false)}><p className="form-note">El cliente accede solo a lo que publicás: sus entregas y el estado de revisión. Nunca ve tu panel, finanzas ni equipo.</p><PortalPreview/></Dialog>}
 </div>;
}

export function DemoWelcome({close}:{close:()=>void}){
 return <Dialog title="Tu Demo está lista" close={close} size="compact"><div className="demo-welcome"><p><strong>20 clientes ficticios, 5 colaboradores y 80 piezas</strong> para explorar proyectos, producción, presupuestos y finanzas.</p><p>Tu Demo es privado, dura hasta 24 horas y no envía correos ni usa dinero real. Cada inicio crea una experiencia nueva.</p><button type="button" className="primary" onClick={close}>Explorar el Demo</button></div></Dialog>;
}
