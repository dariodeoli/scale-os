/*
 * Verificación del tablero de Producción por columna (campaña #57, refs #44).
 *
 * Comprueba contra la app real y Postgres:
 *   - badge de cada columna == tarjetas renderizadas == Postgres;
 *   - cada tarjeta en su estado (columna correcta);
 *   - ninguna pieza perdida (total de tarjetas == órdenes de la organización);
 *   - `stage_counts` del contrato #57 (`?counts=1`) == Postgres y == DOM;
 *   - payload de las lecturas del tablero (transferSize/ms) en escritorio y mobile 4G.
 *
 * Requisitos: el stack local del e2e (`build-tools/visual-harness/e2e-drag.mjs`
 * documenta la receta: Postgres temporal + API + front + router de un origen) y
 * datos en la base del API. Env: BASE_URL (default http://127.0.0.1:3006),
 * PSQL_ARGS (por defecto -h 127.0.0.1 -p 55432 -U postgres -d scaleos).
 *
 * Nota: si el shell todavía no refresca la proyección al cambiar de sección, el
 * script arranca en Producción vía la preferencia de localStorage para no
 * medir con las órdenes de Resumen.
 *
 * Uso: node build-tools/visual-harness/verify-board-columns.mjs
 */

import {launchChrome,openTarget} from '/Users/fredd/.herdr/worktrees/scale-os/sos-ops/build-tools/visual-harness/chrome.mjs';
import {execFileSync} from 'node:child_process';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const PSQL=[...(process.env.PSQL_ARGS||'-h 127.0.0.1 -p 55432 -U postgres -d scaleos').split(' '),'-t','-A','-c'];
const psql=(sql)=>execFileSync('psql',[...PSQL,sql],{encoding:'utf8'}).trim();
const STATUSES=['blocked','to_record','recorded','editing','review','approved','published'];
const BOARD_FIELDS='id,project_id,project_name,client_name,title,description,status,urgency,due_date,due_time,effective_assignees,assignee_source,checklist_total,checklist_completed,approval_step,drive_links,updated_at,work_type';

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=25000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const clickByText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim()===${JSON.stringify(text)}&&n.offsetParent!==null);if(!el)return false;el.click();return true;})()`);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

/** Lecturas del tablero registradas por el navegador (transferSize real). */
const boardRequests=()=>evaluate(`performance.getEntriesByType('resource').filter(e=>e.name.includes('/core-api/api/agency/work-orders')).map(e=>({url:e.name.replace(/^.*\\/core-api/,''),size:e.transferSize,decoded:e.decodedBodySize,ms:Math.round(e.duration)}))`);

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
await send('Page.navigate',{url:BASE+'/'});
await sleep(1500);
// Arrancar en Producción: el shell de DSN reusa las órdenes de Resumen (proyección
// distinta) y el tablero crashea (ver reporte #57). Con el arranque en Producción
// la lectura inicial ya es la del tablero.
await evaluate(`localStorage.setItem('scale:workspace:v1:2:3',JSON.stringify({version:1,startup:'production',production:{clientId:'',mine:false,week:false}}))`);
await send('Page.reload');
await sleep(3500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Producción')`,{label:'nav'});
if(!await evaluate(`Boolean(document.querySelector('[data-column]'))`))await clickByText('Producción');
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero'});
await sleep(2500);

// ── 1) Conteos por columna: badge del DOM, tarjetas y Postgres ───────────────
const dom=await evaluate(`(()=>{const out={};for(const column of document.querySelectorAll('[data-column]')){const key=column.getAttribute('data-column');
 const cards=[...column.querySelectorAll('[data-order]')];
 const badge=column.querySelector('em')?.textContent?.trim()||null;
 out[key]={cards:cards.length,badge:badge?Number(badge):null,statuses:[...new Set(cards.map(c=>c.getAttribute('data-status')))]};}
 return {columns:out,total:document.querySelectorAll('[data-order]').length};})()`);
const dbCounts=Object.fromEntries(psql(`select status||'='||count(*) from agency_work_orders group by status`).split('\n').map(row=>row.split('=')));
for(const status of STATUSES){
 const column=dom.columns[status];
 check(`columna ${status}: badge == tarjetas`,column.badge,column.cards);
 check(`columna ${status}: conteo == Postgres`,column.cards,Number(dbCounts[status]||0));
 check(`columna ${status}: todas las tarjetas en su estado`,column.statuses.length===1?column.statuses[0]:column.statuses,status);
}
check('tablero completo: tarjetas == órdenes de la organización',dom.total,Number(psql('select count(*) from agency_work_orders')));

