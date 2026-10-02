/*
 * Medición de la carga inicial autenticada (#106/#108) — reproducible con el
 * stack local de QA (API + front + proxy de un origen y sesión real) o contra
 * producción con `PROD_BASE`/`PROD_SESSION`.
 *
 * Mide, por pantalla y por ancho (1440×900 y 390×844):
 *  - espera de autenticación: cuándo termina `/api/auth/me`;
 *  - TTFB del documento (Navigation Timing) y `load page` (loadEventEnd);
 *  - primera pintura con contenido y momento en que la lista está montada;
 *  - llamadas a la API, peso transferido (con la codificación real) y la más lenta.
 *
 * Latencia de red emulada (CDP) para acercarse a producción:
 *   QA_LATENCY="desktop=40:10000:3000,mobile=80:1600:750"   (rtt ms : bajada kbps : subida kbps)
 *
 * Uso local:
 *   QA_SESSION=plt-qa-session.txt node build-tools/visual-harness/measure-load-plt.mjs
 * Uso contra producción (sesión real de Dario, sin escribir nada):
 *   PROD_BASE=https://app.scaleparaguay.com PROD_SESSION=<cookie scale_session> \
 *   node build-tools/visual-harness/measure-load-plt.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const BASE=process.env.PROD_BASE||process.env.BASE_URL||(()=>{
 const sessionFile=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'plt-qa-session.txt');
 const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
 return session.BASE;
})();
const SESSION_FILE=(()=>{try{const sessionFile=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'plt-qa-session.txt');return Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));}catch{return {};}})();
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/carga-prod');
mkdirSync(OUT,{recursive:true});
const API_PREFIX=process.env.PROD_BASE?'/core-api/':'/core-api/';

// Latencia por ancho: `rtt:bajada(kbps):subida(kbps)`.
const latency=(()=>{
 const map={};
 for(const part of String(process.env.QA_LATENCY||'').split(',').filter(Boolean)){
  const [size,values]=part.split('=');
  const [rtt,download,upload]=values.split(':').map(Number);
  map[size.trim()]={latency:rtt||0,downloadThroughput:Math.round((download||10000)*1024/8),uploadThroughput:Math.round((upload||3000)*1024/8)};
 }
 return map;
})();

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
 // #139: KPIs de Resumen, Finanzas e Informes en la primera llamada.
 resumen:{path:'/resumen',ready:'.financial-summary',kpi:['/api/agency/dashboard','/api/agency/control-center']},
 finanzas:{path:'/pagos',ready:'section[aria-label="Finanzas"]',kpi:['/api/agency/forecast']},
 informes:{path:'/informes',readyText:'Informes',kpi:['/api/agency/reports']},
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
const waitFor=async(expression,{timeout=90000,label=''}={})=>{
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
  const emulation=latency[`${width}x${height}`]||latency[mobile?'mobile':'desktop']||null;
  for(const id of wanted){
   const screen=SCREENS[id];
   if(!screen)throw new Error(`pantalla desconocida: ${id}`);
   const cookie=process.env.PROD_SESSION||(screen.owner?(SESSION_FILE.OWNER_SESSION||SESSION_FILE.SESSION):SESSION_FILE.SESSION);
   await send('Network.clearBrowserCookies');
   await send('Network.setCookie',{name:'scale_session',value:cookie,url:BASE});
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
   if(emulation)await send('Network.emulateNetworkConditions',{offline:false,...emulation});
   else await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
   await evaluate('(()=>{try{localStorage.clear();}catch{};return true;})()');
   await send('Page.navigate',{url:BASE+screen.path});
   const ready=screen.ready?`document.querySelector(${JSON.stringify(screen.ready)})`:`document.body.innerText.includes(${JSON.stringify(screen.readyText)})`;
   const contentMs=await waitFor(ready,{label:`${id} (${width})`});
   await waitFor(`document.readyState==='complete'`,{label:`load ${id}`});
   await sleep(400);
   const metrics=await evaluate(`(()=>{
    const resources=performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/core-api/'));
    const api=resources.map(entry=>({url:entry.name.replace(location.origin,''),duration:Math.round(entry.duration),start:Math.round(entry.startTime),end:Math.round(entry.startTime+entry.duration),bytes:entry.transferSize||0}));
    const me=api.find(entry=>entry.url.startsWith('/core-api/api/auth/me'));
    const navigation=performance.getEntriesByType('navigation')[0]||{};
    const paint=performance.getEntriesByName('first-contentful-paint')[0];
    const slowest=api.slice().sort((a,b)=>b.duration-a.duration)[0]||null;
    const kpiUrls=${JSON.stringify(screen.kpi||[])};
    const kpiEntries=api.filter(entry=>kpiUrls.some(url=>entry.url.startsWith('/core-api'+url)));
    return {
     ttfb:Math.round((navigation.responseStart||0)-(navigation.requestStart||0)),
     loadMs:Math.round(navigation.loadEventEnd||0),
     authMs:me?me.duration:null,
     fcp:Math.round(paint?.startTime||0),
     calls:api.length,
     bytes:api.reduce((sum,entry)=>sum+entry.bytes,0),
     rawBytes:api.reduce((sum,entry)=>sum+(entry.decodedBodySize||0),0),
     kpiMs:kpiEntries.length?Math.max(...kpiEntries.map(entry=>entry.end)):null,
     kpiCalls:kpiEntries.length,
     slowest:slowest?{url:slowest.url,duration:slowest.duration,bytes:slowest.bytes}:null,
     api:api.map(entry=>({url:entry.url.replace('/core-api/api/',''),duration:entry.duration,start:entry.start,bytes:entry.bytes})),
    };
   })()`);
   const row={screen:id,width,height,mobile,network:emulation?`${emulation.latency}ms/${Math.round(emulation.downloadThroughput*8/1024)}kbps`:'local',...metrics,contentMs};
   rows.push(row);
   console.log(`${id} ${width}×${height}`,JSON.stringify({...row,api:undefined}));
  }
 }
 writeFileSync(resolve(OUT,'mediciones.json'),JSON.stringify({capturedAt:new Date().toISOString(),base:BASE,latency,rows},null,1));
 // Tabla Markdown para el handover.
 const md=['| Pantalla | Ancho | Red | TTFB | Auth | Lista lista | KPIs listos | load page | Llamadas | Peso real (transferencia) | Más lenta |','| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
 for(const row of rows)md.push(`| ${row.screen} | ${row.width}×${row.height} | ${row.network} | ${row.ttfb} ms | ${row.authMs===null?'—':`${row.authMs} ms`} | ${row.contentMs} ms | ${row.kpiMs===null?'—':`${row.kpiMs} ms`} | ${row.loadMs} ms | ${row.calls} | ${(row.bytes/1024).toFixed(0)} KB | ${row.slowest?`${row.slowest.url.replace('/core-api/api/','')} (${row.slowest.duration} ms)`: '—'} |`);
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
