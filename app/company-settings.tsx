'use client';
import {Button} from './ui/button';


import {useEffect,useRef,useState} from 'react';
import {Building2,Star} from 'lucide-react';
import {api} from './operations';
import {EmptyBlock,ListGrid,ListRow,LoadingBlock,StateChip,type Column} from './ui-v2';
import {notify} from './feedback';
import './company-settings.css';

type Company={id:string|number;name:string;role:string;isDemo?:boolean};
type Companies={organizations:Company[];currentOrganizationId:string|number;defaultOrganizationId?:string|number|null};
const COMPANY_TEMPLATE='grid-cols-[minmax(12rem,2fr)_8rem_9rem_9rem]';
const COMPANY_COLUMNS:Column[]=[{key:'company',label:'Empresa'},{key:'role',label:'Rol'},{key:'state',label:'Estado'},{key:'actions',label:'Acciones'}];
const roles:Record<string,string>={owner:'Dueño',admin:'Administración',management:'Gerencia',manager:'Gerencia',finance:'Finanzas',sales:'Comercial',editor:'Edición',production:'Producción',viewer:'Lectura',collaborator:'Colaborador'};

export function CompanySettings(){
 const [data,setData]=useState<Companies|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [attempt,setAttempt]=useState(0);
 const mounted=useRef(false),locked=useRef(false);
 useEffect(()=>{const refresh=()=>setAttempt(value=>value+1);window.addEventListener('scale:default-company-changed',refresh);return()=>window.removeEventListener('scale:default-company-changed',refresh);},[]);
 useEffect(()=>{mounted.current=true;let active=true;void api<Companies>('/api/auth/organizations').then(value=>{if(!active)return;const organizations=value.organizations.filter(company=>!company.isDemo);const defaultOrganizationId=organizations.some(company=>String(company.id)===String(value.defaultOrganizationId))?value.defaultOrganizationId:null;setData({...value,organizations,defaultOrganizationId});}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No se pudieron cargar tus empresas.');});return()=>{active=false;mounted.current=false;};},[attempt]);
 async function choose(company:Company,asDefault:boolean){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');
  try{
   await api(asDefault?'/api/auth/default-organization':'/api/auth/switch-organization',{organizationId:company.id});
   // The server already changed the session. Complete the tenant transition even
   // if navigation unmounted this panel while the request was in flight.
   if(!asDefault){try{sessionStorage.setItem('scale_company_selected','1');}catch{/* Optional presentation preference. */}window.location.assign('/');return;}
   if(!mounted.current)return;
   if(asDefault){setData(prior=>prior?{...prior,defaultOrganizationId:company.id}:prior);notify({tone:'success',message:`${company.name} se abrirá al iniciar sesión.`});window.dispatchEvent(new Event('scale:default-company-changed'));}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo actualizar la empresa.');}
  finally{locked.current=false;if(mounted.current)setBusy(false);}
 }
 return <div className="company-settings" aria-busy={busy}>
  <p className="form-note company-settings-intro">Tus empresas y accesos. Elegí cuál abrir al iniciar sesión; esto no cambia tus permisos ni mezcla los datos.</p>
  {!data&&!error&&<LoadingBlock label="Cargando tus empresas…" lines={2}/>}
  {data?.organizations.length===0&&<EmptyBlock title="No hay empresas disponibles" description="Pedile a la administración de Scale OS que revise tus accesos."/>}
  {data&&data.organizations.length>0&&<ListGrid label="Empresas y accesos" template={COMPANY_TEMPLATE} columns={COMPANY_COLUMNS} minWidthClass="min-w-[36rem]">
   {data.organizations.map(company=>{
    const current=String(company.id)===String(data.currentOrganizationId),preferred=String(company.id)===String(data.defaultOrganizationId);
    return <ListRow key={company.id} template={COMPANY_TEMPLATE} className={`company-settings-row${current?' is-current':''}${preferred?' is-default':''}`}>
     <div role="cell" className="company-settings-name"><span className="company-settings-icon"><Building2 size={18} aria-hidden="true"/></span><strong title={company.name}>{company.name}</strong></div>
     <span role="cell" className="company-settings-role">{roles[company.role]||company.role}</span>
     <div role="cell">{current?<StateChip tone="ok">Empresa abierta</StateChip>:preferred?<StateChip tone="info">Predeterminada</StateChip>:<span className="company-settings-role" aria-hidden="true">—</span>}</div>
     <div role="cell" className="company-settings-actions">
      {!current&&<Button variant="secondary" type="submit" className="secondary company-settings-open" disabled={busy} onClick={()=>void choose(company,false)}>Abrir</Button>}
      {!company.isDemo&&<Button variant="secondary" type="submit" className="secondary company-settings-default" disabled={busy} aria-label={preferred?'Empresa predeterminada':'Usar al iniciar sesión'} aria-pressed={preferred} title={preferred?'Empresa predeterminada':'Usar al iniciar sesión'} onClick={()=>void choose(company,true)}><Star size={16} fill={preferred?'currentColor':'none'} aria-hidden="true"/><span className="company-settings-sr-only">{preferred?'Predeterminada':'Usar al iniciar sesión'}</span></Button>}
     </div>
    </ListRow>;
   })}
  </ListGrid>}
  {error&&<p className="error company-settings-feedback" role="alert">{error}</p>}
  {!data&&error&&<Button variant="secondary" type="submit" className="secondary" onClick={()=>{setError('');setAttempt(value=>value+1);}}>Reintentar</Button>}
 </div>;
}
