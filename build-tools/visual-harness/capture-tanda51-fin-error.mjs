/*
 * Capturas de los estados de error de FIN (#87): simula fallos de API con
 * intercepción CDP (Fetch.failRequest) sin tocar el backend, para dejar
 * evidencia de que cada pantalla dice qué pasó y ofrece salida.
 *
 * Requiere el stack local (`e2e-fin-stack.mjs`) y el build de `next start`.
 * Uso: node build-tools/visual-harness/capture-tanda51-fin-error.mjs
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
mkdirSync(OUT,{recursive:true});

// Cada pantalla falla en las llamadas que alimentan sus bloques; el resto del
// shell sigue funcionando para que el estado visible sea el de la sección.
const screens=[
 {slug:'finanzas',route:'/pagos',marker:'section[aria-label="Finanzas"]',expect:'No se pudieron cargar las finanzas',
  fail:[/\/api\/agency\/accounts/,/\/api\/agency\/invoices/,/\/api\/agency\/payments/,/\/api\/agency\/transfers/,/\/api\/agency\/custodians/]},
 {slug:'mora',route:'/pagos/mora',marker:'section[aria-label="Cobranza y mora"]',expect:'No se pudo cargar la cobranza',
  fail:[/\/api\/agency\/client-payment-status/,/\/api\/agency\/reports/]},
 {slug:'prevision',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]',expect:'No se pudo cargar la previsión',
  fail:[/\/api\/agency\/forecast/]},
 {slug:'informes',route:'/informes',marker:'section[aria-label="Reportes de la agencia"]',expect:'No se pudo cargar el reporte',
  fail:[/\/api\/agency\/reports/]},
 {slug:'comisiones',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]',expect:'No se pudieron cargar los egresos',
  fail:[/\/api\/agency\/commissions/,/\/api\/agency\/payouts/,/\/api\/agency\/referral-discounts/]},
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

let activeFails=[];
cdp.on('Fetch.requestPaused',async event=>{
  const url=event.request.url;
  const shouldFail=event.request.method==='GET'&&activeFails.some(pattern=>pattern.test(url));
  try{
    if(shouldFail)await send('Fetch.failRequest',{requestId:event.requestId,errorReason:'ConnectionFailed'});
    else await send('Fetch.continueRequest',{requestId:event.requestId});
  }catch{}
});

try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
  await send('Fetch.enable',{patterns:[{urlPattern:'*/api/agency/*',requestStage:'Request'}]});
  for(const width of (process.env.QA_WIDTHS||'1440,390').split(',').map(Number)){
    const mobile=width<768;
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:mobile?2:1,mobile});
    for(const screen of screens){
      activeFails=screen.fail;
      await send('Page.navigate',{url:BASE+screen.route});
      // El error puede reemplazar el contenedor de la sección (early return),
      // así que la señal es el texto honesto del estado, no el marcador.
      await waitFor(`document.body.innerText.includes(${JSON.stringify(screen.expect)})`,{label:`estado de error de ${screen.slug} (${width})`});
      await sleep(600);
      const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:true});
      const file=resolve(OUT,`${screen.slug}-error-${width}-light.jpg`);
      writeFileSync(file,Buffer.from(data,'base64'));
      console.log(`${screen.slug} error ${width} -> ${file}`);
    }
  }
  console.log(`Capturas de error en ${OUT}`);
}finally{
  await send('Fetch.disable').catch(()=>undefined);
  cdp.close();
  chrome.process?.kill?.('SIGKILL');
  process.exit(0);
}
