"use client";
import {useCallback,useRef,useState} from 'react';
import type {BaseSyntheticEvent} from 'react';

/**
 * Runs one submission at a time. The lock starts before asynchronous validation
 * and is released after either completion or failure.
 */
export function useSingleFlightSubmit(submit:(event?:BaseSyntheticEvent)=>Promise<void>|void){
 const [pendiente,setPendiente]=useState(false);
 const submitting=useRef(false);
 const submitRef=useRef(submit);
 submitRef.current=submit;
 const onSubmit=useCallback(async(event?:BaseSyntheticEvent)=>{
  if(submitting.current)return;
  submitting.current=true;
  setPendiente(true);
  try{return await submitRef.current(event);}
  finally{ submitting.current=false;setPendiente(false); }
 },[]);
 return {pendiente,pending:pendiente,onSubmit};
}
