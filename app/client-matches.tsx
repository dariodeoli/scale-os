'use client';
import {useEffect,useRef,useState} from 'react';
import {normalizeTaxId} from 'owncoding-ui/core';
import {api} from './operations';
import {emailValid,phoneValid} from './field-rules';
import {taxIdError} from './client-editor-data';
import {Selector} from './ui/select';
import {Button} from './ui/button';
import {clientStatuses} from './client-status';

type Identity={email:string;phone:string;tax_id:string};
export type ClientMatch={id:string;name:string;logo_url:string|null;secondary?:string;state:string};
function criteria(identity:Identity){
 const result:{kind:keyof Identity;value:string}[]=[];
 if(identity.tax_id.trim()&&!taxIdError(identity.tax_id))result.push({kind:'tax_id',value:normalizeTaxId(identity.tax_id)||''});
 if(emailValid(identity.email))result.push({kind:'email',value:identity.email.trim().toLowerCase()});
 if(phoneValid(identity.phone))result.push({kind:'phone',value:identity.phone});
 return result;
}
function matchesResponse(value:unknown):ClientMatch[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {matches?:unknown}).matches))throw Error('No se pudieron revisar las fichas existentes. Podés continuar manualmente.');
 return (value as {matches:unknown[]}).matches.filter((item):item is ClientMatch=>Boolean(item)&&typeof item==='object'&&typeof (item as ClientMatch).id==='string'&&typeof (item as ClientMatch).name==='string');
}

/** Exact authorized identity checks are suggestions; shared contacts never become a uniqueness rule. */
export function useClientMatches(identity:Identity,enabled:boolean){
 const signature=JSON.stringify(criteria(identity));
 const [result,setResult]=useState<{signature:string;matches:ClientMatch[];error:string}>({signature:'',matches:[],error:''});
 const [busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0),[dismissed,setDismissed]=useState('');
 const generation=useRef(0);
 useEffect(()=>{
  const version=++generation.current,controller=new AbortController();
  setBusy(false);
  const inputs=JSON.parse(signature) as ReturnType<typeof criteria>;
  if(!enabled||!inputs.length||dismissed===signature)return()=>controller.abort();
  const timer=setTimeout(()=>{
   setBusy(true);
   void Promise.all(inputs.map(input=>api('/api/agency/clients/matches',input,'POST',{signal:controller.signal}).then(matchesResponse))).then(groups=>{
    if(controller.signal.aborted||version!==generation.current)return;
    const combined=new Map<string,ClientMatch>();
    for(const group of groups)for(const match of group){const old=combined.get(match.id);combined.set(match.id,old?{...old,secondary:[old.secondary,match.secondary].filter(Boolean).filter((item,index,all)=>all.indexOf(item)===index).join(' · ')}:match);}
    setResult({signature,matches:[...combined.values()].slice(0,10),error:''});
   }).catch(cause=>{if(!controller.signal.aborted&&version===generation.current)setResult({signature,matches:[],error:cause instanceof Error?cause.message:'No se pudieron revisar las fichas existentes. Podés continuar manualmente.'});}).finally(()=>{if(!controller.signal.aborted&&version===generation.current)setBusy(false);});
  },350);
  return()=>{clearTimeout(timer);controller.abort();};
 },[signature,enabled,attempt,dismissed]);
 const visible=enabled&&dismissed!==signature&&result.signature===signature;
 return {matches:visible?result.matches:[],error:visible?result.error:'',busy,
  dismiss:()=>setDismissed(signature),retry:()=>{setDismissed('');setAttempt(value=>value+1);}};
}

export function ClientMatches({matches,busy,error,onOpen,onManual,onRetry}:{matches:ClientMatch[];busy:boolean;error:string;onOpen:(match:ClientMatch)=>void;onManual:()=>void;onRetry:()=>void}){
 const [selected,setSelected]=useState('');
 const chosen=matches.find(match=>match.id===selected);
 if(!matches.length&&!busy&&!error)return null;
 return <section className="ops-card grid gap-2" aria-label="Fichas de clientes existentes">
  <p className="form-note">Revisá si es un cliente que ya tenés. Compartir correo o teléfono puede ser válido; estas coincidencias no completan ni guardan la ficha nueva.</p>
  {busy?<p role="status">Revisando fichas de esta empresa…</p>:null}
  {error?<><p role="alert" className="error">{error}</p><Button type="button" variant="ghost" onClick={onRetry}>Reintentar búsqueda</Button></>:null}
  {matches.length>0?<Selector label="Fichas existentes" value={chosen?.id||''} onChange={setSelected} variant="entity" searchable
   options={matches.map(match=>({value:match.id,primary:match.name,secondary:[match.secondary,clientStatuses.find(state=>state.value===match.state)?.label].filter(Boolean).join(' · '),avatarUrl:match.logo_url,kind:'entity'}))}/>:null}
  <div className="inline-actions">
   {matches.length>0?<Button type="button" variant="secondary" disabled={!chosen} onClick={()=>{if(chosen)onOpen(chosen);}}>Abrir ficha existente</Button>:null}
   <Button type="button" variant="ghost" onClick={onManual}>Seguir con la ficha nueva</Button>
  </div>
 </section>;
}
