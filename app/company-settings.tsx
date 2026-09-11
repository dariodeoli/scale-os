'use client';

import {useEffect,useRef,useState} from 'react';
import {Building2,Star} from 'lucide-react';
import {api} from './operations';
import './company-settings.css';

type Company={id:string|number;name:string;role:string;isDemo?:boolean};
type Companies={organizations:Company[];currentOrganizationId:string|number;defaultOrganizationId?:string|number|null};
const roles:Record<string,string>={owner:'Dueño',admin:'Administración',management:'Gerencia',manager:'Gerencia',finance:'Finanzas',sales:'Comercial',editor:'Edición',production:'Producción',viewer:'Lectura'};

export function CompanySettings(){
 const [data,setData]=useState<Companies|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [attempt,setAttempt]=useState(0);
 const mounted=useRef(false),locked=useRef(false);
 useEffect(()=>{const refresh=()=>setAttempt(value=>value+1);window.addEventListener('scale:default-company-changed',refresh);return()=>window.removeEventListener('scale:default-company-changed',refresh);},[]);
 useEffect(()=>{mounted.current=true;let active=true;void api<Companies>('/api/auth/organizations').then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No se pudieron cargar tus empresas.');});return()=>{active=false;mounted.current=false;};},[attempt]);
 async function choose(company:Company,asDefault:boolean){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');setNotice('');
  try{
   await api(asDefault?'/api/auth/default-organization':'/api/auth/switch-organization',{organizationId:company.id});
   // The server already changed the session. Complete the tenant transition even
   // if navigation unmounted this panel while the request was in flight.
   if(!asDefault){try{sessionStorage.setItem('scale_company_selected','1');}catch{/* Optional presentation preference. */}window.location.assign('/');return;}
   if(!mounted.current)return;
   if(asDefault){setData(prior=>prior?{...prior,defaultOrganizationId:company.id}:prior);setNotice(`${company.name} se abrirá al iniciar sesión.`);window.dispatchEvent(new Event('scale:default-company-changed'));}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo actualizar la empresa.');}
  finally{locked.current=false;if(mounted.current)setBusy(false);}
 }
 return <div className="company-settings" aria-busy={busy}>
  <p className="form-note">Tus empresas y accesos. Elegí cuál abrir al iniciar sesión; esto no cambia tus permisos ni mezcla los datos.</p>
  {!data&&!error&&<p role="status">Cargando tus empresas…</p>}
  {data?.organizations.length===0&&<p>No hay empresas disponibles para esta cuenta.</p>}
  {data?.organizations.map(company=>{
   const current=String(company.id)===String(data.currentOrganizationId),preferred=String(company.id)===String(data.defaultOrganizationId);
   return <article className="company-settings-row" key={company.id}>
    <Building2 size={22} aria-hidden="true"/>
    <div className="company-settings-name"><strong>{company.name}</strong><small>{roles[company.role]||company.role}{current?' · Empresa abierta':''}{preferred?' · Predeterminada':''}</small></div>
    <div className="company-settings-actions">
     {!current&&<button className="secondary" disabled={busy} onClick={()=>void choose(company,false)}>Abrir</button>}
     {!company.isDemo&&<button className="secondary" disabled={busy||preferred} aria-pressed={preferred} onClick={()=>void choose(company,true)}><Star size={16} aria-hidden="true"/>{preferred?'Predeterminada':'Usar al iniciar'}</button>}
    </div>
   </article>;
  })}
  {error&&<p className="error" role="alert">{error}</p>}
  {!data&&error&&<button className="secondary" onClick={()=>{setError('');setAttempt(value=>value+1);}}>Reintentar</button>}
  {notice&&<p role="status">{notice}</p>}
 </div>;
}
