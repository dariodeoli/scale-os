/*
 * Capturas de «Equipo compacto» (#92): antes/después de la cabecera de Personas
 * (título repetido, franja de facturación y barra de controles) en claro/oscuro
 * y 1440×900 / 390×844.
 *
 * Requiere el stack local (e2e-fin-stack.mjs con puertos propios) y el artifact
 * del branch a capturar:
 *   PG_BIN=/opt/homebrew/opt/postgresql@17/bin PG_DIR=/tmp/plt-e2e-pg-SOS-PLT \
 *   PG_PORT=55455 API_PORT=3923 FRONT_PORT=3040 PROXY_PORT=3041 \
 *   QA_SESSION=plt-qa-session.txt node build-tools/visual-harness/e2e-fin-stack.mjs
 *   QA_LABEL=despues node build-tools/visual-harness/capture-compact-equipo.mjs
 *
 * `QA_BILLING=sin` inyecta una respuesta sin contratos activos para capturar el
 * chip; sin la variable se muestra la respuesta real de la demo (con contratos).
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
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/compact-equipo');
const LABEL=process.env.QA_LABEL||'despues';
const BILLING=process.env.QA_BILLING||'real';
const measurements=[];
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
const waitFor=async(expression,{timeout=60000,label=''}={})=>{
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
const warmImages=async()=>{
 await evaluate(`(async()=>{const step=Math.max(400,Math.round(window.innerHeight*0.8));for(let y=0;y<=document.body.scrollHeight;y+=step){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,400));return true;})()`);
};
const rectOf=(selector)=>evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return null;const box=element.getBoundingClientRect();if(!box.width||!box.height)return null;return {x:Math.max(0,Math.floor(box.left+window.scrollX)-8),y:Math.max(0,Math.floor(box.top+window.scrollY)-8),width:Math.ceil(box.width)+16,height:Math.ceil(box.height)+16};})()`);

// Respuesta sintética del centro de control sin contratos (para el chip) o con
// contratos (para el Kpi), solo en la rama nueva.
cdp.on('Fetch.requestPaused',async event=>{
 if(!/\/api\/agency\/control-center/.test(event.request.url)){await send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>undefined);return;}
 if(BILLING==='real'){await send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>undefined);return;}
 const records=BILLING==='con'?[{currency:'PYG',net_monthly:'3500000.00'},{currency:'USD',net_monthly:'600.00'}]:[];
 const body=Buffer.from(JSON.stringify({active_clients:8,active_prospects:3,contracted_billing:{available:true,records}})).toString('base64');
 await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body}).catch(()=>undefined);
});

try{
 await send('Page.enable');await send('Runtime.enable');
 await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
 if(BILLING!=='real')await send('Fetch.enable',{patterns:[{urlPattern:'*/api/agency/control-center*',requestStage:'Request'}]});
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const [width,height] of (process.env.QA_SIZES||'1440x900,390x844').split(',').map(size=>size.split('x').map(Number))){
   const mobile=width<768;
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
   await send('Page.navigate',{url:BASE+'/equipo'});
   await waitFor(`document.querySelector('.team-filters')&&(document.querySelector('.person-hub-card')||document.body.innerText.includes('Todavía no hay personas'))`,{label:`Equipo (${width} ${theme})`});
   await sleep(1200);
   await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
   await warmImages();
   await sleep(250);
   await shot(`equipo-${LABEL}${BILLING==='real'?'':'-'+BILLING+'-contratos'}-${width}-${theme}.jpg`);
   // Zoom de la franja de facturación y de la barra de controles (evidencia del cambio).
   const strip=await rectOf('.team-billing-strip,.team-billing-note,.kpi-strip');
   if(strip)await shot(`facturacion-${LABEL}${BILLING==='real'?'':'-'+BILLING+'-contratos'}-${width}-${theme}.jpg`,strip);
   const bar=await rectOf('.team-filters');
   if(bar)await shot(`barra-${LABEL}-${width}-${theme}.jpg`,bar);
   // Cuánto contenido útil entra en el pliegue: distancia a la primera persona y
   // tarjetas completas visibles sin scroll.
   const metrics=await evaluate(`(()=>{const first=document.querySelector('.person-hub-card');const cards=[...document.querySelectorAll('.person-hub-card')];const bar=document.querySelector('.team-filters');const height=window.innerHeight;return {barTop:bar?Math.round(bar.getBoundingClientRect().top):null,cardTop:first?Math.round(first.getBoundingClientRect().top):null,tarjetasVisibles:cards.filter(card=>{const box=card.getBoundingClientRect();return box.top>=0&&box.bottom<=height;}).length};})()`);
   console.log(`métricas ${width}×${height} ${theme}:`,JSON.stringify(metrics));
   measurements.push({label:LABEL,billing:BILLING,width,height,theme,...metrics});
  }
 }
console.log(`Capturas en ${OUT}`);
writeFileSync(resolve(OUT,`metricas-${LABEL}${BILLING==='real'?'':'-'+BILLING+'-contratos'}.json`),JSON.stringify(measurements,null,1));
}catch(error){
 console.error(error.stack||error);
 process.exitCode=1;
}finally{
 await send('Fetch.disable').catch(()=>undefined);
 cdp.close();
 await chrome.close?.();
 process.exit(process.exitCode||0);
}