// ── 2) stage_counts del contrato vs DOM y Postgres ──────────────────────────
const counts=await evaluate(`fetch('/core-api/api/agency/work-orders?counts=1&limit=1&fields=id',{credentials:'include'}).then(r=>r.json()).then(d=>d.stage_counts)`);
check('stage_counts: mismas claves que las etapas',Object.keys(counts).sort().join(','),[...STATUSES].sort().join(','));
for(const status of STATUSES)check(`stage_counts[${status}] == Postgres`,counts[status],Number(dbCounts[status]||0));
check('stage_counts: suma == total',STATUSES.reduce((sum,key)=>sum+counts[key],0),Number(psql('select count(*) from agency_work_orders')));

// ── 3) Payload del tablero (escritorio) ─────────────────────────────────────
const measure=async(label)=>{const entries=await boardRequests();const sum=entries.reduce((acc,e)=>acc+e.size,0);log.push(`· ${label}: ${entries.length} lecturas de work-orders · ${sum} bytes · ${entries.map(e=>`${e.ms}ms`).join('/')}`);return {entries,sum};};
const desktopBoard=await measure('payload tablero escritorio (1366×900)');
const contractCalls=async(label,limit)=>{
 const result=await evaluate(`(async()=>{const out=[];const t0=performance.now();
  const counts=await fetch('/core-api/api/agency/work-orders?counts=1&limit=1&fields=id',{credentials:'include'}).then(r=>r.json());
  out.push({url:'?counts=1',size:0});
  for(const status of ${JSON.stringify(STATUSES)}){
   const response=await fetch('/core-api/api/agency/work-orders?status='+status+'${limit?`&limit=${limit}`:''}&fields=${BOARD_FIELDS}',{credentials:'include'});
   await response.json();
  }
  const entries=performance.getEntriesByType('resource').filter(e=>e.name.includes('/core-api/api/agency/work-orders')&&e.startTime>=t0);
  return {ms:Math.round(performance.now()-t0),size:entries.reduce((sum,e)=>sum+e.transferSize,0),calls:entries.length};})()`);
 const entries=await boardRequests();
 const marked=entries.slice(-(STATUSES.length+1));
 log.push(`· ${label}: ${result.calls} lecturas · ${marked.reduce((sum,e)=>sum+e.size,0)} bytes · ${result.ms} ms`);
 return {size:marked.reduce((sum,e)=>sum+e.size,0),ms:result.ms,calls:result.calls};
};
const contract300=await contractCalls('contrato #57 por columna (escritorio, sin tope)',null);

// ── 4) Mobile (390×844, red 4G) ─────────────────────────────────────────────
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:4*1024*1024/8,uploadThroughput:3*1024*1024/8});
await send('Page.reload');
await sleep(4000);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Producción')`,{label:'nav mobile'});
if(!await evaluate(`Boolean(document.querySelector('[data-column]'))`))await clickByText('Producción');
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero mobile'});
await sleep(2500);
const mobileBoard=await measure('payload tablero mobile (390×844, 4G)');
const mobileCounts=await evaluate(`(()=>{let total=0;for(const column of document.querySelectorAll('[data-column]')){const key=column.getAttribute('data-column');const cards=column.querySelectorAll('[data-order]').length;total+=cards;}
 return {columns:[...document.querySelectorAll('[data-column]')].map(c=>c.getAttribute('data-column')+':'+c.querySelectorAll('[data-order]').length+'/'+(c.querySelector('em')?.textContent?.trim()||'?')),total};})()`);
check('mobile: el tablero trae las mismas piezas',mobileCounts.total,dom.total);
log.push(`· mobile por columna (tarjetas/conteo): ${mobileCounts.columns.join(' · ')}`);
const contractMobile=await contractCalls('contrato #57 por columna (mobile 4G, sin tope)',null);
await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});

// Capturas del estado verificado (escritorio y mobile con conteos por columna).
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.reload');await sleep(3500);
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero para captura'});
await sleep(1200);
const shot=async(path)=>{const {data}=await send('Page.captureScreenshot',{format:'png'});const fs=await import('node:fs');fs.writeFileSync(path,Buffer.from(data,'base64'));log.push(`· captura: ${path}`);};
await shot('work/visual-harness/ronda-57/tablero-escritorio.png');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await sleep(1500);
await shot('work/visual-harness/ronda-57/tablero-mobile.png');
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS verificación del tablero #57: conteos exactos por columna, ninguna pieza perdida y payload medido en escritorio y mobile.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
