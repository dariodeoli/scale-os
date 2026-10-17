"use client";
import {useCallback,useLayoutEffect,useRef,useState} from 'react';
import type {BaseSyntheticEvent} from 'react';

/**
 * Runs one submission at a time. The lock starts before asynchronous validation
 * and is released after either completion or failure.
 */
export function useSingleFlightSubmit(submit:(event?:BaseSyntheticEvent)=>Promise<void>|void){
 const [pendiente,setPendiente]=useState(false);
 const submitting=useRef(false);
 const restoreFocus=useRef<HTMLElement|null>(null);
 const submitRef=useRef(submit);
 submitRef.current=submit;
 useLayoutEffect(()=>{
  if(pendiente||!restoreFocus.current)return;
  const target=restoreFocus.current;restoreFocus.current=null;
  if(typeof document!=='undefined'&&document.activeElement===document.body&&target.isConnected&&!target.matches(':disabled')&&!target.closest('[inert]'))target.focus();
 },[pendiente]);
 const onSubmit=useCallback(async(event?:BaseSyntheticEvent)=>{
  event?.preventDefault();
  if(submitting.current)return;
  if(typeof HTMLElement!=='undefined'&&document.activeElement instanceof HTMLElement)restoreFocus.current=document.activeElement;
  submitting.current=true;
  setPendiente(true);
  try{return await submitRef.current(event);}
  finally{ submitting.current=false;setPendiente(false); }
 },[]);
 return {pendiente,pending:pendiente,onSubmit};
}
