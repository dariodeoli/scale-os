"use client";
import {useEffect,useRef,useState} from 'react';
import {defaultWorkspacePreferences,parseWorkspacePreferences,startupDestination,workspacePreferenceKey,type WorkspacePreferences,type StartupPreference} from './workspace-preferences';
import {localCalendarDay} from './production-filter';

export function useWorkspacePreferences(userId:string,organizationId:string) {
 const key=workspacePreferenceKey(userId,organizationId);
 const currentKey=useRef(key);currentKey.current=key;
 const snapshot=useRef({key:'',value:defaultWorkspacePreferences()});
 const [state,setState]=useState({...snapshot.current,warning:''});
 useEffect(()=>{
  let value=defaultWorkspacePreferences(),warning='';
  if(key)try{value=parseWorkspacePreferences(window.localStorage.getItem(key));}
  catch{warning='El navegador no permite recuperar tus preferencias. Los cambios funcionarán durante esta sesión.';}
  snapshot.current={key,value};setState({key,value,warning});
 },[key]);
 function update(change:Partial<WorkspacePreferences>) {
  // A callback retained by an old dialog must never write into the next identity.
  if(!key || currentKey.current!==key || snapshot.current.key!==key)return;
  const value=parseWorkspacePreferences(JSON.stringify({...snapshot.current.value,...change,version:1}));
  let warning='';
  try{window.localStorage.setItem(key,JSON.stringify(value));}
  catch{warning='No se pudieron guardar tus preferencias en este navegador. Se aplican solo durante esta sesión.';}
  snapshot.current={key,value};setState({key,value,warning});
 }
 return {key,ready:!!key&&state.key===key,
  preferences:state.key===key?state.value:defaultWorkspacePreferences(),
  warning:state.key===key?state.warning:'',update};
}

export function useStartupPreference({scope,ready,enabled,pathname,role,startup,replace}:{scope:string;ready:boolean;enabled:boolean;pathname:string;role:string;startup:StartupPreference;replace:(path:string)=>void}) {
 // Capture in render, before ANY effect (including auth query cleanup). The
 // initial client render supplies this value even when the server rendered null.
 const entry=useRef<string|null>(typeof window==='undefined'?null:window.location.href),attempted=useRef(false),leftEntry=useRef(false);
 useEffect(()=>{
  const leave=()=>{leftEntry.current=true;};
  window.addEventListener('popstate',leave);
  return()=>window.removeEventListener('popstate',leave);
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
