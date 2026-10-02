/*
 * Capturas antes/después de la auditoría demo FIN (#142): Finanzas (primer
 * pliegue y tabs de historial) e Informes («Sin comparación» breve).
 *
 * Requiere `e2e-fin-stack.mjs` (sesión en work/visual-harness/fin-qa-session.txt)
 * y el build de Next. Uso: QA_LABEL=antes|despues node .../qa-fin-142.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const session=Object.fromEntries(readFileSync(resolve(here,'../../work/visual-harness/fin-qa-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const LABEL=process.env.QA_LABEL||'antes';
const OUT=resolve(here,`../../docs/qa/qa-fin-142/${LABEL}`);
mkdirSync(OUT,{recursive:true});

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=60000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const shot=async name=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82});writeFileSync(resolve(OUT,`${name}.jpg`),Buffer.from(data,'base64'));console.log(`${LABEL}/${name}.jpg`);};
const setTheme=theme=>evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
const clickText=(scope,text)=>evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(scope)});const button=[...root.querySelectorAll('button')].find(el=>(el.textContent||'').trim()===${JSON.stringify(text)}&&el.getBoundingClientRect().height>0);if(!button)return false;button.click();return true;})()`);
const tabPorTexto=text=>evaluate(`(()=>{const button=[...document.querySelectorAll('button[role="tab"]')].find(el=>(el.textContent||'').includes(${JSON.stringify(text)}));if(!button)return false;button.click();return true;})()`);

try{
 await send('Page.enable');await send('Runtime.enable');
 await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE,path:'/'});
 // Finanzas · primer pliegue, claro/oscuro 1440 y 390.
 for(const [width,height,theme] of [[1440,900,'light'],[1440,900,'dark'],[390,844,'light'],[390,844,'dark']]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:BASE+'/pagos'});
  await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{label:'Finanzas'});
  await setTheme(theme);await sleep(900);
  await evaluate(`window.scrollTo(0,0)`);
  await shot(`finanzas-pliegue-${width}-${theme}`);
 }
 // Historial: tabs (si existen) o la parte baja de la página con recortes.
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:BASE+'/pagos'});
 await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{label:'Finanzas historial'});
 await setTheme('light');await sleep(900);
 await evaluate(`(()=>{const tab=[...document.querySelectorAll('button[role="tab"]')].find(el=>(el.textContent||'').includes('Transferencias'));if(tab)tab.scrollIntoView({block:'start'});else document.querySelector('#finance-transfers-title')?.scrollIntoView({block:'start'});return true;})()`);
 await sleep(600);
 await shot('finanzas-historial-transferencias-1440-light');
 if(await tabPorTexto('Cobros registrados')){await sleep(600);await shot('finanzas-historial-cobros-1440-light');}
 if(await tabPorTexto('Movimientos')){await sleep(800);await shot('finanzas-historial-movimientos-1440-light');}
 // Informes · comparación.
 for(const [width,height,theme] of [[1440,900,'light'],[1440,900,'dark'],[390,844,'light'],[390,844,'dark']]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:BASE+'/informes'});
  await waitFor(`document.querySelector('section[aria-label="Reportes de la agencia"]')`,{label:'Informes'});
  await setTheme(theme);await sleep(1100);
  await evaluate(`(()=>{const target=[...document.querySelectorAll('h3,p')].find(el=>{const text=el.textContent||'';return text.includes('Comparativa del período visible')||text.includes('Sin comparación: no hay período anterior');});if(target)target.scrollIntoView({block:'center'});return true;})()`);
  await sleep(500);
  await shot(`informes-comparacion-${width}-${theme}`);
 }
}finally{
 cdp.send('Page.close').catch(()=>undefined);
 chrome.process?.kill?.('SIGKILL');
}
process.exit(0);
