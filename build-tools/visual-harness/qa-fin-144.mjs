/*
 * Evidencia #144 (Previsión — «total planificado» vs «Sin gastos planificados»).
 *
 * 1) Contradicción: pausa la lectura de `/planned-expenses` mientras la previsión
 *    (con totales) ya llegó. Antes del fix la pantalla mostraba el total con el
 *    vacío; después muestra la carga. 2) Estado asentado: detalle listado y
 *    «Ver desglose» del resumen bimoneda.
 *
 * Uso: SESSION=<cookie demo> BASE_URL=https://app.scaleparaguay.com QA_LABEL=antes \
 *      node build-tools/visual-harness/qa-fin-144.mjs
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
const OUT=resolve(here,`../../work/visual-harness/fin-144-${LABEL}`);
mkdirSync(OUT,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=60000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78,captureBeyondViewport:true});writeFileSync(resolve(OUT,`${name}.jpg`),Buffer.from(data,'base64'));};
const state=()=>evaluate(`(()=>{const section=document.querySelector('section[aria-label="Previsión financiera"]');const text=section?section.innerText:'';return {total:/total planificado/i.test(text),vacio:/Sin gastos planificados/.test(text),cargando:/Cargando gastos planificados/.test(text),error:/No se pudieron cargar los gastos planificados/.test(text),desglose:/Ver desglose/.test(text),detalle:/Marketing|Recurrente|Operación/.test(text)};})()`);

await send('Page.enable');await send('Runtime.enable');
await send('Network.setCookie',{name:'scale_session',value:SESSION,url:BASE,domain:BASE.includes('scaleparaguay')?'.scaleparaguay.com':undefined,path:'/'});

// 1) Detalle pausado: total presente, el vacío no puede aparecer.
await send('Fetch.enable',{patterns:[{urlPattern:'*planned-expenses*',requestStage:'Request'}]});
const paused=[];
cdp.on('Fetch.requestPaused',event=>paused.push(event));
for(const [width,theme] of [[1440,'light'],[1440,'dark'],[390,'light'],[390,'dark']]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:width<768?2:1,mobile:width<768});
 await send('Page.navigate',{url:BASE+'/pagos/prevision'});
 await waitFor(`document.querySelector('section[aria-label="Previsión financiera"]')`,{label:'previsión'});
 await waitFor(`/TOTAL PLANIFICADO|total planificado/i.test(document.querySelector('section[aria-label="Previsión financiera"]').innerText)`,{label:'totales'}).catch(()=>null);
 await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
 await sleep(900);
 const pausedState=await state();
 check(`pausado (${width} ${theme}): el total está visible`,pausedState.total,true);
 check(`pausado (${width} ${theme}): el vacío no se muestra`,pausedState.vacio,false);
 await capture(`pausado-prevision-${width}-${theme}`);
}
// Continúa los pedidos pausados para no dejar la app colgada.
for(const event of paused){await send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>undefined);}
await send('Fetch.disable');

// 2) Estado asentado: detalle listado y «Ver desglose» en el resumen bimoneda.
for(const [width,theme] of [[1440,'light'],[1440,'dark'],[390,'light'],[390,'dark']]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:width<768?2:1,mobile:width<768});
 await send('Page.navigate',{url:BASE+'/pagos/prevision'});
 await waitFor(`document.querySelector('section[aria-label="Previsión financiera"]')`,{label:'previsión'});
 await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
 await sleep(1600);
 const settled=await state();
 check(`asentado (${width} ${theme}): el total está visible`,settled.total,true);
 check(`asentado (${width} ${theme}): el vacío no se muestra`,settled.vacio,false);
 check(`asentado (${width} ${theme}): el detalle del mes está listado`,settled.detalle,true);
 check(`asentado (${width} ${theme}): «Ver desglose» está disponible`,settled.desglose,true);
 await capture(`asentado-prevision-${width}-${theme}`);
 if(width===1440&&theme==='light'){
  // Abre el desglose para evidenciar el detalle bimoneda.
  await evaluate(`(()=>{const details=[...document.querySelectorAll('section[aria-label="Previsión financiera"] details.settings-disclosure')].find(d=>d.querySelector('summary').textContent.includes('Ver desglose'));if(details)details.open=true;return true;})()`);
  await sleep(400);
  await capture('desglose-prevision-1440-light');
 }
}

writeFileSync(resolve(OUT,'verificacion.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(`Evidencia en ${OUT}`);
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(process.exitCode||0);
