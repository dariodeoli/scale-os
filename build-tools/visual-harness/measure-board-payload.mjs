/*
 * Medición de payload del tablero de Producción (campaña #57, refs #44).
 *
 * Compara, contra el API real y con transferSize del navegador:
 *   1) modo actual: lista completa de órdenes con la proyección del tablero;
 *   2) modo por columna del contrato #57: `?counts=1` + `?status=<etapa>&limit=N`;
 *   3) ventana única `?limit=N`.
 * Corre en escritorio y en mobile 390×844 con 4G emulado (4 Mbps, 100 ms RTT).
 *
 * Requisitos: mismo stack local que el e2e; dataset a escala (por ejemplo
 * 3000 órdenes) para que la diferencia sea visible.
 *
 * Uso: node build-tools/visual-harness/measure-board-payload.mjs [--limit 50]
 */

import {launchChrome,openTarget} from '/Users/fredd/.herdr/worktrees/scale-os/sos-ops/build-tools/visual-harness/chrome.mjs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const STATUSES=['blocked','to_record','recorded','editing','review','approved','published'];
const BOARD='id,project_id,project_name,client_name,title,description,status,urgency,due_date,due_time,effective_assignees,assignee_source,checklist_total,checklist_completed,approval_step,drive_url,drive_links,estimated_hours,actual_hours,updated_at,work_type';
const WINDOW=Number((await import('node:fs')).readFileSync(new URL('../../app/board-data.ts',import.meta.url),'utf8').match(/BOARD_COLUMN_WINDOW=(\d+)/)[1]);
const LIMIT_DEFAULT=WINDOW;
const LIMIT=Number((process.argv.find(a=>a.startsWith('--limit='))||`--limit=${LIMIT_DEFAULT}`).split('=')[1]);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4000);

/** Ejecuta una tanda de lecturas y devuelve bytes transferidos + ms reales. */
async function batch(label,{counts,perColumn}){
 const result=await evaluate(`(async()=>{
  const t0=performance.now();
  let total=0, calls=0;
  const measure=async(url)=>{const before=performance.getEntriesByType('resource').length;
   const response=await fetch(url,{credentials:'include'});const body=await response.json();calls++;
   const entries=performance.getEntriesByType('resource').slice(before);
   const size=entries.reduce((sum,e)=>sum+e.transferSize,0);
   return {size,status:response.status,count:Array.isArray(body.workOrders)?body.workOrders.length:null,counts:body.stage_counts||null};};
  const out=[];
  ${counts?`out.push(await measure('/core-api/api/agency/work-orders?counts=1&limit=1&fields=id'));`:''}
  ${perColumn?`for(const status of ${JSON.stringify(STATUSES)})out.push(await measure('/core-api/api/agency/work-orders?status='+status+'&limit=${LIMIT}&fields='+${JSON.stringify(BOARD)}));`:
   `out.push(await measure('/core-api/api/agency/work-orders?fields='+${JSON.stringify(BOARD)}));`}
  return {ms:Math.round(performance.now()-t0),calls,size:out.reduce((sum,r)=>sum+r.size,0),detail:out.map(r=>({size:r.size,count:r.count,status:r.status})),counts:out.map(r=>r.counts).find(Boolean)||null};})()`);
 console.log(`${label}: ${result.size} bytes · ${result.calls} lecturas · ${result.ms} ms  (${result.detail.map(d=>d.count!==null?`${d.count} filas`:`${d.size}B`).join(' · ')})`);
 return result;
}

console.log(`=== escritorio (sin throttling) · ventana por columna ${LIMIT}`);
const current=await batch('antes: lista completa con la proyección del tablero',{counts:false,perColumn:false});
const perColumn=await batch('después: conteos + 7 columnas por ?status con ventana',{counts:true,perColumn:true});
const counts=perColumn.counts;
console.log('stage_counts (contract):',JSON.stringify(counts));
console.log(`ahorro por columna vs modo actual: ${(100-perColumn.size/current.size*100).toFixed(1)}%`);

await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:4*1024*1024/8,uploadThroughput:3*1024*1024/8});
console.log('=== mobile 390×844 · 4G (4 Mbps, 100 ms RTT)');
const currentMobile=await batch('antes: lista completa con la proyección del tablero',{counts:false,perColumn:false});
const perColumnMobile=await batch('después: conteos + 7 columnas por ?status con ventana',{counts:true,perColumn:true});
console.log(`ahorro por columna vs modo actual (4G): ${(100-perColumnMobile.size/currentMobile.size*100).toFixed(1)}%`);
await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});

await send('Page.close').catch(()=>{});
process.exit(0);
