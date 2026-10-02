/*
 * Capturas de la auditoría PLT #143 (Equipo y Configuración móvil): tabs
 * visibles, permisos por módulo, Actividad legible, Papelera con restaurar
 * visible, Invitaciones demo compactas y KPIs compactos.
 * Requiere el stack local de QA (e2e-plt-stack.mjs) y su archivo de sesión.
 *
 * Uso:
 *   LABEL=despues QA_SIZES=390x844,768x1024,1440x900 QA_THEMES=light,dark \
 *   node build-tools/visual-harness/capture-plt-143.mjs
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
const LABEL=process.env.LABEL||'despues';
const DIR=process.env.OUT_DIR||'docs/qa/plt-143';
const OUT=resolve(repo,DIR);
mkdirSync(OUT,{recursive:true});

const SCREENS={
 equipo:{path:'/equipo',ready:'.team-filters',content:'.person-hub-card'},
 'equipo-permisos':{path:'/equipo/permisos',readyText:'Roles y permisos',content:'[aria-label="Roles y permisos"]'},
 actividad:{path:'/equipo/actividad',ready:'.activity-feed',content:'.activity-feed-row'},
 papelera:{path:'/configuracion/papelera',ready:'[aria-label="Papelera de esta empresa"]',content:'.list-row'},
 invitaciones:{path:'/equipo/invitaciones',readyText:'Invitaciones y solicitudes',content:'.list-row',owner:true},
 'invitaciones-demo':{path:'/equipo/invitaciones',readyText:'Invitaciones y solicitudes',content:'section[aria-label="Invitaciones y solicitudes"]'},
 preferencias:{path:'/configuracion/preferencias',readyText:'Preferencias del espacio',content:'.ui-kpi-strip'},
 configuracion:{path:'/configuracion',ready:'.settings-slice .settings-card',content:'.settings-card'},
};
const wanted=(process.env.QA_SCREENS||Object.keys(SCREENS).join(',')).split(',').filter(Boolean);

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
  try{if(await evaluate(`Boolean(${expression})`))return true;}catch{/* navegación en curso */}
  await sleep(250);
 }
 throw new Error(`timeout esperando ${label||expression}`);
};
const shot=async(file)=>{
 const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:true});
 writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
 console.log(file);
};
const measurements=[];

try{
 await send('Page.enable');await send('Runtime.enable');
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const [width,height] of (process.env.QA_SIZES||'390x844,768x1024').split(',').map(size=>size.split('x').map(Number))){
   const mobile=width<768;
   for(const id of wanted){
    const screen=SCREENS[id];
    if(!screen)throw new Error(`pantalla desconocida: ${id}`);
    const cookie=screen.owner?session.OWNER_SESSION||session.SESSION:session.SESSION;
    await send('Network.clearBrowserCookies');
    await send('Network.setCookie',{name:'scale_session',value:cookie,url:BASE});
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await send('Page.navigate',{url:BASE+screen.path});
    try{
     const ready=screen.ready?`document.querySelector(${JSON.stringify(screen.ready)})`:`document.body.innerText.includes(${JSON.stringify(screen.readyText)})`;
     await waitFor(ready,{label:`${id} (${width} ${theme})`});
    }catch(error){
     await shot(`${id}-${LABEL}-${width}-${theme}-sin-cargar.jpg`);
     throw error;
    }
    await sleep(1200);
    if(screen.click)await evaluate(`(()=>{const button=[...document.querySelectorAll('button,summary')].find(element=>(element.textContent||'').trim().startsWith(${JSON.stringify(screen.click)}));if(button)button.click();return true;})()`);
    if(screen.click)await sleep(600);
    await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
    await sleep(250);
    await shot(`${id}-${LABEL}-${width}-${theme}.jpg`);
    const metrics=await evaluate(`(()=>{
     const first=document.querySelector(${JSON.stringify(screen.content)});
     const rows=[...document.querySelectorAll(${JSON.stringify(screen.content)})];
     const viewport=window.innerHeight;
     const offscreen=[...document.querySelectorAll('.list-actions button, .tab-scroller-button, [aria-label^="Restaurar"], button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.right>window.innerWidth+1||r.left<-1);}).length;
     const tabs=document.querySelector('.tab-scroller');
     return {contentTop:first?Math.round(first.getBoundingClientRect().top):null,visibles:rows.filter(row=>{const box=row.getBoundingClientRect();return box.top>=0&&box.bottom<=viewport;}).length,controlesFuera:offscreen,tabsScrollable:tabs?tabs.querySelectorAll('.tab-scroller-button').length:null};
    })()`);
    console.log(`métricas ${id} ${width}×${height} ${theme}:`,JSON.stringify(metrics));
    measurements.push({screen:id,label:LABEL,width,height,theme,...metrics});
   }
  }
 }
 writeFileSync(resolve(OUT,`metricas-${LABEL}.json`),JSON.stringify(measurements,null,1));
 console.log(`Capturas en ${OUT}`);
}catch(error){
 console.error(error.stack||error);
 process.exitCode=1;
}finally{
 cdp.close();
 await chrome.close?.();
 process.exit(process.exitCode||0);
}
