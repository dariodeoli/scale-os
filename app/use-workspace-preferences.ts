"use client";
import {useEffect,useRef,useState} from 'react';
import {defaultWorkspacePreferences,parseWorkspacePreferences,startupDestination,workspacePreferenceKey,type WorkspacePreferences,type StartupPreference} from './workspace-preferences';
import {localCalendarDay} from './production-filter';

type PreferenceSession={key:string;userId:string;organizationId:string;value:WorkspacePreferences;legacy:boolean;revision:number;loadGeneration:number;alive:boolean;inFlight:boolean;dirty:boolean;loaded:boolean;loadWarning:string;saveWarning:string;storageWarning:string};
function pendingPreferenceCache(raw:string|null){try{return JSON.parse(raw||'null')?.pendingSync===true;}catch{return false;}}
// Serialize writes across a quick Home unmount/remount too, so a prior
// request cannot land after a newer edit for the same authenticated scope.
const preferenceWrites=new Map<string,Promise<Awaited<ReturnType<typeof workspacePreferenceRequest>>>>();
function queuedPreferenceWrite(session:PreferenceSession,value:WorkspacePreferences,active:()=>boolean){
 const previous=preferenceWrites.get(session.key);
 const request=()=>{if(!active())throw Error('Sesión anterior');return workspacePreferenceRequest(session.userId,session.organizationId,value);};
 const pending=previous?previous.catch(()=>undefined).then(request):request();
 preferenceWrites.set(session.key,pending);
 void pending.finally(()=>{if(preferenceWrites.get(session.key)===pending)preferenceWrites.delete(session.key);}).catch(()=>{});
 return pending;
}
const preferenceEndpoint='/core-api/api/agency/workspace-preferences';
export async function workspacePreferenceRequest(userId:string,organizationId:string,value?:WorkspacePreferences,importOnly=false){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch(preferenceEndpoint,{method:value?'PATCH':'GET',credentials:'include',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-Scale-Preference-Scope':`${userId}:${organizationId}`,...(importOnly?{'If-None-Match':'*'}:{})},...(value?{body:JSON.stringify(value)}:{})});
  const data=await response.json();
  if(!response.ok)throw Object.assign(Error(data.error||'No se pudieron sincronizar las preferencias.'),{status:response.status});
  if(data.user_id!==userId||data.organization_id!==organizationId)throw Error('La sesión cambió. Recargá tus preferencias.');
  if(!data.preferences||data.preferences.version!==1)throw Error('Respuesta de preferencias inválida.');
  return {preferences:parseWorkspacePreferences(JSON.stringify(data.preferences)),stored:data.stored===true};
 }finally{clearTimeout(timeout);}
}
export function useWorkspacePreferences(userId:string,organizationId:string) {
 const key=workspacePreferenceKey(userId,organizationId);
 const currentKey=useRef(key);currentKey.current=key;
 const snapshot=useRef<PreferenceSession|null>(null);
 const [state,setState]=useState({key:'',value:defaultWorkspacePreferences(),warning:'',saving:false,startupReady:false});
 const active=(session:PreferenceSession)=>session.alive&&currentKey.current===session.key&&snapshot.current===session;
 function publish(session:PreferenceSession){if(active(session))setState({key:session.key,value:session.value,warning:[session.loadWarning,session.saveWarning,session.storageWarning].filter(Boolean).join(' '),saving:session.inFlight,startupReady:session.loaded});}
 function cache(session:PreferenceSession){
  try{window.localStorage.setItem(session.key,JSON.stringify({...session.value,pendingSync:session.dirty}));session.storageWarning='';}
  catch{session.storageWarning='El navegador no permite guardar la copia local de tus preferencias.';}
 }
 async function flush(session:PreferenceSession){
  if(!active(session)||session.inFlight||!session.dirty)return;
  session.inFlight=true;session.saveWarning='';publish(session);
  const revision=session.revision,value=session.value;
  let saved=false;
  try{
   const canonical=await queuedPreferenceWrite(session,value,()=>active(session));
   if(!active(session))return;
   saved=true;session.loadWarning='';
   if(session.revision===revision){session.value=canonical.preferences;session.dirty=false;cache(session);}
  }catch{if(active(session))session.saveWarning='No se pudieron guardar tus preferencias en tu cuenta. Los cambios siguen aplicados; reintentá la sincronización.';}
  finally{session.inFlight=false;if(active(session)){publish(session);if(saved&&session.dirty)void flush(session);}}
 }
 async function restore(session:PreferenceSession){
  const revision=session.revision,generation=++session.loadGeneration;
  try{
   let canonical=await workspacePreferenceRequest(session.userId,session.organizationId);
   // One-time legacy import is conditional on absence, never a bootstrap
   // autosave over another device. A competing writer wins; read its value.
   if(!canonical.stored&&session.legacy&&active(session)&&session.revision===revision&&!session.dirty){
    try{canonical=await workspacePreferenceRequest(session.userId,session.organizationId,session.value,true);}
    catch(error){if((error as {status?:number}).status!==412)throw error;canonical=await workspacePreferenceRequest(session.userId,session.organizationId);}
   }
   if(!active(session)||session.loadGeneration!==generation)return;
   if(session.revision===revision&&!session.dirty){session.value=canonical.preferences;session.legacy=false;cache(session);}
   session.loadWarning='';
  }catch{if(active(session)&&session.loadGeneration===generation)session.loadWarning='No se pudieron cargar tus preferencias de la cuenta. Usamos la copia de este dispositivo; podés reintentar.';}
  finally{if(active(session)&&session.loadGeneration===generation){session.loaded=true;publish(session);}}
 }
 useEffect(()=>{
  const session:PreferenceSession={key,userId,organizationId,value:defaultWorkspacePreferences(),legacy:false,revision:0,loadGeneration:0,alive:true,inFlight:false,dirty:false,loaded:false,loadWarning:'',saveWarning:'',storageWarning:''};
  if(key)try{const raw=window.localStorage.getItem(key);session.value=parseWorkspacePreferences(raw);try{const stored=JSON.parse(raw||'null');session.legacy=stored?.version===1&&!Object.hasOwn(stored,'pendingSync');}catch{}if(pendingPreferenceCache(raw)){session.dirty=true;session.revision=1;session.saveWarning='Tenés cambios de preferencias pendientes de sincronizar. Reintentá para guardarlos en tu cuenta.';}}catch{session.storageWarning='El navegador no permite recuperar la copia local de tus preferencias.';}
  snapshot.current=session;publish(session);
  if(key)void restore(session);
  return()=>{session.alive=false;};
 },[key]);
 function update(change:Partial<WorkspacePreferences>) {
  const session=snapshot.current;
  // Old dialog callbacks never write through a new user's cookie/session.
  if(!key||!session||session.key!==key||!active(session))return;
  session.value=parseWorkspacePreferences(JSON.stringify({...session.value,...change,version:1}));
  session.revision++;session.dirty=true;cache(session);publish(session);void flush(session);
 }
 function retry(){const session=snapshot.current;if(!session||!key||session.key!==key||!active(session))return;if(session.dirty)void flush(session);else void restore(session);}
 return {key,ready:!!key&&state.key===key,startupReady:!!key&&state.key===key&&state.startupReady,
  preferences:state.key===key?state.value:defaultWorkspacePreferences(),
  warning:state.key===key?state.warning:'',saving:state.key===key&&state.saving,update,retry};
}

export function useStartupPreference({scope,ready,enabled,pathname,role,startup,replace}:{scope:string;ready:boolean;enabled:boolean;pathname:string;role:string;startup:StartupPreference;replace:(path:string)=>void}) {
 // Capture in render, before ANY effect (including auth query cleanup). The
 // initial client render supplies this value even when the server rendered null.
 const entry=useRef<string|null>(typeof window==='undefined'?null:window.location.href),attempted=useRef(false),leftEntry=useRef(false);
 useEffect(()=>{
  const leave=()=>{leftEntry.current=true;};
  window.addEventListener('popstate',leave);
  window.addEventListener('pointerdown',leave);
  window.addEventListener('keydown',leave);
  return()=>{window.removeEventListener('popstate',leave);window.removeEventListener('pointerdown',leave);window.removeEventListener('keydown',leave);};
 },[]);
 useEffect(()=>{
  if(pathname!=='/' || (entry.current!==null && window.location.href!==entry.current))leftEntry.current=true;
  if(attempted.current || !scope || !ready)return;
  // Consume even a suspended or explicit entry, so later billing/role refreshes
  // and preference edits cannot suddenly redirect an already-open workspace.
  attempted.current=true;
  if(!enabled || leftEntry.current || !entry.current)return;
  const destination=startupDestination(entry.current,window.location.href,startup,role);
  if(destination)replace(destination);
 },[scope,ready,enabled,pathname,role,startup,replace]);
}

/** Refresh relative filters when the local calendar changes, including a tab
 * returning from sleep. No fixed agency timezone or persisted absolute dates. */
export function useLocalCalendarDay() {
 const [day,setDay]=useState(()=>localCalendarDay(new Date()));
 useEffect(()=>{
  const refresh=()=>setDay(localCalendarDay(new Date()));
  const timer=setInterval(refresh,60000);
  window.addEventListener('focus',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[]);
 return day;
}
