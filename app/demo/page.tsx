"use client";
import {useEffect,useRef,useState} from 'react';

export default function DemoStart(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(true),started=useRef(false);
 const start=async()=>{setBusy(true);setError('');try{const response=await fetch('/core-api/api/demo/start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),data=await response.json().catch(()=>null);if(!response.ok)throw Error(data?.error||'No se pudo iniciar el Demo.');window.location.assign('/produccion?demoWelcome=1');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo iniciar el Demo.');setBusy(false);}};
 useEffect(()=>{if(!started.current){started.current=true;void start();}},[]);
 return <main className="demo-start-page" aria-busy={busy}><section className="demo-start-status"><img src="/brand/icon-192.png" width={42} height={42} alt="Scale OS"/><p>{busy?'Preparando tu Demo…':'No pudimos abrir el Demo.'}</p>{error&&<><p role="alert" className="error">{error}</p><button className="primary" type="button" onClick={()=>void start()}>Reintentar</button></>}</section></main>;
}
