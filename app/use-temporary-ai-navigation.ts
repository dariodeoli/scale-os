"use client";
import {useEffect,useState} from 'react';
import {AI_NAV_EXPIRES_AT,temporaryAiNavigationVisible} from './workspace-navigation';

/** Schedule the exact expiry, also refreshing after sleep/focus or clock changes. */
export function useTemporaryAiNavigation(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const update=()=>{clearTimeout(timer);const now=Date.now();setVisible(temporaryAiNavigationVisible(now));if(now<AI_NAV_EXPIRES_AT)timer=setTimeout(update,Math.min(AI_NAV_EXPIRES_AT-now,3_600_000));};
  update();window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{clearTimeout(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 return visible;
}
