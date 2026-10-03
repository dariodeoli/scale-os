"use client";
import {useEffect,useState} from 'react';
import {ArrowUpRight,Building2,ChevronDown,Circle,CircleCheck,CircleDashed,CircleHelp,EyeOff} from 'lucide-react';
import {AyudaModulo} from 'owncoding-ui';
import {api,Dialog,Editor} from './operations';
import {moduleHelp} from './module-help-data';
import {founderPricingNote} from './founder-pricing';
import {CompanySettings} from './company-settings';
import {ManualWorkspace} from './manual';
import {sections} from './navigation';
import {visibleModule} from './workspace-access';
import {suggestedWorkspaceGuideStep,workspaceGuideScope,workspaceGuideSteps,workspaceGuideStorageKey,type WorkspaceGuideData,type WorkspaceGuideIdentity,type WorkspaceGuideStep} from './workspace-guide-data';
export {visibleModule} from './workspace-access';
export {workspaceGuideScope} from './workspace-guide-data';
export type {WorkspaceGuideData} from './workspace-guide-data';

export type WorkspaceGuideProps = WorkspaceGuideIdentity & {
 navigate:(module:string)=>void;
 data?:WorkspaceGuideData;
 variant?:'button'|'card'|'help';
 /** Módulo activo para la ayuda contextual de la biblioteca (variant `help`). */
 active?:string;
 /** Apertura controlada de la ayuda por módulo (p. ej. desde la paleta ⌘K). */
 helpOpen?:boolean;
 onHelpOpen?:()=>void;
 onHelpClose?:()=>void;
};

function GuideStep({step,navigate}:{step:WorkspaceGuideStep;navigate:(module:string)=>void}){
 return <article className="ops-card"><h3>{step.title}</h3><p className="form-note">{step.description}</p><p className="form-note" role="status">{step.statusLabel}</p><button type="button" className="text-button" onClick={()=>navigate(step.module)}>Abrir {step.module}<ArrowUpRight size={14}/></button></article>;
}

/** The keyed child resets open/dismissed UI synchronously when identity, role or demo changes. */
export function WorkspaceGuide(props:WorkspaceGuideProps){
 const key=JSON.stringify([props.userId,props.organizationId,props.role,!!props.demo,props.variant||'button']);
 return <ScopedWorkspaceGuide key={key} {...props}/>;
}

