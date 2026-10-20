'use client';
import {useEffect,useState} from 'react';
import {Editor} from './operations';
import {InputControl} from './ui/input-control';
import {Notice} from './ui/notice';
import {clientFields,clientCreatePayload,CLIENT_CREATE_DEFAULTS} from './client-editor-data';

async function request(token:string,payload?:unknown){
 const response=await fetch('/core-api/api/public/client-intake/'+encodeURIComponent(token),{method:payload?'POST':'GET',credentials:'omit',cache:'no-store',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});
 const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo enviar. Conservá tus datos e intentá nuevamente.');return data;
}
export function PublicClientIntake({token}:{token:string}){
 const [scope,setScope]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false),[trap,setTrap]=useState('');
 useEffect(()=>{let active=true;request(token).then(data=>{if(active)setScope(data.scope);}).catch(cause=>{if(active)setError(cause.message);});return()=>{active=false;};},[token]);
 const basic=['tax_id','legal_name','name','email','phone','address','city','department'];
 const fields=clientFields({mode:'create'}).filter(field=>scope==='contract'?field.key!=='notes':basic.includes(field.key));
 return <section className="panel grid gap-4 p-4 sm:p-6">
  <h1 className="text-xl font-semibold">{scope==='contract'?'Datos para contrato':'Registro de datos básicos'}</h1>
  <p>La empresa que te compartió este enlace revisará tus datos antes de crear o completar tu ficha. Este formulario no habilita acceso al equipo ni firma un contrato.</p>
  <p className="form-note">Usamos estos datos para contacto y preparación del servicio o contrato. Compartí sólo lo necesario. <a href="/privacidad">Privacidad y derechos sobre tus datos</a>. El logo puede agregarse luego desde la ficha interna.</p>
  {error?<Notice tono="error" role="alert">{error}</Notice>:null}
  {done?<Notice tono="ok" role="status">Recibimos tus datos para revisión. La empresa se comunicará contigo si necesita completar algo.</Notice>:scope?<>
   <div hidden aria-hidden="true"><label>Sitio web<InputTrap value={trap} set={setTrap}/></label></div>
   <Editor columns fields={[...fields,{key:'consent',label:'Autorizo a la empresa que me compartió el enlace a revisar estos datos para el contacto y el servicio solicitado.',type:'checkbox',span:12,validate:value=>value==='true'?null:'Confirmá la autorización para enviar.'}]} defaults={{...CLIENT_CREATE_DEFAULTS,consent:'false'}} label="Enviar para revisión" save={async values=>{
    setError('');const normalized=clientCreatePayload(values);const allowed=new Set(fields.map(field=>field.key));
    const payload=Object.fromEntries(Object.entries(normalized).filter(([key])=>allowed.has(key)));
    try{await request(token,{...payload,consent:values.consent==='true',website:trap});setDone(true);}catch(cause){throw cause;}
   }}/>
  </>:!error?<p role="status">Comprobando enlace…</p>:null}
 </section>;
}
function InputTrap({value,set}:{value:string;set:(value:string)=>void}){return <InputControl name="website" tabIndex={-1} autoComplete="off" value={value} onChange={event=>set(event.target.value)}/>;}
