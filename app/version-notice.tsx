'use client';
import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {hayVersionNueva} from 'owncoding-ui';
import {APP_VERSION} from './app-version';

// Aviso de versión nueva (§15 regla 10, Refs #82): la versión publicada sale de
// la fuente pública del API (`/health` → `release.version`) y se compara con la
// que corre el pie (`APP_VERSION`) mediante `hayVersionNueva`. Si no hay red o
// la respuesta no trae versión, no se afirma nada (nunca un aviso falso).
const CONSULTA_MS=15*60*1000;

/** Versión publicada por el API; cadena vacía si no se puede comprobar. */
export async function versionPublicada(fetcher:typeof fetch=fetch){
 try{
  const response=await fetcher('/core-api/health',{cache:'no-store'});
  const data=await response.json() as {release?:{version?:string}};
  return String(data?.release?.version||'').trim();
 }catch{return '';}
}

export function VersionNotice(){
 const [publicada,setPublicada]=useState('');
 useEffect(()=>{
  let vivo=true;
  const consultar=async()=>{const version=await versionPublicada();if(vivo)setPublicada(version);};
  void consultar();
  const timer=window.setInterval(()=>{if(!document.hidden)void consultar();},CONSULTA_MS);
  const alVolver=()=>{if(!document.hidden)void consultar();};
  document.addEventListener('visibilitychange',alVolver);
  return()=>{vivo=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',alVolver);};
 },[]);
 if(!publicada||!hayVersionNueva(APP_VERSION,publicada))return null;
 const version=publicada.replace(/^v/i,'');
 return <section className="version-notice inline-flex min-w-0 items-center" aria-label={`Versión ${version} disponible`}>
  <button type="button" className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full bg-fono/15 px-3 text-[11px] font-bold leading-tight text-fono-light hover:bg-fono/25" title={`Hay una versión nueva (v${version}). Recargá para actualizarla.`} onClick={()=>window.location.reload()}><RefreshCw size={13} aria-hidden="true"/>Versión nueva · Recargar</button>
 </section>;
}
