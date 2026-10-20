'use client';
import {useEffect,useState} from 'react';
import {Button} from './ui/button';
import {LoadingBlock} from './ui-v2';
import {contractMessage,contractRequest,contractVariableLabel} from './contracts-data';

export type ContractPreviewRequest={model_key?:string;template_id?:string;contract_id?:string;expected_revision?:number;title?:string;body?:string;client_id?:string;collaborator_id?:string;budget_id?:string;plan_id?:string;bank_account_id?:string;variables?:Record<string,string>;sample?:boolean};
type Preview={title:string;html:string;rendered_text:string;missing:string[];simulated:boolean;draft:true};
/** One server renderer owns the printable preview and the emitted PDF. */
export function ContractPrintPreview({request,label='Vista imprimible'}:{request:ContractPreviewRequest;label?:string}){
 const signature=JSON.stringify(request),[result,setResult]=useState<{signature:string;preview:Preview}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const preview=result?.signature===signature?result.preview:null;
 useEffect(()=>{const controller=new AbortController();setResult(null);setError('');const timeout=setTimeout(()=>{void contractRequest<{preview:Preview}>('/api/agency/contracts/preview',JSON.parse(signature),'POST',controller.signal).then(data=>{if(!controller.signal.aborted){if(typeof data.preview?.html!=='string'||!data.preview.html||typeof data.preview.title!=='string'||!Array.isArray(data.preview.missing)||data.preview.missing.some(key=>typeof key!=='string'))throw Error('No se pudo validar la vista previa.');setResult({signature,preview:data.preview});}}).catch(cause=>{if(!controller.signal.aborted)setError(contractMessage(cause));});},120);return()=>{clearTimeout(timeout);controller.abort();};},[signature,retry]);
 return <section className="contracts-print-preview" aria-label={label} aria-busy={!preview&&!error}>
  <header><h3>{label}</h3><span className="form-note">{request.sample?'Ejemplo simulado · no es un contrato de un cliente real':'Borrador para revisión · emitir una versión para descargar el PDF final'}</span></header>
  {error?<div role="alert" className="error"><p>{error}</p><Button variant="secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar vista previa</Button></div>:!preview?<LoadingBlock label="Preparando documento…" lines={3}/>:<>
   {preview.missing.length>0&&<p role="status" className="form-note">Por completar: {preview.missing.map(contractVariableLabel).join(', ')}</p>}
   <iframe className="contracts-print-page" title={`${label}: ${preview.title}`} sandbox="" srcDoc={preview.html}/>
  </>}
 </section>;
}
