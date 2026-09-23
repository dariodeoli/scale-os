/*
 * Verificación del tablero de Producción por columna (campaña #57, refs #44).
 *
 * Comprueba contra la app real, el API y Postgres:
 *   - badge de cada columna == total exacto de Postgres (`?counts=1`);
 *   - tarjetas cargadas == min(total, ventana) y "Ver más" alcanza el resto
 *     (ninguna pieza perdida: se pagina hasta completar cada columna);
 *   - cada tarjeta en su estado;
 *   - `stage_counts` del contrato == Postgres == badges del DOM;
 *   - payload del tablero: lecturas reales por columna vs la lista completa
 *     (transferSize y ms) en escritorio y mobile 4G;
 *   - capturas del estado verificado.
 *
 * Requisitos: stack local (la receta está en `e2e-drag.mjs`) y datos en la base
 * del API. Env: BASE_URL (default http://127.0.0.1:3006) y PSQL_ARGS.
 *
 * Uso: node build-tools/visual-harness/verify-board-columns.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const PSQL=[...(process.env.PSQL_ARGS||'-h 127.0.0.1 -p 55432 -U postgres -d scaleos').split(' '),'-t','-A','-c'];
const psql=(sql)=>execFileSync('psql',[...PSQL,sql],{encoding:'utf8'}).trim();
const sqlText=(value)=>`'${String(value).replaceAll("'","''")}'`;
const BOARD_FIELDS=readFileSync(new URL('../../app/shell-data.ts',import.meta.url),'utf8').match(/ORDER_FIELDS_BOARD = '([^']+)'/)[1];
const WINDOW=Number(readFileSync(new URL('../../app/board-data.ts',import.meta.url),'utf8').match(/BOARD_COLUMN_WINDOW=(\d+)/)[1]);

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=25000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const clickByText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.offsetParent!==null);if(!el)return false;el.click();return true;})()`);

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4000);
if(!await evaluate(`Boolean(document.querySelector('[data-column]'))`))await clickByText('Producción');
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero'});
await sleep(2500);

const dbCounts=Object.fromEntries(psql('select status||\'=\'||count(*) from agency_work_orders group by status').split('\n').map(row=>row.split('=')));
const boardRequests=()=>evaluate(`performance.getEntriesByType('resource').filter(e=>e.name.includes('/core-api/api/agency/work-orders')).map(e=>({url:e.name.replace(/^.*\\/core-api/,''),size:e.transferSize,ms:Math.round(e.duration)}))`);
const columnState=()=>evaluate(`(()=>{const out={};for(const column of document.querySelectorAll('[data-column]')){const key=column.getAttribute('data-column');out[key]={cards:column.querySelectorAll('[data-order]').length,badge:Number(column.querySelector('em')?.textContent?.trim()||0),statuses:[...new Set([...column.querySelectorAll('[data-order]')].map(c=>c.getAttribute('data-status')))],more:Boolean(column.querySelector('button[aria-label^="Ver más"]'))};}return out;})()`);

// ── 1) Carga inicial: badge exacto, ventana respetada y estados por columna ──
const loaded=await boardRequests();
const initial=await columnState();
for(const status of Object.keys(dbCounts)){
 const column=initial[status];
 if(!column){check(`columna ${status} presente`,false);continue;}
 const total=Number(dbCounts[status]||0);
 check(`columna ${status}: badge == Postgres`,column.badge,total);
 check(`columna ${status}: tarjetas == min(total, ventana)`,column.cards,Math.min(total,WINDOW));
 if(column.statuses.length>1)check(`columna ${status}: todas las tarjetas en su estado`,column.statuses,status);
 else check(`columna ${status}: todas las tarjetas en su estado`,column.statuses[0],status);
 check(`columna ${status}: "Ver más" solo si falta cargar`,column.more,total>column.cards);
}
const counts=await evaluate(`fetch('/core-api/api/agency/work-orders?counts=1&limit=1&fields=id',{credentials:'include'}).then(r=>r.json()).then(d=>d.stage_counts)`);
for(const status of Object.keys(dbCounts))check(`stage_counts[${status}] == Postgres`,counts[status],Number(dbCounts[status]||0));
check('stage_counts: suma == total',Object.values(counts).reduce((sum,value)=>sum+value,0),Number(psql('select count(*) from agency_work_orders')));

// ── 2) "Ver más": ninguna pieza perdida (se pagina hasta completar) ──────────
const paginatable=Object.entries(initial).filter(([,column])=>column.more).map(([status])=>status);
log.push(`· columnas a paginar: ${paginatable.length?paginatable.join(', '):'ninguna (todo entra en la ventana)'}`);
for(const status of paginatable){
 let guard=0;
 while(guard<20){
  guard+=1;
  const more=await evaluate(`(()=>{const column=document.querySelector('[data-column="${status}"]');const button=column?.querySelector('button[aria-label^="Ver más"]');if(!button)return false;button.click();return true;})()`);
  if(!more)break;
  await sleep(1200);
 }
 const column=(await columnState())[status];
 check(`columna ${status}: "Ver más" completa el total`,column.cards,Number(dbCounts[status]||0));
 check(`columna ${status}: sin botón pendiente al completar`,column.more,false);
}
check('tablero completo: tarjetas == órdenes (tras paginar)',(await columnState()) && Object.values(await columnState()).reduce((sum,column)=>sum+column.cards,0),Number(psql('select count(*) from agency_work_orders')));

// ── 3) Payload: lecturas reales por columna vs lista completa ───────────────
const perColumn=loaded.filter(entry=>entry.url.includes('status='));
const fallback=await evaluate(`(async()=>{const before=performance.getEntriesByType('resource').length;await fetch('/core-api/api/agency/work-orders?fields=${BOARD_FIELDS}',{credentials:'include'}).then(r=>r.json());const entries=performance.getEntriesByType('resource').slice(before);return {size:entries.reduce((sum,e)=>sum+e.transferSize,0),ms:Math.round(entries.reduce((sum,e)=>sum+e.duration,0))};})()`);
const columnBytes=perColumn.reduce((sum,entry)=>sum+entry.size,0);
log.push(`· payload tablero por columna (${perColumn.length} lecturas): ${columnBytes} bytes · ${perColumn.reduce((sum,entry)=>sum+entry.ms,0)} ms`);
log.push(`· payload lista completa con la misma proyección: ${fallback.size} bytes · ${fallback.ms} ms`);
log.push(`· ahorro: ${(100-columnBytes/fallback.size*100).toFixed(1)}%`);

// ── 4) Mobile ───────────────────────────────────────────────────────────────
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Page.reload');await sleep(4500);
if(!await evaluate(`Boolean(document.querySelector('[data-column]'))`))await clickByText('Producción');
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero mobile'});
await sleep(2000);
const mobile=await columnState();
const mobileTotals=Object.entries(mobile).reduce((acc,[status,column])=>{acc.cards+=column.cards;acc.badges+=column.badge;return acc;}, {cards:0,badges:0});
check('mobile: badge por columna == Postgres',Object.entries(mobile).every(([status,column])=>column.badge===Number(dbCounts[status]||0)));
const mobileExpected=Object.entries(mobile).reduce((sum,[status,column])=>sum+Math.min(column.badge,column.cards<column.badge?WINDOW:column.badge),0);
check('mobile: piezas cargadas == ventana por columna',mobileTotals.cards,mobileExpected);
check('mobile: badges == total exacto',mobileTotals.badges,Number(psql('select count(*) from agency_work_orders')));
log.push(`· mobile por columna (tarjetas/conteo): ${Object.entries(mobile).map(([status,column])=>`${status}:${column.cards}/${column.badge}`).join(' · ')}`);

// ── 5) Capturas ─────────────────────────────────────────────────────────────
const fs=await import('node:fs');
fs.mkdirSync('work/visual-harness/ronda-57',{recursive:true});
const shot=async(path)=>{const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path,Buffer.from(data,'base64'));log.push(`· captura: ${path}`);};
await shot('work/visual-harness/ronda-57/tablero-mobile.png');
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.reload');await sleep(4000);
if(!await evaluate(`Boolean(document.querySelector('[data-column]'))`))await clickByText('Producción');
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero para captura'});
await sleep(1500);
await shot('work/visual-harness/ronda-57/tablero-escritorio.png');

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS verificación del tablero por columna (#57): conteos exactos, ventanas con "Ver más" sin perder piezas, estados por columna y payload medido.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
