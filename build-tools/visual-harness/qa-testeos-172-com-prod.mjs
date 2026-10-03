/*
 * Cierre campaña #154 — cross-check de producción v1.0.172 del fix COM de la
 * ventana de filas (#135/#154): Clientes y Presupuestos no deben medir
 * espaciadores gigantes ni dar scrolls de miles de px con pocos registros.
 *
 * Uso: node build-tools/visual-harness/qa-testeos-172-com-prod.mjs [--checks]
 * Salida: docs/qa/testeos-172/prod/ (capturas) + smoke-com-browser.txt
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const withChecks=process.argv.includes('--checks');
const out=resolve(repo,process.env.QA_OUT||'docs/qa/testeos-172/prod');
mkdirSync(out,{recursive:true});
const BASE=(process.env.BASE_URL||'https://app.scaleparaguay.com').replace(/\/$/,'');

const log=[];const checks=[];
const check=(label,value,expected=true)=>{const ok=value===expected;checks.push({label,ok,value,expected});log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

// Sesión demo descartable de producción (misma puerta que el botón público).
const started=await fetch(BASE+'/core-api/api/demo/start',{method:'POST',headers:{'content-type':'application/json',origin:'https://sistema.scaleparaguay.com'},body:'{}'});
const cookie=(started.headers.get('set-cookie')||'').match(/scale_session=[^;]+/)?.[0]||'';
check('demo: sesión de producción',started.status,201);check('demo: cookie',Boolean(cookie));

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async e=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(e,{timeout=25000,label=''}={})=>{const t=Date.now();while(Date.now()-t<timeout){if(await evaluate(`Boolean(${e})`).catch(()=>false))return true;await sleep(250);}throw new Error(`timeout ${label||e}`);};
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78});writeFileSync(resolve(out,`${name}.jpg`),Buffer.from(data,'base64'));note(`captura ${name}.jpg`);};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:cookie.replace('scale_session=',''),url:BASE,domain:'.scaleparaguay.com',path:'/'});
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

for(const [path,label] of [['/clientes','clientes'],['/presupuestos','presupuestos']]){
 await send('Page.navigate',{url:BASE+path});
 await waitFor(`document.querySelectorAll('[role="row"]').length>=2`,{label});
 await sleep(1200);
 const measure=await evaluate(`(()=>{const scroller=document.querySelector('.silent-scroll')||document.documentElement;const rows=[...document.querySelectorAll('[role="rowgroup"] [role="row"]')].filter(n=>n.getClientRects().length);const spacers=[...document.querySelectorAll('[aria-hidden="true"]')].filter(n=>n.getClientRects().length&&n.clientHeight>400);return {scrollHeight:Math.round(scroller.scrollHeight),clientHeight:Math.round(scroller.clientHeight),rows:rows.length,spacers:spacers.map(n=>Math.round(n.getBoundingClientRect().height))};})()`);
 check(`COM ${label}: filas montadas`,measure.rows>=2,true);
 check(`COM ${label}: sin espaciador gigante`,measure.spacers.length,0);
 check(`COM ${label}: scroll total acotado (<4000 px)`,measure.scrollHeight<4000,true);
 note(`COM ${label}: ${measure.rows} filas · scroll ${measure.scrollHeight}/${measure.clientHeight} px · espaciadores ${JSON.stringify(measure.spacers)}`);
 await capture(`com-${label}-1440-light`);
}

writeFileSync(resolve(out,'smoke-com-browser.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(withChecks?(process.exitCode?'Cross-check COM v1.0.172: FALLÓ':'Cross-check COM v1.0.172: PASS'):'Cross-check COM v1.0.172: capturas listas');
await cdp.close();await chrome.close();
process.exit(process.exitCode||0);
