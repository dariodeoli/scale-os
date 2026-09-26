/*
 * Ronda 14 OPS (#62): verificación de los contratos del tablero de Producción,
 * la toolbar de Inventario y los vacíos con CTA contra una app real.
 *
 * Requisitos: stack local (receta de `e2e-drag.mjs`/`e2e-com-stack.mjs`) con
 * una empresa con datos y una empresa vacía. Env:
 *   BASE_URL      (default http://127.0.0.1:3018)
 *   SESSION       cookie `scale_session` de la empresa con órdenes
 *   SESSION_EMPTY cookie de una empresa SIN órdenes, espacios ni reservas
 *
 * Uso: BASE_URL=... SESSION=... SESSION_EMPTY=... \
 *      node build-tools/visual-harness/verify-ronda14-ops.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3018';
const SESSION=process.env.SESSION||'';
const SESSION_EMPTY=process.env.SESSION_EMPTY||'';
const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

if(!SESSION)throw new Error('Falta SESSION');
const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=30000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const consoleErrors=[];
cdp.on('Runtime.exceptionThrown',event=>consoleErrors.push(String(event.exceptionDetails?.exception?.description||event.exceptionDetails?.text||'').slice(0,200)));
cdp.on('Runtime.consoleAPICalled',event=>{if(event.type==='error')consoleErrors.push((event.args||[]).map(a=>a.value??a.description??'').join(' ').slice(0,200));});
const login=async(token)=>{await send('Network.setCookie',{name:'scale_session',value:token,url:BASE});};
const go=async(path,wait,label)=>{await send('Page.navigate',{url:BASE+path});if(wait)await waitFor(wait,{label:label||path});await sleep(800);};

await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

// 1) Tablero: indicador del riel, flechas y conteos reales contra la API.
await login(SESSION);
await go('/produccion',`document.querySelectorAll('[data-column]').length===7`,'tablero');
await waitFor(`(()=>{const em=document.querySelector('[data-column] em');return em&&em.textContent.trim()&&em.textContent.trim()!=='…';})()`,{label:'badges'});
const board=await evaluate(`(()=>{const columns=[...document.querySelectorAll('[data-column]')];const region=columns[0].parentElement;return {badges:Object.fromEntries(columns.map(c=>[c.getAttribute('data-column'),Number(c.querySelector('em').textContent.trim())])),indicator:document.querySelector('[data-board-window]')?.textContent.trim()||null,scrollWidth:region.scrollWidth,clientWidth:region.clientWidth,scrollLeft:Math.round(region.scrollLeft),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};})()`);
const counts=JSON.parse(await evaluate(`fetch('/core-api/api/agency/work-orders?counts=1&limit=1&fields=id',{credentials:'include'}).then(r=>r.json()).then(d=>JSON.stringify(d.stage_counts||{}))`));
check('tablero: indicador de bloques visible',/^Etapas? \d+(–\d+)? de 7$/.test(board.indicator||''),true);
check('tablero: badges == ?counts=1',JSON.stringify(board.badges),JSON.stringify(counts));
check('tablero: sin overflow del documento',board.overflow,0);
check('tablero: el riel scrollea',board.scrollWidth>board.clientWidth,true);
const arrow=await evaluate(`(()=>{const b=document.querySelector('[data-board-next]');if(!b)return false;b.click();return true;})()`);
check('tablero: flecha siguiente disponible',arrow,true);
await sleep(900);
const moved=await evaluate(`Math.round(document.querySelector('[data-column]').parentElement.scrollLeft)`);
check('tablero: la flecha avanza el riel',moved>board.scrollLeft,true);
note(`tablero: ${JSON.stringify(board.badges)} · scroll ${board.scrollLeft}→${moved}`);

// 2) Inventario: toolbar compacta y CTA de valor.
await go('/inventario',`document.querySelector('[data-grid-card="equipment"],[data-list-row="equipment"]')`,'inventario');
await sleep(1000);
const inventory=await evaluate(`(()=>{const card=document.querySelector('[aria-label="Vistas de inventario"]')?.closest('div.p-5');const rect=card?.getBoundingClientRect();return {height:rect?Math.round(rect.height):null,search:Boolean(document.querySelector('[aria-label="Buscar equipo o ubicación"]')),view:Boolean(document.querySelector('[aria-label="Vista de inventario"]')),counter:[...document.querySelectorAll('p[role="status"]')].map(p=>p.textContent.trim()).find(t=>/\\d+ de \\d+ equipos/.test(t))||null};})()`);
check('inventario: búsqueda, filtro y vista en la toolbar',inventory.search&&inventory.view,true);
check('inventario: contador "N de M equipos"',/\d+ de \d+ equipos/.test(inventory.counter||''),true);
check('inventario: toolbar compacta (≤ 200 px)',inventory.height!==null&&inventory.height<=200,true);
note(`inventario: toolbar ${inventory.height}px · ${inventory.counter}`);

// 3) Estudio vacío: bloque compacto con "Agregar espacio" primario.
await go('/estudio',`document.body.textContent.includes('Todavía no hay espacios')||document.querySelector('[data-grid-card="studio-spaces"]')`,'estudio');
const studio=await evaluate(`(()=>{const empty=[...document.querySelectorAll('p')].find(p=>/Todavía no hay espacios/.test(p.textContent||''));const card=empty?.closest('div.rounded-xl');const cta=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Agregar espacio');return {height:card?Math.round(card.getBoundingClientRect().height):null,cta:Boolean(cta),primary:cta?String(cta.className).split(' ').includes('bg-fono'):false,calendar:document.body.textContent.includes('Calendario del estudio')};})()`);
check('estudio: vacío compacto (≤ 320 px)',studio.height!==null&&studio.height<=320,true);
check('estudio: "Agregar espacio" protagonista (primario)',studio.primary,true);
check('estudio: sin espacios ni reservas no dibuja el calendario',studio.calendar,false);
note(`estudio: bloque vacío ${studio.height}px`);

// 4) Empresa vacía: tablero sin siete columnas y con CTA.
if(SESSION_EMPTY){
 await login(SESSION_EMPTY);
 await go('/produccion',`document.querySelector('#produccion [role="status"]')`,'tablero vacío');
 await sleep(1200);
 const empty=await evaluate(`(()=>{const section=document.querySelector('#produccion');return {columns:document.querySelectorAll('[data-column]').length,counter:[...document.querySelectorAll('p[role="status"]')].map(p=>p.textContent.trim()).find(t=>/Sin órdenes|Cargando|órdenes/.test(t))||null,cta:Boolean([...document.querySelectorAll('main button')].find(b=>/Nueva pieza/.test(b.textContent||''))),text:(section?.textContent||'').replace(/\\s+/g,' ').trim().slice(0,90)};})()`);
 check('vacío: no se dibujan siete columnas vacías',empty.columns,0);
 check('vacío: el contador dice "Sin órdenes"',empty.counter,'Sin órdenes');
 check('vacío: CTA "Nueva pieza"',empty.cta,true);
 note(`vacío: «${empty.text}»`);
}

check('consola sin errores',consoleErrors.length,0);
console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ verificación ronda 14 OPS':'PASS ronda 14 OPS: riel medido, toolbar compacta y vacíos con CTA.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
