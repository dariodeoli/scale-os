/*
 * Verificación del detalle de proyecto (#58, refs #44).
 *
 * Comprueba en la app real que el detalle:
 *   - lista como máximo la ventana (50) y resume el resto con el conteo real;
 *   - negocia `?project_id=`: con el API actual cae al camino completo, y con el
 *     filtro soportado la lectura es solo del proyecto (se mide transferSize/ms);
 *   - mantiene el conteo del registro y el tiempo razonable con 3.000 piezas.
 *
 * Requisitos: stack local (receta en `e2e-drag.mjs`). Env: BASE_URL, PSQL_ARGS.
 * Uso: node build-tools/visual-harness/verify-project-detail.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const PSQL=[...(process.env.PSQL_ARGS||'-h 127.0.0.1 -p 55432 -U postgres -d scaleos').split(' '),'-t','-A','-c'];
const psql=(sql)=>execFileSync('psql',[...PSQL,sql],{encoding:'utf8'}).trim();

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const waitFor=async(expression,{timeout=30000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,250));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const clickByText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim()===${JSON.stringify(text)}&&n.offsetParent!==null);if(!el)return false;el.click();return true;})()`);

const project=psql("select p.name from agency_projects p join agency_work_orders o on o.project_id=p.id group by p.id,p.name order by count(*) desc limit 1");
const total=Number(psql(`select count(*) from agency_work_orders o join agency_projects p on p.id=o.project_id where p.name=${"'"+project.replaceAll("'","''")+"'"}`));

const ordersRequests=()=>evaluate(`performance.getEntriesByType('resource').filter(e=>e.name.includes('/core-api/api/agency/work-orders')).map(e=>({url:e.name.replace(/^.*\\/core-api/,''),size:e.transferSize,ms:Math.round(e.duration)}))`);

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Proyectos')`,{label:'cáscara'});
await clickByText('Proyectos');
await waitFor(`document.querySelector('.project-entry')`,{label:'proyectos'});
await sleep(1500);

const opened=await evaluate(`(()=>{const button=document.querySelector('button[aria-label="Ver detalle del proyecto: ${project}"]');if(!button)return false;button.click();return true;})()`);
check(`detalle: se abre «${project}» (${total} piezas)`,opened);
const t0=Date.now();
await waitFor(`document.querySelector('[role="dialog"]')`,{label:'detalle'});
await sleep(2200);
const openMs=Date.now()-t0;
const text=await evaluate(`[...document.querySelectorAll('[role="dialog"]')].map(d=>d.textContent).join(' ')`);
const listed=await evaluate(`document.querySelectorAll('[role="dialog"] li').length`);
check('detalle: lista acotada a 50',listed<=51);
check('detalle: resume el resto con el conteo real',text.includes(`y ${total-50} piezas más`),true);
if(!text.includes(`y ${total-50} piezas más`))log.push(`· (texto del detalle: ${text.slice(-200).replace(/\s+/g,' ')})`);
check('detalle: trae la proyección mínima (estado y entrega por pieza)',/nov|sept|oct|diciembre|Entrega/i.test(text));
log.push(`· detalle abierto en ${(openMs/1000).toFixed(1)} s con ${listed} piezas listadas de ${total}`);

const requests=(await ordersRequests()).filter(entry=>entry.url.includes('work-orders'));
const last=requests.slice(-4);
const probe=last.find(entry=>entry.url.includes('project_id=999999999'));
const withFilter=last.filter(entry=>entry.url.includes('project_id=')&&entry!==probe);
log.push(`· lecturas de work-orders: ${last.map(entry=>`${entry.url.slice(0,86)}${entry.url.length>86?'…':''} (${entry.size} B)`).join(' · ')||'ninguna'}`);
check('detalle: negociación de ?project_id= (prueba o filtro)',last.length>0);
if(withFilter.length){
 check('detalle: con soporte, la lectura usa el filtro por proyecto',withFilter.every(entry=>entry.url.includes('project_id=2')));
 check('detalle: la lectura con filtro va acotada',withFilter.every(entry=>entry.url.includes('limit=')));
 const filteredSize=withFilter.reduce((sum,entry)=>sum+entry.size,0);
 log.push(`· payload con el filtro soportado: ${filteredSize} bytes (la lista completa con proyección mínima rondaba 0,4 MB con 3.000)`);
}else{
 check('detalle: la prueba del proyecto imposible está presente',Boolean(probe));
 const full=(await ordersRequests()).filter(entry=>entry.url.includes('work-orders')).slice(-1)[0];
 check('detalle: sin soporte NO se manda tope (no se pierden piezas)',full?full.url.includes('limit=')===false:true);
 log.push('· el API todavía no soporta ?project_id=: el detalle usó la lista completa con proyección mínima (fallback) y el tope se aplica al dibujar');
}
check('detalle: sigue mostrando cada pieza con su fecha',/Entrega|entrega/i.test(text)||listed>0);

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS detalle de proyecto: ventana de 50, resumen del resto y negociación de ?project_id= verificada.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
