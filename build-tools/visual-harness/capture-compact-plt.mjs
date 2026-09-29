/*
 * Capturas del pase de compactación de Plataforma (#92 Equipo + #96 resto):
 * antes/después de cada pantalla en claro/oscuro y 1440×900 / 390×844.
 *
 * Requiere el stack local (e2e-fin-stack.mjs con puertos propios y la sesión
 * real del dueño) y el artifact del estado a capturar:
 *   PG_BIN=/opt/homebrew/opt/postgresql@17/bin PG_DIR=/tmp/plt-e2e-pg-SOS-PLT \
 *   PG_PORT=55455 API_PORT=3923 FRONT_PORT=3040 PROXY_PORT=3041 \
 *   QA_SESSION=plt-qa-session.txt SCALE_OS_OWNER_EMAIL=qa-plt@example.invalid \
 *   SCALE_OS_OWNER_PASSWORD=qa-plt-12345678 node build-tools/visual-harness/e2e-fin-stack.mjs
 *   LABEL=despues node build-tools/visual-harness/capture-compact-plt.mjs
 *
 * `QA_SCREENS=configuracion,papelera` limita las pantallas. La sesión demo
 * cubre las pantallas con datos; `invitaciones` y `superadmin` usan la sesión
 * real del dueño (`OWNER_SESSION` del archivo de sesión).
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
const DIR=process.env.OUT_DIR||'docs/qa/compact-plt';
const OUT=resolve(repo,DIR);
mkdirSync(OUT,{recursive:true});

const SCREENS={
 equipo:{path:'/equipo',ready:'.team-filters',content:'.person-hub-card'},
 'equipo-alta':{path:'/equipo',ready:'.team-filters',content:'.team-filters',click:'Agregar persona'},
 historial:{path:'/equipo/historial',readyText:'Historial de trabajo',content:'section[aria-label="Historial de trabajo"] li'},
 configuracion:{path:'/configuracion',ready:'.settings-slice .settings-card',content:'.settings-slice .settings-card'},
 preferencias:{path:'/configuracion/preferencias',readyText:'Preferencias del espacio',content:'div.rounded-xl'},
 papelera:{path:'/configuracion/papelera',readyText:'Papelera',content:'.list-row'},
 invitaciones:{path:'/equipo/invitaciones',readyText:'Invitaciones y solicitudes',content:'.list-row',owner:true},
 permisos:{path:'/equipo/permisos',readyText:'Roles y permisos',content:'.list-row'},
 actividad:{path:'/equipo/actividad',ready:'.activity-feed',content:'.activity-feed-row'},
 superadmin:{path:'/superadmin',ready:'.platform-admin-page',content:'.list-row,.platform-admin-agency-cards article,.ops-card',owner:true,superadmin:true},
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
  try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}
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
  for(const [width,height] of (process.env.QA_SIZES||'1440x900,390x844').split(',').map(size=>size.split('x').map(Number))){
   const mobile=width<768;
   for(const id of wanted){
    const screen=SCREENS[id];
    if(!screen)throw new Error(`pantalla desconocida: ${id}`);
    const cookie=screen.owner?(session.OWNER_SESSION||session.SESSION):session.SESSION;
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
    await sleep(1400);
    if(screen.click)await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(element=>(element.textContent||'').trim().startsWith(${JSON.stringify(screen.click)}));if(button)button.click();return true;})()`);
    if(screen.click)await sleep(700);
    if(process.env.QA_VIEW==='list')await evaluate(`(()=>{const button=[...document.querySelectorAll('button[aria-label]')].find(element=>(element.getAttribute('aria-label')||'').startsWith('Ver como lista'));if(button&&button.getAttribute('aria-pressed')!=='true')button.click();return true;})()`);
    await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
    await sleep(200);
    const suffix=process.env.QA_VIEW==='list'?'-lista':'';
    await shot(`${id}-${LABEL}${suffix}-${width}-${theme}.jpg`);
    const metrics=await evaluate(`(()=>{const first=document.querySelector(${JSON.stringify(screen.content)});const rows=[...document.querySelectorAll(${JSON.stringify(screen.content)})];const height=window.innerHeight;return {contentTop:first?Math.round(first.getBoundingClientRect().top):null,visibles:rows.filter(row=>{const box=row.getBoundingClientRect();return box.top>=0&&box.bottom<=height;}).length};})()`);
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
