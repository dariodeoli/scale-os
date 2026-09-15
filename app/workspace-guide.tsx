"use client";
import {useEffect,useState} from 'react';
import {Building2} from 'lucide-react';
import {api,Dialog,Editor} from './operations';
import {founderPricingNote} from './founder-pricing';
import {CompanySettings} from './company-settings';
import {sections} from './navigation';
import {visibleModule} from './workspace-access';
import {suggestedWorkspaceGuideStep,workspaceGuideScope,workspaceGuideSteps,workspaceGuideStorageKey,type WorkspaceGuideData,type WorkspaceGuideIdentity,type WorkspaceGuideStep} from './workspace-guide-data';
export {visibleModule} from './workspace-access';
export {workspaceGuideScope} from './workspace-guide-data';
export type {WorkspaceGuideData} from './workspace-guide-data';

export type WorkspaceGuideProps = WorkspaceGuideIdentity & {
 navigate:(module:string)=>void;
 data?:WorkspaceGuideData;
 variant?:'button'|'card';
};

function GuideStep({step,navigate}:{step:WorkspaceGuideStep;navigate:(module:string)=>void}){
 return <article className="ops-card"><h3>{step.title}</h3><p className="form-note">{step.description}</p><p className="form-note" role="status">{step.statusLabel}</p><button type="button" className="text-button" onClick={()=>navigate(step.module)}>Abrir {step.module}</button></article>;
}

/** The keyed child resets open/dismissed UI synchronously when identity, role or demo changes. */
export function WorkspaceGuide(props:WorkspaceGuideProps){
 const key=JSON.stringify([props.userId,props.organizationId,props.role,!!props.demo,props.variant||'button']);
 return <ScopedWorkspaceGuide key={key} {...props}/>;
}

function ScopedWorkspaceGuide({navigate,role,userId,organizationId,demo=false,data,variant='button'}:WorkspaceGuideProps){
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
 if(variant==='card'){
  if(!preference.ready||preference.dismissed)return null;
  return <section className="panel" aria-label="Primeros pasos"><div className="panel-heading"><h2>Primeros pasos</h2><button type="button" className="text-button" onClick={dismiss}>Ocultar primeros pasos</button></div>
   <p className="form-note">Una guía según tu rol. Podés volver a consultarla desde Guía del panel.</p>{demoNote}
   <button type="button" className="secondary" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'Cerrar pasos':'Ver primeros pasos'}</button>
   {open&&<div className="ops-stack">{suggestion&&<GuideStep step={suggestion} navigate={go}/>}{steps.length>1&&<details><summary>Otros pasos disponibles</summary><div className="ops-stack">{steps.filter(step=>step.module!==suggestion?.module).map(step=><GuideStep key={step.module} step={step} navigate={go}/>)}</div></details>}{!suggestion&&<p className="form-note">Consultá las herramientas disponibles para tu acceso.</p>}{directory}</div>}
  </section>;
 }
 return <><button type="button" className="secondary" onClick={()=>setOpen(true)}>Guía del panel</button>{open&&<Dialog title="Empezar y descubrir funciones" close={()=>setOpen(false)}>{demoNote}<div className="ops-stack">{steps.map(step=><GuideStep key={step.module} step={step} navigate={go}/>)}</div>{directory}</Dialog>}</>;
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
