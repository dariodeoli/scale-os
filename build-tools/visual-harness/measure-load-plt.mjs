/*
 * Medición de la carga inicial autenticada (#106) — reproducible con el stack
 * local de QA (API + front + proxy de un origen y sesión real).
 *
 * Mide, por pantalla y por ancho (1440×900 y 390×844):
 *  - espera de autenticación: cuándo termina `/api/auth/me`;
 *  - TTFB del documento (Navigation Timing);
 *  - primera pintura con contenido y momento en que la lista está montada;
 *  - llamadas a `/core-api/*`, peso transferido total y la petición más lenta.
 *
 * Uso (con el stack e2e y `qa-proxy.mjs` corriendo):
 *   QA_SESSION=plt-qa-session.txt node build-tools/visual-harness/measure-load-plt.mjs
 *   QA_SCREENS=equipo,actividad QA_SIZES=1440x900,390x844 ...
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const sessionFile=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'plt-qa-session.txt');
const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/carga-plt');
mkdirSync(OUT,{recursive:true});

const SCREENS={
 equipo:{path:'/equipo',ready:'.team-filters'},
 actividad:{path:'/equipo/actividad',ready:'.activity-feed'},
 historial:{path:'/equipo/historial',readyText:'Historial de trabajo'},
 invitaciones:{path:'/equipo/invitaciones',readyText:'Invitaciones y solicitudes',owner:true},
 permisos:{path:'/equipo/permisos',readyText:'Roles y permisos'},
 papelera:{path:'/configuracion/papelera',readyText:'Papelera'},
 preferencias:{path:'/configuracion/preferencias',readyText:'Preferencias del espacio'},
 configuracion:{path:'/configuracion',ready:'.settings-slice .settings-card'},
 superadmin:{path:'/superadmin',ready:'.platform-admin-page',owner:true},
};
const wanted=(process.env.QA_SCREENS||Object.keys(SCREENS).join(',')).split(',').filter(Boolean);
const sizes=(process.env.QA_SIZES||'1440x900,390x844').split(',').map(size=>size.split('x').map(Number));

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
 return result.value;
};
const sleep=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=60000,label=''}={})=>{
 const start=Date.now();
 while(Date.now()-start<timeout){
  if(await evaluate(`Boolean(${expression})`))return Math.round(await evaluate('Math.round(performance.now())'));
  await sleep(120);
 }
 throw new Error(`timeout esperando ${label||expression}`);
};
const rows=[];

try{
 await send('Page.enable');await send('Runtime.enable');
 for(const [width,height] of sizes){
  const mobile=width<768;
  for(const id of wanted){
   const screen=SCREENS[id];
   if(!screen)throw new Error(`pantalla desconocida: ${id}`);
   const cookie=screen.owner?(session.OWNER_SESSION||session.SESSION):session.SESSION;
   await send('Network.clearBrowserCookies');
   await send('Network.setCookie',{name:'scale_session',value:cookie,url:BASE});
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
   await evaluate('(()=>{try{localStorage.clear();}catch{};return true;})()');
   await send('Page.navigate',{url:BASE+screen.path});
   const ready=screen.ready?`document.querySelector(${JSON.stringify(screen.ready)})`:`document.body.innerText.includes(${JSON.stringify(screen.readyText)})`;
   const contentMs=await waitFor(ready,{label:`${id} (${width})`});
   await sleep(400);
   const metrics=await evaluate(`(()=>{
    const resources=performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/core-api/'));
    const api=resources.map(entry=>({url:entry.name.replace(location.origin,''),duration:Math.round(entry.duration),bytes:entry.transferSize||0}));
    const me=api.find(entry=>entry.url.startsWith('/core-api/api/auth/me'));
    const navigation=performance.getEntriesByType('navigation')[0]||{};
    const paint=performance.getEntriesByName('first-contentful-paint')[0];
    const slowest=api.slice().sort((a,b)=>b.duration-a.duration)[0]||null;
    return {
     ttfb:Math.round((navigation.responseStart||0)-(navigation.requestStart||0)),
     authMs:me?me.duration:null,
     fcp:Math.round(paint?.startTime||0),
     calls:api.length,
     bytes:api.reduce((sum,entry)=>sum+entry.bytes,0),
     slowest:slowest?{url:slowest.url,duration:slowest.duration,bytes:slowest.bytes}:null,
    };
   })()`);
   const row={screen:id,width,height,mobile,...metrics,contentMs};
   rows.push(row);
   console.log(`${id} ${width}×${height}`,JSON.stringify(row));
  }
 }
 writeFileSync(resolve(OUT,'mediciones.json'),JSON.stringify({capturedAt:new Date().toISOString(),base:BASE,rows},null,1));
 // Tabla Markdown para el handover.
 const md=['| Pantalla | Ancho | TTFB | Auth | Lista lista | Llamadas | Peso | Más lenta |','| --- | --- | --- | --- | --- | --- | --- | --- |'];
 for(const row of rows)md.push(`| ${row.screen} | ${row.width}×${row.height} | ${row.ttfb} ms | ${row.authMs===null?'—':`${row.authMs} ms`} | ${row.contentMs} ms | ${row.calls} | ${(row.bytes/1024).toFixed(1)} KB | ${row.slowest?`${row.slowest.url.replace('/core-api/api/agency/','').replace('/core-api/api/','')} (${row.slowest.duration} ms)`: '—'} |`);
 writeFileSync(resolve(OUT,'mediciones.md'),md.join('\n')+'\n');
 console.log(`\n${md.join('\n')}\n\nMediciones en ${OUT}`);
}catch(error){
 console.error(error.stack||error);
 process.exitCode=1;
}finally{
 cdp.close();
 await chrome.close?.();
 process.exit(process.exitCode||0);
}
