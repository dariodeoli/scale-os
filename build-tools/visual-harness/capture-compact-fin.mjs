/*
 * Capturas de la compactación FIN (#95): 1440×900 y 390×844, claro/oscuro,
 * antes (main) y después (rama), por pantalla. Además deja una medición de los
 * bloques que quedan arriba del pliegue para comparar el antes/después.
 *
 * Requiere el stack local (`e2e-fin-stack.mjs`) y el build de `next start`.
 * Uso: QA_LABEL=antes|despues node build-tools/visual-harness/capture-compact-fin.mjs
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
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/compact-fin');
const LABEL=process.env.QA_LABEL||'despues';
mkdirSync(OUT,{recursive:true});

const screens=[
 {slug:'finanzas',route:'/pagos',marker:'section[aria-label="Finanzas"]'},
 {slug:'mora',route:'/pagos/mora',marker:'section[aria-label="Cobranza y mora"]'},
 {slug:'prevision',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]'},
 {slug:'informes',route:'/informes',marker:'section[aria-label="Reportes de la agencia"]'},
 {slug:'comisiones',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]'},
];
const viewports=[{width:1440,height:900},{width:390,height:844}];

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

// Bloques directos de la sección con su altura y si arrancan dentro del pliegue.
const blocks=(marker)=>evaluate(`(()=>{const section=document.querySelector(${JSON.stringify(marker)});if(!section)return [];return [...section.children].filter(el=>el.getBoundingClientRect().height>0).map(el=>{const box=el.getBoundingClientRect();const label=(el.getAttribute('aria-label')||el.querySelector('h1,h2,h3')?.textContent||el.className||el.tagName).toString().trim().slice(0,56);return {label,top:Math.round(box.top),height:Math.round(box.height),aboveTheFold:box.top<window.innerHeight};});})()`);

try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
  const report={};
  for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
    for(const viewport of viewports){
      await send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:viewport.width<768});
      for(const screen of screens){
        await send('Page.navigate',{url:BASE+screen.route});
        await waitFor(`document.querySelector(${JSON.stringify(screen.marker)})`,{label:`${screen.slug} (${viewport.width} ${theme})`});
        await sleep(1300);
        await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
        await sleep(300);
        const file=`${screen.slug}-${LABEL}-${viewport.width}x${viewport.height}-${theme}.jpg`;
        const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:80});
        writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
        report[`${screen.slug}-${theme}-${viewport.width}`]=await blocks(screen.marker);
        console.log(`${file}`);
      }
    }
  }
  writeFileSync(resolve(OUT,`blocks-${LABEL}.json`),JSON.stringify(report,null,1));
  console.log(`Capturas y mediciones en ${OUT}`);
}finally{
  cdp.close();
  chrome.process?.kill?.('SIGKILL');
  process.exit(0);
}
