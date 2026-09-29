/*
 * Capturas y medición de «Equipo · Personas» (#110): el nombre debe verse
 * completo en la vista Lista (y en tarjeta/móvil) sin cortarse con ellipsis
 * cuando sobra ancho. Antes/después en claro/oscuro y 1440×900 / 390×844.
 *
 * Requiere el stack local ya levantado (API + front + proxy) y el artifact del
 * branch a capturar:
 *   QA_SESSION=plt-qa-session.txt QA_LABEL=antes  node build-tools/visual-harness/capture-equipo-nombres.mjs
 *   QA_SESSION=plt-qa-session.txt QA_LABEL=despues node build-tools/visual-harness/capture-equipo-nombres.mjs
 *
 * La medición por fila compara `scrollWidth` contra `clientWidth` del nombre: si
 * el nombre se corta, `nameCut` es true. El JSON de métricas queda junto a las
 * capturas para el README de docs/qa/equipo-nombres.
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
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/equipo-nombres');
const LABEL=process.env.QA_LABEL||'despues';
mkdirSync(OUT,{recursive:true});

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async expression=>{
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
 console.log(file);
};
const warmImages=async()=>{
 await evaluate(`(async()=>{const step=Math.max(400,Math.round(window.innerHeight*0.8));for(let y=0;y<=document.body.scrollHeight;y+=step){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,400));return true;})()`);
};
const rectOf=selector=>evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return null;const box=element.getBoundingClientRect();if(!box.width||!box.height)return null;return {x:Math.max(0,Math.floor(box.left+window.scrollX)-8),y:Math.max(0,Math.floor(box.top+window.scrollY)-8),width:Math.ceil(box.width)+16,height:Math.ceil(box.height)+16};})()`);

// Mide el corte real de cada nombre: `scrollWidth > clientWidth` significa ellipsis.
const measure=()=>evaluate(`(()=>{
 const grid=document.querySelector('.ops-grid-list,.ops-grid');
 const rows=[...document.querySelectorAll('.person-hub-card')];
 const names=rows.map(row=>{
  const el=row.querySelector('.person-container-name'),sec=row.querySelector('.person-container-secondary');
  const rect=el?el.getBoundingClientRect():null;
  return {name:el?el.textContent.trim():'',width:rect?Math.round(rect.width):0,scroll:el?el.scrollWidth:0,client:el?el.clientWidth:0,cut:el?el.scrollWidth>el.clientWidth+1:false,cargo:sec?sec.textContent.trim():'',cargoCut:sec?sec.scrollWidth>sec.clientWidth+1:false,title:el?el.getAttribute('title')||'':''};
 });
 const mail=rows.map(row=>row.querySelector('.person-hub-mail')).filter(Boolean);
 const style=grid?getComputedStyle(grid):null;
 return {rows:rows.length,names,cols:style?style.getPropertyValue('--person-cols').trim():'',template:style?style.gridTemplateColumns:'',gridWidth:grid?Math.round(grid.getBoundingClientRect().width):0,mailSize:mail.length,mailCut:mail.filter(el=>el.scrollWidth>el.clientWidth+1).length,mailTitled:mail.filter(el=>el.title).length};
})()`);

const measurements=[];
// La preferencia de vista y el tema viven en localStorage: se fijan ya en el
// origen real (no en about:blank) y recién después se navega a la pantalla.
const openEquipo=async({view,theme,width,height,label})=>{
 const mobile=width<768;
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
 await send('Page.navigate',{url:BASE+'/equipo'});
 await waitFor(`document.querySelector('.team-filters')||document.body.innerText.includes('Cerrar sesión')`,{label:`Equipo base (${label})`});
 await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)});localStorage.setItem('scale:team-view',${JSON.stringify(view)});}catch{};return true;})()`);
 await send('Page.navigate',{url:BASE+'/equipo'});
 await waitFor(view==='list'?`document.querySelector('.person-hub-card.is-list')||document.body.innerText.includes('Todavía no hay personas')`:`document.querySelector('.person-hub-card:not(.is-list)')||document.body.innerText.includes('Todavía no hay personas')`,{label:`Equipo ${view} (${label})`});
 await warmImages();
 await evaluate(`(()=>{document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
 await sleep(300);
};
try{
 await send('Page.enable');await send('Runtime.enable');
 await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const [width,height] of (process.env.QA_SIZES||'1440x900,390x844').split(',').map(size=>size.split('x').map(Number))){
   await openEquipo({view:'list',theme,width,height,label:`${width} ${theme}`});
   const data=await measure();
   measurements.push({label:LABEL,view:'list',width,height,theme,...data});
   await shot(`equipo-lista-${LABEL}-${width}-${theme}.jpg`);
   const list=await rectOf('.ops-grid-list');
   const head=await rectOf('.person-hub-head-row');
   if(list&&head)await shot(`equipo-lista-encabezado-filas-${LABEL}-${width}-${theme}.jpg`,{x:list.x,y:head.y,width:list.width,height:Math.min(list.height,head.height+4*48+24)});
  }
 }
 // Vista tarjeta (la otra densidad): se revisa que el nombre no se corte con ancho de sobra.
 for(const [width,height] of (process.env.QA_SIZES||'1440x900,390x844').split(',').map(size=>size.split('x').map(Number))){
  await openEquipo({view:'cards',theme:'light',width,height,label:`${width} light`});
  const data=await measure();
  measurements.push({label:LABEL,view:'cards',width,height,theme:'light',...data});
  await shot(`equipo-tarjeta-${LABEL}-${width}-light.jpg`);
 }
 const cut=measurements.filter(entry=>entry.view==='list').reduce((total,entry)=>total+entry.names.filter(name=>name.cut).length,0);
 console.log(`Nombres cortados (vista lista, suma de todas las pasadas): ${cut}`);
 console.log(`Métricas en ${OUT}/metricas-${LABEL}.json`);
 writeFileSync(resolve(OUT,`metricas-${LABEL}.json`),JSON.stringify(measurements,null,1));
}catch(error){
 console.error(error.stack||error);
 process.exitCode=1;
}finally{
 cdp.close();
 await chrome.close?.();
 process.exit(process.exitCode||0);
}
