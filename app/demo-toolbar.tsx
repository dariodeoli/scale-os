"use client";
import {useState} from 'react';
import {api} from './operations';
import {teamRoleLabels} from './team-directory';
import {Dialog} from './dialog';
import {Info,RotateCcw} from 'lucide-react';
import {PortalPreview} from './manual';

const DEMO_INFO = <>
  <p>Sin dinero real. Tus cambios no afectan a otras personas.</p>
  <p>Movimientos y documentos ilustrativos, sin validez fiscal. Fechas recientes. Sin correos ni invitaciones externas. Cotización ilustrativa, no tasa de mercado.</p>
  <p>Podés cambiar el permiso para conocer cada experiencia o reiniciar para recuperar los datos iniciales.</p>
</>;

export function DemoToolbar({role}:{role:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState(false),[clientView,setClientView]=useState(false),[controls,setControls]=useState(false);
 async function changeRole(nextRole:string){
  setBusy(true);setError('');
  try{await api('/api/demo/role',{role:nextRole});window.location.assign('/produccion');}
  catch(e){setError(e instanceof Error?e.message:'No se pudo cambiar');setBusy(false);}
 }
 const roleOptions=Object.entries(teamRoleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>);
 return <>
  {/* Escritorio: los controles permanecen en línea. En móvil viven en el popup
      (#137): el chrome queda con una sola fila de controles. */}
  <div className="demo-tools relative hidden shrink-0 items-center gap-1.5 text-[11px] md:flex" aria-label="Controles de la demo">
   <button className="demo-badge inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-fono/10 px-2 text-[11px] font-semibold text-fono-light transition hover:bg-ink-700" type="button" onClick={()=>setInfo(true)} aria-label="Información de la demo"><Info size={14}/>Demo</button>
   <button className="demo-client-view inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-fono-light transition hover:bg-ink-700" type="button" onClick={()=>setClientView(true)}>Así te ve tu cliente</button>
   <select aria-label="Probar permiso" title="Probar otro permiso" className="min-h-8 w-[134px] rounded-lg border border-ink-600 bg-ink-800 px-2 text-[11px] font-medium text-fore" value={role} disabled={busy} onChange={e=>void changeRole(e.target.value)}>{roleOptions}</select>
   <a className="demo-reset inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-fono-light transition hover:bg-ink-700" href="https://sistema.scaleparaguay.com/demo" title="Reiniciar demo" aria-label="Reiniciar demo"><RotateCcw size={16}/><span>Reiniciar</span></a>
   {error&&<p role="alert" className="demo-error absolute left-0 top-full z-30 max-w-[280px] rounded-lg border border-bad bg-ink-800 p-2 text-bad">{error}</p>}
  </div>
  {/* Móvil: un solo disparador de 44 px dentro de la fila de controles. */}
  <button className="demo-trigger inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-fono/10 px-2.5 text-[11px] font-semibold text-fono-light transition hover:bg-ink-700 md:hidden" type="button" aria-haspopup="dialog" aria-expanded={controls} title="Controles de la demo" aria-label="Controles de la demo" onClick={()=>setControls(true)}><Info size={15}/>Demo</button>
  {controls&&<Dialog title="Tu demo" close={()=>setControls(false)}>
   <div className="grid gap-4">
    <div className="grid gap-2 [&_p]:m-0 [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-mute">{DEMO_INFO}</div>
    <label className="grid gap-1.5 text-xs font-semibold text-mute">Probar permiso
     <select className="min-h-11 rounded-lg border border-ink-600 bg-ink-800 px-2 text-sm font-medium text-fore" value={role} disabled={busy} onChange={e=>void changeRole(e.target.value)}>{roleOptions}</select>
    </label>
    <button className="secondary justify-self-start" type="button" onClick={()=>{setControls(false);setClientView(true);}}>Así te ve tu cliente</button>
    <a className="secondary justify-self-start" href="https://sistema.scaleparaguay.com/demo" title="Reiniciar demo" aria-label="Reiniciar demo"><RotateCcw size={15}/>Reiniciar demo</a>
    {error&&<p role="alert" className="rounded-lg border border-bad bg-ink-800 p-2 text-bad">{error}</p>}
   </div>
  </Dialog>}
  {info&&<Dialog title="Tu espacio de prueba" close={()=>setInfo(false)}>{DEMO_INFO}</Dialog>}
  {clientView&&<Dialog title="Así ve el cliente tu trabajo" close={()=>setClientView(false)}><p className="form-note">El cliente accede solo a lo que publicás: sus entregas y el estado de revisión. Nunca ve tu panel, finanzas ni equipo.</p><PortalPreview/></Dialog>}
 </>;
}

export function DemoWelcome({close}:{close:()=>void}){
 return <Dialog title="Tu Demo está lista" close={close} size="compact"><div className="grid gap-3.5 [&_.primary]:justify-self-start [&_p]:m-0 [&_p]:leading-relaxed [&_p]:text-mute [&_strong]:text-fore"><p><strong>20 clientes ficticios, 5 colaboradores y 80 piezas</strong> para explorar proyectos, producción, presupuestos y finanzas.</p><p>Tu Demo es privado, dura hasta 24 horas y no envía correos ni usa dinero real. Cada inicio crea una experiencia nueva.</p><button type="button" className="primary" onClick={close}>Explorar el Demo</button></div></Dialog>;
}
