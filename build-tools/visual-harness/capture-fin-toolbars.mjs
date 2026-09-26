/*
 * Capturas de las toolbars de Finanzas (Cobros pendientes) y Mora (filtros)
 * antes/después de adoptar el SearchField de la librería (ronda 20, #75).
 *
 * Uso: SESSION=<cookie demo> BASE_URL=https://app.scaleparaguay.com QA_LABEL=antes \
 *      node build-tools/visual-harness/capture-fin-toolbars.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const BASE=(process.env.BASE_URL||'https://app.scaleparaguay.com').replace(/\/$/,'');
const LABEL=process.env.QA_LABEL||'run';
const SESSION=process.env.SESSION||(readFileSync(resolve(here,'../../work/prod-fin-session.txt'),'utf8').match(/[a-f0-9]{64}/)||[])[0];
if(!SESSION)throw new Error('Falta SESSION');
const OUT=resolve(here,`../../work/visual-harness/adopcion-fin-${LABEL}`);
mkdirSync(OUT,{recursive:true});

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};

const inputOf=(marker)=>`(()=>{const section=document.querySelector(${JSON.stringify(marker)});return section?section.querySelector('input[placeholder^="Buscar"],input[placeholder^="Número"]'):null;})()`;

await send('Page.enable');await send('Runtime.enable');
await send('Network.setCookie',{name:'scale_session',value:SESSION,url:BASE,domain:BASE.includes('scaleparaguay')?'.scaleparaguay.com':undefined,path:'/'});

const screens=[
 {name:'finanzas',route:'/pagos',marker:'section[aria-label="Finanzas"]'},
 {name:'mora',route:'/pagos/mora',marker:'section[aria-label="Cobranza y mora"]'},
];
for(const theme of ['light','dark']){
 for(const screen of screens){
  for(const width of [1440,390]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
   await send('Page.navigate',{url:BASE+screen.route});
   await waitFor(`document.querySelector(${JSON.stringify(screen.marker)})`,{timeout:60000,label:`${screen.name} ${width}`});
   await waitFor(inputOf(screen.marker),{timeout:60000,label:`${screen.name} buscador`}).catch(()=>null);
   await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
   await sleep(700);
   const rect=await evaluate(`(()=>{const input=${inputOf(screen.marker)};if(!input)return null;const bar=input.closest('div.mb-4')||input.closest('form')||input.parentElement.parentElement;const r=bar.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,${width}),height:Math.min(r.height+16,320)};})()`);
   if(!rect){console.log(`sin toolbar ${screen.name} ${width} ${theme}`);continue;}
   const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:80,captureBeyondViewport:true,clip:{...rect,scale:1}});
   writeFileSync(resolve(OUT,`${screen.name}-${width}-${theme}.jpg`),Buffer.from(data,'base64'));
   console.log(`${screen.name} ${width} ${theme} rect=${rect.width}x${rect.height}`);
  }
 }
}
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:BASE+'/pagos'});
await waitFor(inputOf('section[aria-label="Finanzas"]'),{timeout:60000,label:'html buscador'});
const html=await evaluate(`(()=>{const input=${inputOf('section[aria-label="Finanzas"]')};const host=input.closest('div.relative')||input.parentElement;return host.outerHTML;})()`);
writeFileSync(resolve(OUT,'searchfield.html'),html);
console.log(html.slice(0,700));
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(0);
