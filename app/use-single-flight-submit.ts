"use client";
import {useRef,useState,type BaseSyntheticEvent} from 'react';

// Lock before asynchronous validation, not only when the network request starts.
// A second submit must not release another request's pending state.
export function useSingleFlightSubmit(submit:(event?:BaseSyntheticEvent)=>Promise<void>){
 const running=useRef(false);
 const [pending,setPending]=useState(false);
 async function onSubmit(event:BaseSyntheticEvent){
  event.preventDefault();
  if(running.current)return;
  running.current=true;setPending(true);
  try{await submit(event);}
  finally{running.current=false;setPending(false);}
 }
 return {pending,onSubmit};
}
