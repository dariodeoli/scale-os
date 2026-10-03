/*
 * Evidencia UI de SSO Fase 1 (#159): login con Google + Microsoft + Apple a
 * 390/1440 en claro y oscuro. Requiere el stack local (e2e-plt-stack.mjs) con
 * MICROSOFT_* y APPLE_* configurados (valores ficticios alcanzan: los botones
 * se dibujan con proveedores "configurados").
 *
 * Uso: node work/sso-159/capture-sso.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const session=Object.fromEntries(readFileSync(resolve(repo,"work/visual-harness",process.env.QA_SESSION||'plt-qa2-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const OUT=resolve(repo,"docs/qa/sso-159/capturas");
mkdirSync(OUT,{recursive:true});
const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async expression=>{
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
 return result.value;
};
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const waitFor=async(expression,{timeout=30000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(200);}throw new Error(`timeout ${label||expression}`);};
const results=[];
try{
 await send('Page.enable');await send('Runtime.enable');
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const [width,height] of (process.env.QA_SIZES||'390x844,1440x900').split(',').map(size=>size.split('x').map(Number))){
   await send('Network.clearBrowserCookies');
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768,screenWidth:width,screenHeight:height});
   await send('Page.navigate',{url:`${BASE}/`});
   await waitFor(`document.querySelector('[data-provider="google"], .google-login-button')`,{label:'login'});
   await waitFor(`document.querySelector('[data-provider="microsoft"]')&&document.querySelector('[data-provider="apple"]')`,{label:'proveedores Microsoft/Apple'});
   await sleep(500);
   await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
   await evaluate(`document.querySelector('[data-provider="microsoft"]')?.scrollIntoView({block:'center'})`);
   await sleep(250);
   const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:true});
   const file=`login-sso-${width}-${theme}.jpg`;
   writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
   const labels=await evaluate(`[...document.querySelectorAll('[data-provider]')].map(node=>node.textContent.trim())`);
   const overflow=await evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth+1');
   console.log(`${file} · proveedores=${JSON.stringify(labels)} · overflow=${overflow?'SÍ':'no'}`);
   results.push({file,width,theme,labels,overflow});
  }
 }
 writeFileSync(resolve(OUT,'resumen.json'),JSON.stringify(results,null,1));
 console.log('Capturas en',OUT);
}finally{
 cdp.close();await chrome.close?.();
}
