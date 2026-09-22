"use client";
import {useEffect,useRef,useState} from 'react';
import {AccessLayout} from '../access-layout';
import {LoadingBlock} from '../ui-v2';

export default function DemoStart(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(true),started=useRef(false);
 const start=async()=>{setBusy(true);setError('');try{const response=await fetch('/core-api/api/demo/start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),data=await response.json().catch(()=>null);if(!response.ok)throw Error(data?.error||'No se pudo iniciar el Demo.');window.location.assign('/produccion?demoWelcome=1');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo iniciar el Demo.');setBusy(false);}};
 useEffect(()=>{if(!started.current){started.current=true;void start();}},[]);
 return <AccessLayout eyebrow="Demo guiada">
  <div className="grid gap-3" aria-busy={busy}>
   <h1 className="text-2xl font-bold tracking-tight text-fore">{busy?'Preparando tu Demo…':'No pudimos abrir el Demo.'}</h1>
   {busy?<LoadingBlock label="Preparando tu Demo…" lines={2}/>:null}
   {error?<><p role="alert" className="text-sm text-bad">{error}</p><button className="primary" type="button" onClick={()=>void start()}>Reintentar</button></>:null}
   <p className="text-[11.5px] text-mute">La Demo usa datos de ejemplo y no crea accesos externos. Al terminar podés volver a tu empresa real desde la barra superior.</p>
  </div>
 </AccessLayout>;
}
