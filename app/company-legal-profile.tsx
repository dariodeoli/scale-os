'use client';
import {Button} from './ui/button';

import {useEffect,useRef,useState} from 'react';
import {Editor,type Field} from './operations';
import {LoadingBlock,ErrorBlock} from './ui-v2';
import {contractRequest,contractMessage} from './contracts-data';
import './company-legal-profile.css';
type LegalProfile={revision:number;city:string;department:string;legal_representative_name:string;legal_representative_document:string;legal_representative_role:string;provenance:Record<string,{source:string;verified_at?:string}>};
const fields:Field[]=[{key:'city',label:'Ciudad',maxLength:120,optional:true},{key:'department',label:'Departamento',maxLength:120,optional:true},{key:'legal_representative_name',label:'Nombre del representante legal',maxLength:120,optional:true},{key:'legal_representative_document',label:'Documento del representante legal',maxLength:80,optional:true},{key:'legal_representative_role',label:'Cargo del representante legal',maxLength:120,optional:true}];
export function CompanyLegalProfile({organizationId,userId}:{organizationId:string;userId:string}){return <LegalProfileSession key={`${organizationId}:${userId}`}/>;}
function LegalProfileSession(){
 const [profile,setProfile]=useState<LegalProfile|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[editorKey,setEditorKey]=useState(0);const alive=useRef(true),generation=useRef(0);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;generation.current++;};},[]);
 async function load(){const id=++generation.current;setLoading(true);setError('');try{const data=await contractRequest<{profile:LegalProfile}>('/api/agency/company-legal-profile');if(alive.current&&id===generation.current){setProfile(data.profile);setEditorKey(key=>key+1);}}catch(cause){if(alive.current&&id===generation.current)setError(contractMessage(cause));}finally{if(alive.current&&id===generation.current)setLoading(false);}}
 if(loading&&!profile)return <LoadingBlock label="Cargando perfil legal…"/>;
 if(!profile)return <ErrorBlock description={error} onRetry={()=>void load()}/>;
 return <section className="panel company-legal-profile" aria-label="Perfil legal de la empresa"><h3>Datos para contratos</h3><p>La razón social, el RUC y la dirección se administran en los datos de empresa. Revisá la procedencia antes de usar estos datos en un contrato.</p>{error&&<p role="alert" className="error">{error}</p>}<Editor key={editorKey} fields={fields.map(field=>({...field,help:`Origen: ${profile.provenance?.[field.key]?.source||'Sin fuente registrada'}`}))} defaults={Object.fromEntries(fields.map(field=>[field.key,String(profile[field.key as keyof LegalProfile]||'')]))} cancelLabel={false} label="Guardar datos legales" save={async values=>{const data=await contractRequest<{profile:LegalProfile}>('/api/agency/company-legal-profile',{...values,expected_revision:profile.revision},'PATCH');if(alive.current){setProfile(data.profile);setEditorKey(key=>key+1);}}}/><Button variant="secondary" type="submit" className="secondary" disabled={loading} onClick={()=>void load()}>Recargar datos guardados (descarta edición)</Button></section>;
}
