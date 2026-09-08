"use client";
import {useState} from 'react';
import {api,Dialog,Editor} from './operations';
export const visibleModule=(label:string,role:string)=>{
 if(['Actividad','Configuración','Equipo'].includes(label))return ['owner','admin'].includes(role);
 if(['Pagos','Colaboradores','Comisiones'].includes(label))return ['owner','admin','finance'].includes(role);
 if(['Pipeline','Planes','Presupuestos','Mora'].includes(label))return ['owner','admin','management','finance','sales'].includes(role);
 if(label==='Métricas')return ['owner','admin'].includes(role);
 return true;
};
export function WorkspaceGuide({navigate,role}:{navigate:(module:string)=>void;role:string}){
 const [open,setOpen]=useState(false),[step,setStep]=useState(0);
 const steps=[['Configuración','1. Tu empresa','Completá los datos que aparecerán en los presupuestos.'],['Equipo','2. Accesos','Invitá por correo y asigná permisos.'],['Clientes','3. Clientes','Agregá los contactos y datos de facturación.'],['Proyectos','4. Producción','Creá un proyecto, vinculá Drive y definí las aprobaciones.'],['Presupuestos','5. Primera propuesta','Usá un plan, revisá los ítems y habilitá el enlace público.']];
 return <><button className="secondary" onClick={()=>setOpen(true)}>Guía del panel</button>{open&&<Dialog title="Empezar y descubrir funciones" close={()=>setOpen(false)}><h3>{steps[step][1]}</h3><p>{steps[step][2]}</p><div className="inline-actions"><button className="secondary" disabled={step===0} onClick={()=>setStep(step-1)}>Anterior</button>{visibleModule(steps[step][0],role)&&<button className="primary" onClick={()=>{navigate(steps[step][0]);setOpen(false);}}>Abrir {steps[step][0]}</button>}<button className="secondary" disabled={step===4} onClick={()=>setStep(step+1)}>Siguiente</button></div><h3>Todas las herramientas</h3><div className="ops-job-list">{['Resumen','Clientes','Proyectos','Presupuestos','Pagos','Mora','Equipo','Colaboradores','Comisiones','Pipeline','Planes','Inventario','Actividad','Configuración'].filter(label=>visibleModule(label,role)).map(label=><button className="choice" key={label} onClick={()=>{navigate(label);setOpen(false);}}>{label}</button>)}</div></Dialog>}</>;
}
export function NewCompany(){const [open,setOpen]=useState(false);return <section className="panel"><h2>Multiempresa</h2><p className="form-note">Cada empresa tendrá sus propios clientes, equipo, proyectos y finanzas. Solo tu usuario tendrá acceso inicial.</p><button className="secondary" onClick={()=>setOpen(true)}>Crear otra empresa</button>{open&&<Dialog title="Nueva empresa" close={()=>setOpen(false)}><Editor fields={[{key:'name',label:'Nombre de la empresa'},{key:'slug',label:'Código único (letras, números y guiones)'}]} defaults={{name:'',slug:''}} save={async v=>{const d=await api<{organization:{id:string}}>('/api/auth/organizations',v);await api('/api/auth/switch-organization',{organizationId:d.organization.id});window.location.assign('/');}}/></Dialog>}</section>;}
