/*
 * Capturas de «Salarios» (#88): antes/después del avatar de la lista de
 * Previsión y del panel nuevo de Finanzas, en claro/oscuro y 1440/390.
 *
 * Requiere el stack local (`e2e-fin-stack.mjs`) — sirve tanto contra la rama
 * con el cambio (`QA_LABEL=despues`) como contra `main` (`QA_LABEL=antes`).
 * Con `QA_STATES=1` simula con CDP los estados de carga y error del panel.
 *
 * Uso:
 *   QA_LABEL=despues QA_STATES=1 node build-tools/visual-harness/capture-salarios.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const sessionFile=resolve(here,'../../work/visual-harness/fin-qa-session.txt');
const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/salarios');
const LABEL=process.env.QA_LABEL||'despues';
const STATES=process.env.QA_STATES==='1';
mkdirSync(OUT,{recursive:true});

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{
  const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
  return result.value;
};
const sleep=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{
  const start=Date.now();
  while(Date.now()-start<timeout){
    try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}
    await sleep(250);
  }
  throw new Error(`timeout esperando ${label||expression}`);
};
const shot=async(file,clip,scale=2)=>{
  const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:true,...(clip?{clip:{...clip,scale}}:{})});
  writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
  console.log(`${file}${clip?` (recorte ×${scale})`:''}`);
};
// Los avatares usan `loading="lazy"`: sin recorrer la página, las fotos de abajo
// no se decodifican y la captura las muestra vacías. Se recorre y se vuelve.
const warmImages=async()=>{
  await evaluate(`(async()=>{const step=Math.max(400,Math.round(window.innerHeight*0.8));for(let y=0;y<=document.body.scrollHeight;y+=step){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,500));return true;})()`);
};
const rectOf=(selector)=>evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return null;const box=element.getBoundingClientRect();if(!box.width||!box.height)return null;return {x:Math.max(0,Math.floor(box.left+window.scrollX)-8),y:Math.max(0,Math.floor(box.top+window.scrollY)-8),width:Math.ceil(box.width)+16,height:Math.ceil(box.height)+16};})()`);
const firstVisible=async(selectors)=>{
  for(const selector of selectors){
    const rect=await rectOf(selector);
    if(rect)return {selector,rect};
  }
  return null;
};

// Intercepción opcional para los estados del panel (solo en la rama nueva).
let forecastMode='pass';
cdp.on('Fetch.requestPaused',async event=>{
  if(!/\/api\/agency\/forecast/.test(event.request.url)){await send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>undefined);return;}
  if(forecastMode==='hang')return; // deja la promesa pendiente: el panel queda cargando
  if(forecastMode==='fail'){await send('Fetch.failRequest',{requestId:event.requestId,errorReason:'ConnectionFailed'}).catch(()=>undefined);return;}
  await send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>undefined);
});

try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
  if(STATES)await send('Fetch.enable',{patterns:[{urlPattern:'*/api/agency/forecast*',requestStage:'Request'}]});
  for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
    for(const width of (process.env.QA_WIDTHS||'1440,390').split(',').map(Number)){
      const mobile=width<768;
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile});
      await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);

      // Previsión: lista de salarios (avatar) — soporta el nombre viejo para el «antes».
      await send('Page.navigate',{url:BASE+'/pagos/prevision'});
      await waitFor(`document.querySelector('section[aria-label="Previsión financiera"]')`,{label:`Previsión (${width} ${theme})`});
      await sleep(1200);
      await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
      await warmImages();
      await sleep(250);
      await shot(`prevision-${LABEL}-${width}-${theme}.jpg`);
      const avatar=await firstVisible(mobile
        ? ['div[aria-label="Salarios"]','div[aria-label="Personal proyectado"]']
        : ['[role="table"][aria-label="Salarios"]','[role="table"][aria-label="Personal proyectado"]']);
      if(avatar)await shot(`avatar-${LABEL}-${width}-${theme}.jpg`,avatar.rect);
      else console.log(`sin lista de salarios en ${width} ${theme} (¿main sin renombrar?)`);
      // Zoom de la primera identidad: deja ver el recorte del wrapper (antes) y
      // el círculo completo (después).
      const identity=await firstVisible(mobile
        ? ['div[aria-label="Salarios"] article > div:first-child','div[aria-label="Personal proyectado"] article > div:first-child']
        : ['.forecast-person-who']);
      if(identity)await shot(`avatar-zoom-${LABEL}-${width}-${theme}.jpg`,identity.rect,5);

      // Finanzas: panel «Salarios» (no existe en el «antes»).
      forecastMode='pass';
      await send('Page.navigate',{url:BASE+'/pagos'});
      await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{label:`Finanzas (${width} ${theme})`});
      await sleep(1200);
      await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
      await warmImages();
      await sleep(250);
      await shot(`finanzas-${LABEL}-${width}-${theme}.jpg`);
      const panel='section[aria-labelledby="finance-salaries-title"]';
      const panelRect=await rectOf(panel);
      if(panelRect){
        await shot(`panel-salarios-${LABEL}-${width}-${theme}.jpg`,panelRect);
        if(STATES){
          // Cargando: la petición de la previsión queda pendiente y el panel muestra su esqueleto.
          forecastMode='hang';
          await send('Page.navigate',{url:BASE+'/pagos'});
          await waitFor(`document.querySelector(${JSON.stringify(panel)})`,{label:`panel cargando (${width} ${theme})`});
          await sleep(900);
          await evaluate(`(()=>{document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
          await shot(`panel-salarios-cargando-${LABEL}-${width}-${theme}.jpg`,await rectOf(panel)||panelRect);
          // Error: falla la petición y el panel muestra el aviso con reintento.
          forecastMode='fail';
          await send('Page.navigate',{url:BASE+'/pagos'});
          await waitFor(`document.body.innerText.includes('No se pudo cargar el gasto del personal')`,{label:`panel error (${width} ${theme})`});
          await sleep(500);
          await evaluate(`(()=>{document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
          await shot(`panel-salarios-error-${LABEL}-${width}-${theme}.jpg`,await rectOf(panel)||panelRect);
          forecastMode='pass';
        }
      }else console.log(`sin panel de salarios en ${width} ${theme} (¿main sin panel?)`);
    }
  }
  console.log(`Capturas en ${OUT}`);
}finally{
  await send('Fetch.disable').catch(()=>undefined);
  cdp.close();
  chrome.process?.kill?.('SIGKILL');
  process.exit(0);
}
