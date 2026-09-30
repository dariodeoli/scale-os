/*
 * Capturas de evidencia del aviso de privacidad en los puntos de captura FIN
 * (Ley 7593/2025, issue #116): salario y ajuste de Previsión, comisión, pago y
 * descuento de Comisiones, y cuenta/cobro de Finanzas; claro/oscuro 1440/390.
 *
 * Requiere el stack local (`e2e-fin-stack.mjs`) y el build de Next.
 * Uso: node build-tools/visual-harness/capture-fin-pdp.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const sessionFile=resolve(here,'../../work/visual-harness/fin-qa-session.txt');
const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const OUT=resolve(here,'../../docs/qa/fin-pdp-116');
mkdirSync(OUT,{recursive:true});

const surfaces=[
 {name:'prevision-salario',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]',open:{titlePrefix:'Editar salario'},dialog:'Salario fijo mensual'},
 {name:'prevision-ajuste',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]',open:{titlePrefix:'Ajuste del mes'},dialog:'Ajuste del mes'},
 {name:'comisiones-nueva',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]',open:{text:'Comisión',exact:true},dialog:'Nueva comisión o referido'},
 {name:'comisiones-pago',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]',open:{tab:'Comisiones',tabScope:'section[aria-label="Comisiones y referidos"]',text:'Registrar pago'},dialog:'Registrar pago'},
 {name:'comisiones-descuento',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]',open:{tab:'Descuentos',text:'Nuevo descuento'},dialog:'Descuento por referido'},
 {name:'finanzas-cuenta',route:'/pagos',marker:'section[aria-label="Finanzas"]',open:{text:'Cuenta',exact:true,scroll:true},dialog:'Nueva cuenta'},
 {name:'finanzas-cobro',route:'/pagos',marker:'section[aria-label="Finanzas"]',open:{text:'Registrar cobro'},dialog:'Registrar cobro'},
];

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
const shot=async(file)=>{
 const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:false});
 writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
 console.log(file);
};

const clickButton=async({text,exact,titlePrefix,scroll,scope})=>{
 const found=await evaluate(`(()=>{
  const root=${scope?`document.querySelector(${JSON.stringify(scope)})||document`:'document'};
  const buttons=[...root.querySelectorAll('button')];
  const match=buttons.find(button=>{
   const content=(button.textContent||'').replace(/\\s+/g,' ').trim();
   const title=button.getAttribute('title')||button.getAttribute('aria-label')||'';
   if(${JSON.stringify(Boolean(titlePrefix))})return title.startsWith(${JSON.stringify(titlePrefix||'')});
   return ${JSON.stringify(Boolean(exact))}?content===${JSON.stringify(text||'')}:content.includes(${JSON.stringify(text||'')});
  });
  const visible=match&&match.getClientRects().length>0&&!match.disabled;
  if(visible){${scroll?'match.scrollIntoView({block:"center"});':''}match.click();}
  return visible;
 })()`);
 return found;
};

try{
 await send('Page.enable');await send('Runtime.enable');
 await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE,path:'/'});
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const width of (process.env.QA_WIDTHS||'1440,390').split(',').map(Number)){
   const mobile=width<768;
   await send('Emulation.setDeviceMetricsOverride',{width,height:mobile?844:900,deviceScaleFactor:1,mobile:false});
   for(const surface of surfaces){
    if(process.env.QA_ONLY&&!surface.name.includes(process.env.QA_ONLY))continue;
    try{
     await send('Page.navigate',{url:BASE+surface.route});
     await waitFor(`document.querySelector(${JSON.stringify(surface.marker)})`,{timeout:60000,label:`${surface.name} ${width}`});
     await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
     await sleep(600);
     if(surface.open.tab){
      const tabbed=await clickButton({text:surface.open.tab,scope:surface.open.tabScope||surface.marker});
      if(!tabbed)throw new Error(`no se encontró la pestaña ${surface.open.tab}`);
      await sleep(400);
     }
     if(!await clickButton(surface.open))throw new Error(`no se encontró el disparador ${JSON.stringify(surface.open)}`);
     await waitFor(`document.querySelector('section[role="dialog"]')`,{timeout:15000,label:`${surface.dialog} ${width}`});
     const title=await evaluate(`document.querySelector('section[role="dialog"] h2')?.textContent||''`);
     if(!title.includes(surface.dialog))throw new Error(`diálogo inesperado: ${title}`);
     await evaluate('window.scrollTo(0,0)');
     await evaluate(`(()=>{const body=document.querySelector('section[role="dialog"] .dialog-body');if(body)body.scrollTop=body.scrollHeight;return true;})()`);
     await sleep(500);
     await shot(`${surface.name}-${width}-${theme}.jpg`);
     await evaluate(`(()=>{const close=document.querySelector('section[role="dialog"] button[aria-label="Cerrar"]');if(close)close.click();return true;})()`);
     await sleep(350);
    }catch(error){
     console.log(`FALLO ${surface.name} ${width} ${theme}: ${error.message}`);
    }
   }
  }
 }
 console.log('capturas en',OUT);
}finally{
 cdp.send('Page.close').catch(()=>undefined);
 chrome.process?.kill?.('SIGKILL');
}
process.exit(0);