function ScopedWorkspaceGuide({navigate,role,userId,organizationId,demo=false,data,variant='button',active='Resumen',helpOpen,onHelpOpen,onHelpClose}:WorkspaceGuideProps){
 const [open,setOpen]=useState(false);
 const [preference,setPreference]=useState({ready:false,dismissed:false});
 const identity={role,userId,organizationId,demo};
 const storageKey=workspaceGuideStorageKey(workspaceGuideScope(identity));
 useEffect(()=>{
  if(variant!=='card')return;
  let dismissed=false;
  try{dismissed=!!storageKey&&localStorage.getItem(storageKey)==='dismissed';}catch{/* Optional local preference. */}
  setPreference({ready:true,dismissed});
 },[storageKey,variant]);
 const steps=workspaceGuideSteps(identity,data);
 const suggestion=suggestedWorkspaceGuideStep(steps);
 const tools=sections.filter(([label])=>label!=='Métricas'&&visibleModule(label,role));
 const go=(module:string)=>{setOpen(false);navigate(module);};
 const dismiss=()=>{
  setOpen(false);setPreference({ready:true,dismissed:true});
  try{if(storageKey)localStorage.setItem(storageKey,'dismissed');}catch{/* Dismissal still works for this mounted session. */}
 };
 const demoNote=demo?<p className="form-note">Datos de ejemplo: explorá la demo. Los registros no indican pasos completados.</p>:null;
 const directory=<details><summary>Todas las herramientas</summary><div className="ops-job-list">{tools.map(([label])=><button type="button" className="choice" key={label} onClick={()=>go(label)}>{label}</button>)}</div></details>;
 // Enlaces de la ayuda (§15 regla 10, Refs #82 #84): una sola implementación
 // enlaza el estado del sistema desde el diálogo (la de #84 con `text-button`).
 // Ayuda contextual del nav v3 (issue #68): el botón de la guía vive una sola
 // vez en la barra de utilidades (variante `help`, icono con tooltip) en vez de
 // repetirse en el encabezado de cada página; la tarjeta de Resumen sigue como
 // acceso contextual a los primeros pasos.
 const guideDialog=open?<Dialog title="Empezar y descubrir funciones" close={()=>setOpen(false)}>{demoNote}<div className="ops-stack">{steps.map(step=><GuideStep key={step.module} step={step} navigate={go}/>)}</div>{directory}<details className="settings-disclosure"><summary>Manual y ayudas del panel</summary><div className="mt-3"><ManualWorkspace/></div></details><p className="form-note">¿Algo no responde? Consultá el <a className="text-button" href="/status">estado del sistema</a>.</p><p className="form-note">Tus datos personales: <a className="text-button" href="/privacidad">Política de Privacidad</a> y tus derechos desde «Mis datos».</p></Dialog>:null;
 if(variant==='help'){
  // Ayuda por módulo con `AyudaModulo` de la biblioteca (P2 #135): botón «?»,
  // resumen, 3–5 puntos y enlaces, con /status siempre accesible. La guía de
  // primeros pasos y el manual siguen en la tarjeta de Resumen y en la variante
  // por defecto; el estado abierto viaja controlado para que la paleta ⌘K
  // también pueda abrirla.
  const help=moduleHelp(active);
  return <AyudaModulo titulo={help.titulo} resumen={help.resumen} puntos={help.puntos} enlaces={help.enlaces} etiquetaBoton="Guía del panel" abierta={helpOpen} onAbrir={onHelpOpen} onCerrar={onHelpClose}/>;
 }
 if(variant==='card'){
  if(!preference.ready||preference.dismissed)return null;
  // Checklist compacto (#139): una fila de resumen con el avance y el siguiente
  // paso; el detalle se despliega y no ocupa el pliegue. Descartable por
  // usuario/empresa/rol con la misma clave que la guía.
  const listos=steps.filter(step=>step.state==='present').length;
  const pasoIcon=(step:WorkspaceGuideStep)=>step.state==='present'?<CircleCheck size={15} aria-hidden="true"/>:step.state==='empty'?<Circle size={15} aria-hidden="true"/>:<CircleDashed size={15} aria-hidden="true"/>;
  return <section className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-2" aria-label="Primeros pasos">
   <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
    <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
     <span className="shrink-0 text-fono" aria-hidden="true"><CircleHelp size={16}/></span>
     <b className="min-w-0 truncate text-[13.5px] font-semibold text-fore">Primeros pasos</b>
     <span className="whitespace-nowrap text-[11.5px] tabular-nums text-mute" role="status">{listos} de {steps.length} listos</span>
     {suggestion?<span className="hidden min-w-0 flex-1 truncate text-[11.5px] text-mute sm:block" title={suggestion.description}>Siguiente: {suggestion.title}</span>:<span className="hidden min-w-0 flex-1 text-[11.5px] text-mute sm:block">Todo listo</span>}
     <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-mute transition-transform ${open?'rotate-180':''}`}/>
    </button>
    <button type="button" className="text-button shrink-0" onClick={dismiss}><EyeOff size={14}/>Ocultar primeros pasos</button>
   </div>
   {open&&<div className="grid gap-2 border-t border-ink-600 pb-2 pt-3">
    <ul className="grid gap-1">
     {steps.map(step=><li key={step.module}>
      <button type="button" className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left transition hover:bg-ink-700/40" data-state={step.state} aria-label={`Abrir ${step.module}: ${step.title}`} title={step.description} onClick={()=>go(step.module)}>
       <span className={step.state==='present'?'shrink-0 text-ok':'shrink-0 text-mute'} aria-hidden="true">{pasoIcon(step)}</span>
       <b className="min-w-0 truncate text-[12.5px] font-semibold text-fore">{step.title}</b>
       <small className="ml-auto shrink-0 whitespace-nowrap text-[11px] text-mute">{step.statusLabel}</small>
       <ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-mute"/>
      </button>
     </li>)}
    </ul>
    {demoNote}
    <button type="button" className="secondary justify-self-start" onClick={()=>setOpen(true)}>Abrir guía completa</button>
   </div>}
  </section>;
 }
 return <><button type="button" className="secondary" onClick={()=>setOpen(true)}>Guía del panel</button>{guideDialog}</>;
}
export function NewCompany(){
 const [open,setOpen]=useState(false);
 return <section className="panel settings-card workspace-company-card" aria-labelledby="workspace-company-title"><div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><Building2 size={18}/></span><div><h2 id="workspace-company-title">Empresas</h2><p>Cambiá de empresa o creá un espacio separado para otra operación.</p></div></div>
  <CompanySettings/>
  <details className="settings-disclosure"><summary>Cómo funciona una empresa adicional</summary><div><p>Cada empresa tendrá sus propios clientes, equipo, proyectos y finanzas. Solo tu usuario tendrá acceso inicial.</p><p>Las nuevas empresas incluyen 30 días gratis. Después: US$10 o G. 50.000 al mes por empresa, con 2 días de gracia. Al comenzar el tercer día sin pagar se suspende el uso, sin borrar los datos. No se realiza ningún cobro al crearla.</p><p><strong>Precio de lanzamiento.</strong> {founderPricingNote}</p></div></details>
  <div className="settings-card-actions"><button className="secondary" onClick={()=>setOpen(true)}>Crear otra empresa</button></div>
  {open&&<Dialog title="Nueva empresa · 30 días gratis" close={()=>setOpen(false)}><Editor fields={[{key:'name',label:'Nombre de la empresa'},{key:'slug',label:'Código único (letras, números y guiones)'},{key:'billingCurrency',label:'Suscripción después de la prueba',choices:[{value:'USD',label:'US$10 al mes'},{value:'PYG',label:'G. 50.000 al mes'}]}]} defaults={{name:'',slug:'',billingCurrency:'USD'}} label="Crear empresa e iniciar prueba" save={async v=>{const d=await api<{organization:{id:string}}>('/api/auth/organizations',v);await api('/api/auth/switch-organization',{organizationId:d.organization.id});window.location.assign('/');}}/></Dialog>}
 </section>;
}
