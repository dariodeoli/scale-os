/*
 * Verificación funcional en producción de la vertical FIN (ronda 18, #73):
 * Informes (llamada única, rango con año) y cobros (ventana + «Ver todos»).
 *
 * Corre Chrome local contra la app desplegada (por defecto
 * https://app.scaleparaguay.com) con una sesión demo aislada: la cookie se
 * pasa por env SESSION (work/prod-fin-session.txt) y nunca toca datos reales.
 *
 * Uso: SESSION=<scale_session> node build-tools/visual-harness/verify-fin-prod.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE_URL||'https://app.scaleparaguay.com';
const sessionFile=resolve(here,'../../work/prod-fin-session.txt');
const resultFile=resolve(here,'../../work/prod-fin-session-result.json');
const SESSION=process.env.SESSION||(readFileSync(sessionFile,'utf8').match(/scale_session=([a-f0-9]+)/)||[])[1];
if(!SESSION)throw new Error('Falta SESSION (cookie scale_session de una demo)');
const OUT=resolve(here,'../../work/visual-harness/prod-fin-73');
mkdirSync(OUT,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=30000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name,full=false)=>{const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:full});writeFileSync(resolve(OUT,`${name}.png`),Buffer.from(data,'base64'));};

const requests=[];
cdp.on('Network.requestWillBeSent',event=>requests.push(event.request.url));
const drain=()=>{const urls=requests.slice();requests.length=0;return urls;};
const countUrl=(urls,fragment)=>urls.filter(url=>url.includes(fragment)).length;

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:SESSION,url:BASE,domain:'.scaleparaguay.com',path:'/'});

// ── Informes: una sola llamada y rango con año ─────────────────────────────
requests.length=0;
await send('Page.navigate',{url:BASE+'/informes'});
await waitFor(`document.querySelector('section[aria-label="Reportes de la agencia"]')`,{timeout:45000,label:'Informes'});
await waitFor(`[...document.querySelectorAll('section[aria-label="Reportes de la agencia"] p')].some(p=>p.textContent.includes('Período visible'))`,{timeout:45000,label:'rango del período'});
await sleep(1200);
const informesRequests=drain().filter(url=>url.includes('/api/agency/'));
const reportsCalls=informesRequests.filter(url=>url.includes('/reports?'));
check('Informes: la llamada incluye la ventana anterior',reportsCalls.every(url=>url.includes('previous=1')),true);
check('Informes: una sola llamada a /reports',reportsCalls.length,1);
check('Informes: sin pedidos duplicados en la carga',informesRequests.length,new Set(informesRequests).size);
for(const url of informesRequests)note(`Informes pide: ${url.replace(BASE,'')}`);
const range=await evaluate(`(()=>{const p=[...document.querySelectorAll('section[aria-label="Reportes de la agencia"] p')].find(el=>el.textContent.includes('Período visible'));return p?p.textContent.trim():null;})()`);
// Expectativa independiente: mismo rango del filtro (mes actual + 12 meses) con año.
const today=await (async()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).formatToParts(new Date());return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`;})();
const [endYear,endMonth]=today.split('-').map(Number);
const startTotal=endYear*12+endMonth-1-11,startYear=Math.floor(startTotal/12),startMonth=startTotal-startYear*12+1;
const shift=(year,month,offset)=>{const total=year*12+month-1+offset;return [Math.floor(total/12),total-Math.floor(total/12)*12+1];};
const [previousYear,previousMonth]=shift(endYear,endMonth,-12);
const fmt=new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',day:'numeric',month:'short',year:'numeric'});
const expectedRange=`${fmt.format(new Date(Date.UTC(startYear,startMonth-1,1,12)))} — ${fmt.format(new Date(Date.UTC(endYear,endMonth,0,12)))}`;
check('Informes: rango completo con año',(range||'').includes(`Período visible: ${expectedRange}`),true);
note(`Informes rango: «${range}» (esperado ${expectedRange})`);

// Datos completos contra el API de producción: la ventana anterior del payload
// único es idéntica a la llamada aparte y la visible no cambia.
const apiCheck=await evaluate(`(async()=>{
 const month='${today}',previousMonth='${previousYear}-${String(previousMonth).padStart(2,'0')}';
 const get=(url)=>fetch(url,{credentials:'include'}).then(r=>r.json());
 const one=await get('/core-api/api/agency/reports?month='+month+'&months=12&previous=1');
 const plain=await get('/core-api/api/agency/reports?month='+month+'&months=12');
 const previous=await get('/core-api/api/agency/reports?month='+previousMonth+'&months=12');
 return {
  currentMonths:one.months.length,previousMonths:one.previous?one.previous.months.length:0,
  previousMonth:one.previous?one.previous.month:null,expectedPreviousMonth:previousMonth,
  samePrevious:JSON.stringify(one.previous&&one.previous.months)===JSON.stringify(previous.months),
  sameCurrent:JSON.stringify(one.months)===JSON.stringify(plain.months),
  plainHasPrevious:Object.prototype.hasOwnProperty.call(plain,'previous'),
  monthsWithData:one.months.filter(m=>m.clients.active!==null||(m.financial||[]).length>0||(m.clients.types||[]).length>0).length};
})()`);
check('Informes API: la ventana visible llega completa',apiCheck.currentMonths,12);
check('Informes API: la ventana anterior llega completa',apiCheck.previousMonths,12);
check('Informes API: previous.month coincide con la ventana pedida',apiCheck.previousMonth,apiCheck.expectedPreviousMonth);
check('Informes API: previous == llamada aparte (datos completos)',apiCheck.samePrevious,true);
check('Informes API: la ventana visible no cambia',apiCheck.sameCurrent,true);
check('Informes API: sin previous el payload no cambia',apiCheck.plainHasPrevious,false);
note(`Informes API: ${apiCheck.monthsWithData}/12 meses con datos visibles`);
const monthsTable=await evaluate(`(()=>{const rows=[...document.querySelectorAll('section[aria-label="Reportes de la agencia"] table tbody tr')];return {rows:rows.length,first:rows[0]?.textContent.trim().slice(0,30)};})()`);
note(`Informes histórico: ${monthsTable.rows} filas · primera ${monthsTable.first}`);
check('Informes: el histórico trae meses',monthsTable.rows>0,true);
await capture('informes-1280-light',true);
await evaluate(`(()=>{try{localStorage.setItem('scale-theme','dark')}catch{};document.documentElement.dataset.theme='dark';return true;})()`);
await sleep(400);
await capture('informes-1280-dark',true);
await evaluate(`(()=>{try{localStorage.setItem('scale-theme','light')}catch{};document.documentElement.dataset.theme='light';return true;})()`);

// ── Cobros: ventana de 20 + «Ver todos» ────────────────────────────────────
requests.length=0;
await send('Page.navigate',{url:BASE+'/pagos'});
await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{timeout:45000,label:'Finanzas'});
await sleep(1200);
const paymentRows=()=>evaluate(`(()=>{const table=document.querySelector('section[aria-label="Finanzas"] [role="table"][aria-label="Cobros registrados"]');return table?table.querySelectorAll('[role="rowgroup"] > [role="row"]').length:0;})()`);
const windowRows=await paymentRows();
check('Cobros: la carga trae la ventana de 20',windowRows,20);
const windowCalls=drain().filter(url=>url.includes('/api/agency/payments'));
for(const url of windowCalls)note(`Finanzas pide: ${url.replace(BASE,'')}`);
check('Cobros: la ventana se pide sin limit=all',windowCalls.every(url=>!url.includes('limit=all')),true);
await capture('pagos-ventana-1280-light',true);
const seeAll=await evaluate(`(()=>{const button=[...document.querySelectorAll('section[aria-label="Finanzas"] button')].find(el=>(el.textContent||'').trim()==='Ver todos los cobros');if(!button)return false;button.click();return true;})()`);
check('Cobros: «Ver todos los cobros» presente y clickeable',seeAll,true);
await waitFor(`(()=>{const table=document.querySelector('section[aria-label="Finanzas"] [role="table"][aria-label="Cobros registrados"]');return table&&table.querySelectorAll('[role="rowgroup"] > [role="row"]').length>20;})()`,{timeout:20000,label:'histórico completo'});
await sleep(500);
const allRows=await paymentRows();
const allCalls=drain().filter(url=>url.includes('/api/agency/payments'));
check('Cobros: el histórico completo se pide una vez con limit=all',allCalls.filter(url=>url.includes('limit=all')).length,1);
check('Cobros: sin pedidos duplicados al completar',allCalls.length,new Set(allCalls).size);
check('Cobros: la lista completa queda cargada',allRows>20,true);
check('Cobros: el botón desaparece con el histórico completo',await evaluate(`!([...document.querySelectorAll('section[aria-label="Finanzas"] button')].some(el=>(el.textContent||'').trim()==='Ver todos los cobros'))`),true);
note(`Cobros: ventana ${windowRows} → histórico ${allRows}`);
// API de producción: la ventana es el prefijo exacto del histórico completo.
const paymentsApi=await evaluate(`(async()=>{const get=(url)=>fetch(url,{credentials:'include'}).then(r=>r.json());const window_=await get('/core-api/api/agency/payments');const all=await get('/core-api/api/agency/payments?limit=all');return {window:window_.payments.length,hasMore:window_.hasMore,all:all.payments.length,allHasMore:all.hasMore,prefix:window_.payments.every((payment,index)=>payment.id===all.payments[index].id)};})()`);
check('Cobros API: ventana de 20 con hasMore',paymentsApi.window===20&&paymentsApi.hasMore===true,true);
check('Cobros API: limit=all trae el histórico completo',paymentsApi.all>20&&paymentsApi.allHasMore===false,true);
check('Cobros API: la ventana es el prefijo del histórico',paymentsApi.prefix,true);
note(`Cobros API: ${paymentsApi.window} de ${paymentsApi.all}`);
await capture('pagos-1280-light',true);
await evaluate(`(()=>{try{localStorage.setItem('scale-theme','dark')}catch{};document.documentElement.dataset.theme='dark';return true;})()`);
await sleep(400);
await capture('pagos-1280-dark',true);

// Sanity: Informes no pide /reports en Finanzas ni viceversa; sin duplicados globales.
const summary={base:BASE,informes:{reportsCalls:reportsCalls.length,requests:informesRequests.length},cobros:{window:windowRows,all:allRows,limitAll:allCalls.filter(url=>url.includes('limit=all')).length}};
writeFileSync(resultFile,JSON.stringify(summary,null,1));
writeFileSync(resolve(OUT,'verificacion.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(`\nResumen: ${JSON.stringify(summary)}`);
console.log(`Evidencia en ${OUT}`);
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(process.exitCode||0);
