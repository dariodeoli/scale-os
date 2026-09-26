/*
 * Verificación visual en producción — rediseño 50f5198 (ronda 19, #74).
 * Alcance FIN: Informes (/informes), Finanzas (/pagos) y Previsión
 * (/pagos/prevision) a 1440/1280/390 en claro y oscuro.
 *
 * Mide regresiones (overflow del documento, targets <44 en mobile, texto
 * recortado sin title, solapes entre controles, errores de consola) y deja
 * capturas JPEG para revisar jerarquía/densidad.
 *
 * Uso: SESSION=<scale_session demo> node build-tools/visual-harness/verify-fin-redesign-prod.mjs
 *      BASE_URL=http://127.0.0.1:3021 ... (misma corrida contra el stack local)
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const BASE=(process.env.BASE_URL||'https://app.scaleparaguay.com').replace(/\/$/,'');
const LABEL=process.env.QA_LABEL||(BASE.includes('scaleparaguay')?'prod':'local');
const sessionFile=resolve(here,'../../work/prod-fin-session.txt');
const SESSION=process.env.SESSION||(readFileSync(sessionFile,'utf8').match(/scale_session=([a-f0-9]+)/)||[])[1];
if(!SESSION)throw new Error('Falta SESSION (cookie scale_session de una demo)');
const OUT=resolve(here,`../../work/visual-harness/redesign-fin-${LABEL}`);
mkdirSync(OUT,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name,{full=false,quality=78}={})=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality,captureBeyondViewport:full});writeFileSync(resolve(OUT,`${name}.jpg`),Buffer.from(data,'base64'));};

const consoleErrors=[];
cdp.on('Runtime.exceptionThrown',event=>consoleErrors.push(String(event.exceptionDetails?.exception?.description||event.exceptionDetails?.text||'').slice(0,180)));
cdp.on('Runtime.consoleAPICalled',event=>{if(event.type==='error')consoleErrors.push((event.args||[]).map(a=>a.value??a.description??'').join(' ').slice(0,180));});

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:SESSION,url:BASE,domain:BASE.includes('scaleparaguay')?'.scaleparaguay.com':undefined,path:'/'});

const MEASURE_JS=(marker)=>`(()=>{
 const section=document.querySelector(${JSON.stringify(marker)});
 if(!section)return null;
 const doc=document.documentElement;
 const visible=(el)=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>1&&r.height>1&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&!el.closest('[aria-hidden="true"]');};
 const small=[];
 section.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea,summary').forEach(el=>{
  if(el.disabled||!visible(el)||el.closest('svg'))return;
  const r=el.getBoundingClientRect();
  if(r.height<43.5)small.push({tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,44),h:Math.round(r.height),cls:String(el.className).slice(0,60)});
 });
 const truncated=[];
 section.querySelectorAll('*').forEach(el=>{
  if(!visible(el))return;
  const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>0);
  if(!own.length)return;
  const s=getComputedStyle(el);
  const clipped=s.textOverflow==='ellipsis'||s.overflow==='hidden'||s.webkitLineClamp&&s.webkitLineClamp!=='none';
  if(!clipped)return;
  const hasTitle=el.getAttribute('title')||el.closest('[title]');
  if(hasTitle)return;
  const r=el.getBoundingClientRect();
  if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)truncated.push({tag:el.tagName,text:el.textContent.trim().slice(0,44),cls:String(el.className).slice(0,60),sw:el.scrollWidth,cw:el.clientWidth});
 });
 const interactive=[...section.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea,summary')].filter(el=>!el.disabled&&visible(el)&&!el.closest('svg'));
 const overlaps=[];
 for(let i=0;i<interactive.length;i++)for(let j=i+1;j<interactive.length;j++){
  const a=interactive[i],b=interactive[j];
  if(a.contains(b)||b.contains(a))continue;
  const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
  const w=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left),h=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
  if(w>4&&h>4)overlaps.push({a:(a.getAttribute('aria-label')||a.textContent||'').trim().slice(0,30),b:(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,30),w:Math.round(w),h:Math.round(h)});
 }
 const scrollers=[...section.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return el.scrollWidth>el.clientWidth+2&&(s.overflowX==='auto'||s.overflowX==='scroll');}).map(el=>({cls:String(el.className).slice(0,40),sw:el.scrollWidth,cw:el.clientWidth}));
 return {overflow:doc.scrollWidth-doc.clientWidth,small,truncated,overlaps:overlaps.slice(0,6),scrollers,title:document.querySelector('.workspace-page-header h1')?.textContent.trim()||section.getAttribute('aria-label')};
})()`;

const screens=[
 {name:'Informes',route:'/informes',marker:'section[aria-label="Reportes de la agencia"]',slug:'informes',ready:'document.querySelectorAll(\'section[aria-label="Reportes de la agencia"] table tbody tr\').length>0'},
 {name:'Finanzas',route:'/pagos',marker:'section[aria-label="Finanzas"]',slug:'finanzas',ready:'Boolean(document.querySelector(\'section[aria-label="Finanzas"] [role="table"]\'))'},
 {name:'Previsión',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]',slug:'prevision',ready:'Boolean(document.querySelector(\'section[aria-label="Previsión financiera"] article\'))'},
];

for(const screen of screens){
 for(const theme of ['light','dark']){
  for(const width of [1440,1280,390]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
   await send('Page.navigate',{url:BASE+screen.route});
   await waitFor(`document.querySelector(${JSON.stringify(screen.marker)})`,{timeout:60000,label:`${screen.name} ${theme} ${width}`});
   await waitFor(screen.ready,{timeout:60000,label:`${screen.name} datos ${theme} ${width}`}).catch(()=>note(`${screen.name} (${theme}, ${width}): datos no confirmados antes de medir`));
   await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
   await sleep(1000);
   const audit=await evaluate(MEASURE_JS(screen.marker));
   const key=`${screen.name} (${theme}, ${width})`;
   check(`${key}: sin overflow del documento`,audit.overflow,0);
   if(width<768){check(`${key}: targets ≥44`,audit.small.length,0);for(const item of audit.small.slice(0,6))note(`  ${key}: ${item.h}px · ${item.tag} «${item.label}» · ${item.cls}`);}
   check(`${key}: sin texto recortado sin title`,audit.truncated.length,0);
   for(const item of audit.truncated.slice(0,4))note(`  ${key}: «${item.text}» ${item.sw}>${item.cw} · ${item.cls}`);
   check(`${key}: sin solapes de controles`,audit.overlaps.length,0);
   for(const item of audit.overlaps.slice(0,3))note(`  ${key}: solape «${item.a}»×«${item.b}» ${item.w}×${item.h}`);
   if(audit.scrollers.length)note(`${key}: rieles internos ${JSON.stringify(audit.scrollers.map(s=>`${s.sw}>${s.cw}`))}`);
   if(width===1440||width===390)await capture(`${screen.slug}-${width}-${theme}`,{full:width===390});
  }
 }
}
// Captura full-page de 1280 (claro) por sección: deja ver la sección completa
// (tablas anchas incluidas) para la revisión de jerarquía/densidad.
for(const screen of screens){
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:BASE+screen.route});
 await waitFor(`document.querySelector(${JSON.stringify(screen.marker)})`,{timeout:60000,label:`${screen.name} full`});
 await waitFor(screen.ready,{timeout:60000,label:`${screen.name} datos full`}).catch(()=>null);
 await evaluate(`(()=>{try{localStorage.setItem('scale-theme','light')}catch{};document.documentElement.dataset.theme='light';return true;})()`);
 await sleep(900);
 await capture(`${screen.slug}-1280-light-full`,{full:true,quality:70});
}

const errors=[...new Set(consoleErrors)];
check('consola sin errores',errors.length,0);
for(const error of errors.slice(0,5))note(`  consola: ${error}`);

writeFileSync(resolve(OUT,'verificacion.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(`\nEvidencia en ${OUT}`);
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(process.exitCode||0);
