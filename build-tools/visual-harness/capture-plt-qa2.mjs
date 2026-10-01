/*
 * QA ola 2 — Plataforma y Equipo (issue #125): recorrido a 390×844 y 768×1024,
 * claro/oscuro, con muestras de modales, buscadores, listas y estados vacíos.
 * Requiere el stack local del harness y la sesión `plt-qa2-session.txt`.
 *
 * Uso:
 *   LABEL=despues QA_SIZES=390x844,768x1024 QA_THEMES=light,dark \
 *   node build-tools/visual-harness/capture-plt-qa2.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const sessionFile=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'plt-qa2-session.txt');
const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const LABEL=process.env.LABEL||'qa2';
const DIR=process.env.OUT_DIR||'docs/qa/plt-qa2';
const OUT=resolve(repo,DIR);
mkdirSync(OUT,{recursive:true});

const SCREENS={
 equipo:{path:'/equipo',ready:'.team-filters',content:'.person-hub-card'},
 'equipo-lista':{path:'/equipo',ready:'.team-filters',content:'.ops-grid-list .list-row',list:true},
 'equipo-alta':{path:'/equipo',ready:'.team-filters',content:'.ops-dialog',click:'Agregar persona'},
 'equipo-permisos':{path:'/equipo',ready:'.team-filters',content:'.ops-dialog',click:'Permisos del panel'},
 'equipo-vacio':{path:'/equipo',ready:'.team-filters',content:'.empty-block, [class*=empty]',search:'zzzz-sin-resultados'},
 invitaciones:{path:'/equipo/invitaciones',readyText:'Invitaciones y solicitudes',content:'.list-row',owner:true},
 permisos:{path:'/equipo/permisos',readyText:'Roles y permisos',content:'.list-row'},
 actividad:{path:'/equipo/actividad',ready:'.activity-feed',content:'.activity-feed-row'},
 historial:{path:'/equipo/historial',readyText:'Historial de trabajo',content:'section[aria-label="Historial de trabajo"] li'},
 configuracion:{path:'/configuracion',ready:'.settings-slice .settings-card',content:'.settings-slice .settings-card'},
 preferencias:{path:'/configuracion/preferencias',readyText:'Preferencias del espacio',content:'div.rounded-xl'},
 papelera:{path:'/configuracion/papelera',readyText:'Papelera',content:'.list-row'},
 'papelera-vacia':{path:'/configuracion/papelera',readyText:'No hay registros en la papelera',content:'.empty-block',owner:true},
 'historial-vacio':{path:'/equipo/historial',readyText:'Historial de trabajo',content:'.empty-block',owner:true},
 perfil:{path:'/equipo',ready:'.team-filters',content:'.ops-dialog',clickAria:'Abrir mi perfil',scroll:'bottom'},
 superadmin:{path:'/superadmin',ready:'.platform-admin-page',content:'.list-row,.platform-admin-agency-cards article,.ops-card',owner:true,superadmin:true},
 login:{path:'/',ready:'form',public:true},
 registro:{path:'/registro',ready:'form',public:true,scroll:'bottom'},
 'invitacion-error':{path:'/invitacion?token='+'0'.repeat(43),readyText:'Enlace',public:true},
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
const shot=async(file,{beyond=true}={})=>{
 const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:80,captureBeyondViewport:beyond});
 writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
 console.log(file);
};
const probe=async()=>evaluate(`(()=>{
 const doc=document.documentElement;
 const wide=[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.right>window.innerWidth+1&&getComputedStyle(el).position!=='fixed'&&!el.closest('.list-grid-scroll');}).slice(0,6).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,70),right:Math.round(el.getBoundingClientRect().right)}));
 const dialog=document.querySelector('.ops-dialog');const dbox=dialog?dialog.getBoundingClientRect():null;
 const smallControls=dialog?[...dialog.querySelectorAll('button,input,select,textarea,a')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<40||r.width<40);}).slice(0,8).map(el=>({tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,36),h:Math.round(el.getBoundingClientRect().height),w:Math.round(el.getBoundingClientRect().width)})):null;
 const active=document.activeElement&&document.activeElement!==document.body?document.activeElement.tagName+' «'+((document.activeElement.getAttribute('aria-label')||document.activeElement.textContent||'').trim().slice(0,40))+'»':'body';
 return {overflow:doc.scrollWidth-window.innerWidth,wide,dialog:dbox?{w:Math.round(dbox.width),h:Math.round(dbox.height),top:Math.round(dbox.top),bottom:Math.round(dbox.bottom),viewport:window.innerHeight,scrollable:dialog.scrollHeight>dialog.clientHeight+2}:null,smallControls,active};
})()`);

const measurements=[];
try{
 await send('Page.enable');await send('Runtime.enable');
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const [width,height] of (process.env.QA_SIZES||'390x844,768x1024').split(',').map(size=>size.split('x').map(Number))){
   const mobile=width<768;
   for(const id of wanted){
    const screen=SCREENS[id];
    if(!screen)throw new Error(`pantalla desconocida: ${id}`);
    await send('Network.clearBrowserCookies');
    if(!screen.public)await send('Network.setCookie',{name:'scale_session',value:screen.owner?(session.OWNER_SESSION||session.SESSION):session.SESSION,url:BASE});
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await send('Page.navigate',{url:BASE+screen.path});
    try{
     const ready=screen.ready?`document.querySelector(${JSON.stringify(screen.ready)})`:`document.body.innerText.includes(${JSON.stringify(screen.readyText)})`;
     await waitFor(ready,{label:`${id} (${width} ${theme})`});
    }catch(error){
     await shot(`${id}-${LABEL}-${width}-${theme}-sin-cargar.jpg`,{beyond:false});
     measurements.push({screen:id,label:LABEL,width,height,theme,error:String(error.message||error)});
     console.error(`sin cargar: ${id} ${width} ${theme}: ${error.message||error}`);
     continue;
    }
    await sleep(1200);
    if(screen.click){
     await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(element=>(element.textContent||'').trim().startsWith(${JSON.stringify(screen.click)}));if(button)button.click();return Boolean(button);})()`);
     await sleep(800);
    }
    if(screen.clickAria){
     await evaluate(`(()=>{const button=document.querySelector('[aria-label=${JSON.stringify(screen.clickAria)}]');if(button)button.click();return Boolean(button);})()`);
     await sleep(800);
    }
    if(screen.list)await evaluate(`(()=>{const button=[...document.querySelectorAll('button[aria-label]')].find(element=>(element.getAttribute('aria-label')||'').startsWith('Ver como lista'));if(button&&button.getAttribute('aria-pressed')!=='true')button.click();return true;})()`);
    if(screen.search)await evaluate(`(()=>{const input=document.querySelector('.team-search input, input[type="search"], .search-field input');if(input){const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(input,${JSON.stringify(screen.search)});input.dispatchEvent(new Event('input',{bubbles:true}));}return Boolean(input);})()`);
    await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
    await sleep(300);
    if(screen.scroll)await evaluate(`window.scrollTo(0,${screen.scroll==='bottom'?'document.documentElement.scrollHeight':'0'})`);
    await sleep(200);
    const suffix=screen.list?'-lista':'';
    const dialogSuffix=screen.content==='.ops-dialog'?'-modal':'';
    await shot(`${id}${suffix}${dialogSuffix}-${LABEL}-${width}-${theme}.jpg`,{beyond:!screen.content?.includes('ops-dialog')});
    const metrics=await probe();
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
