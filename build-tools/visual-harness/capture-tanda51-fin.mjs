/*
 * Capturas de la tanda §15 FIN (#87): pantallas clave en claro/oscuro y móvil.
 *
 * Requiere el stack local (`e2e-fin-stack.mjs`) corriendo y el build de
 * `next start` ya hecho. Deja JPG en `docs/qa/tanda51-fin/`.
 *
 * Uso: node build-tools/visual-harness/capture-tanda51-fin.mjs
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
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/tanda51-fin');
const widthArg=process.env.QA_WIDTHS||'1440,390';
const themeArg=process.env.QA_THEMES||'light,dark';
const screenArg=process.env.QA_SCREENS||'';
// QA_LABEL=error permite capturar las ramas de error (con el API caído).
const label=process.env.QA_LABEL||'';
mkdirSync(OUT,{recursive:true});

const screens=[
 {slug:'finanzas',route:'/pagos',marker:'section[aria-label="Finanzas"]'},
 {slug:'mora',route:'/pagos/mora',marker:'section[aria-label="Cobranza y mora"]'},
 {slug:'prevision',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]'},
 {slug:'informes',route:'/informes',marker:'section[aria-label="Reportes de la agencia"]'},
 {slug:'comisiones',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]'},
].filter(screen => !screenArg || screenArg.split(',').includes(screen.slug));

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

try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
  for(const theme of themeArg.split(',')){
    for(const width of widthArg.split(',').map(Number)){
      const mobile=width<768;
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:mobile?2:1,mobile});
      for(const screen of screens){
        await send('Page.navigate',{url:BASE+screen.route});
        await waitFor(`document.querySelector(${JSON.stringify(screen.marker)})`,{label:`${screen.slug} (${width} ${theme})`});
        await sleep(1400);
        await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return document.documentElement.dataset.theme;})()`);
        await sleep(350);
        const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:true});
        const file=resolve(OUT,`${screen.slug}${label?`-${label}`:''}-${width}-${theme}.jpg`);
        writeFileSync(file,Buffer.from(data,'base64'));
        console.log(`${screen.slug} ${width} ${theme} -> ${file}`);
      }
    }
  }
  console.log(`Capturas en ${OUT}`);
}finally{
  cdp.close();
  chrome.process?.kill?.('SIGKILL');
  process.exit(0);
}
