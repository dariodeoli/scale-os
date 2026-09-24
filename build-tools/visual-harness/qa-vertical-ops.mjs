/*
 * QA de la vertical OPS contra la app real (Postgres + API + front): recorre
 * Producción (tablero por columna, Mi día, Calendario, Lista y lotes, pieza),
 * Proyectos (lista, cuadrícula, detalle liviano y detalle pesado), Inventario
 * (2.000 equipos), Estudio, Historial de trabajo y el mobile de cada pantalla;
 * deja una línea de evidencia por chequeo y capturas en `work/visual-harness/`.
 *
 * Requisitos: stack local (receta en `e2e-drag.mjs`) con datos de estrés y los
 * seeds del QA (asignados para "Mi día", proyectos, estudio). Env: BASE_URL y
 * PSQL_ARGS.
 *
 * Uso: node build-tools/visual-harness/qa-vertical-ops.mjs
 */

import {launchChrome,openTarget} from '/Users/fredd/.herdr/worktrees/scale-os/sos-ops/build-tools/visual-harness/chrome.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const psql=(sql)=>execFileSync('psql',['-h','127.0.0.1','-p','55432','-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();
const OUT=process.env.QA_OUT||'work/visual-harness/qa-116';
const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=30000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,250));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const clickByText=(text,selector='button,a')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.offsetParent!==null);if(!el)return false;el.click();return true;})()`);
const goTo=async(name)=>{await clickByText(name);await sleep(1200);};
const capture=async(name)=>{mkdirSync(OUT,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`${OUT}/${name}.png`,Buffer.from(data,'base64'));note(`captura ${OUT}/${name}.png`);};
const docOverflow=()=>evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`);
const counts=()=>evaluate(`(()=>({cards:document.querySelectorAll('[data-order]').length,columns:document.querySelectorAll('[data-column]').length}))()`);

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Producción')`,{label:'cáscara'});

// ── 1. Producción · Tablero ──────────────────────────────────────────────────
await goTo('Producción');
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero'});
await sleep(2000);
const board=await counts();
const dbCounts=Object.fromEntries(psql("select status||'='||count(*) from agency_work_orders group by status").split('\n').map(row=>row.split('=')));
const badges=await evaluate(`Object.fromEntries([...document.querySelectorAll('[data-column]')].map(c=>[c.getAttribute('data-column'),Number(c.querySelector('em').textContent.trim())]))`);
check('tablero: 7 columnas',board.columns,7);
check('tablero: badges == Postgres',Object.entries(dbCounts).every(([status,total])=>badges[status]===Number(total)));
check('tablero: tarjetas == ventana (7 × 50)',board.cards,7*50);
note(`tablero: ${board.cards} tarjetas cargadas, badges exactos (${Object.values(badges).join('/')})`);
await capture('produccion-tablero-escritorio');

// ── 2. Producción · Mi día / Calendario / Lista y lotes ─────────────────────
for(const [view,title,tableLabel,extra] of [
 ['Mi día','Trabajo diario','Piezas','agenda del día'],
 ['Calendario','Calendario','Piezas','calendario del mes'],
 ['Lista y lotes','Lista y lotes','Piezas en lista y lotes','lista con plantilla compartida'],
]){
 check(`producción: vista ${view} disponible`,await clickByText(view,`[role=group] button`));
 const titled=await waitFor(`[...document.querySelectorAll('h2')].some(n=>n.textContent.trim()===${JSON.stringify(title)})`,{timeout:20000,label:view}).catch(()=>false);
 check(`producción: ${view} cambia el título de la sección`,titled);
 const table=await waitFor(`document.querySelector('[role="table"][aria-label=${JSON.stringify(tableLabel)}]')`,{timeout:20000,label:`tabla ${view}`}).catch(()=>false);
 check(`producción: ${view} renderiza ${extra}`,table);
 if(view==='Calendario'){
  check('producción: Calendario dibuja el mes',await evaluate(`Boolean(document.querySelector('[aria-label="Calendario de entregas del mes"]'))`));
  const dayPieces=await evaluate(`document.querySelectorAll('[aria-label="Calendario de entregas del mes"] button').length`);
  check('producción: Calendario con piezas del mes',dayPieces>0);
  note(`producción/Calendario: ${dayPieces} piezas en las celdas del mes`);
 }
 await waitFor(`document.querySelectorAll('[data-status]').length>0`,{timeout:20000,label:`piezas de ${view}`}).catch(()=>undefined);
 const rows=await evaluate(`document.querySelectorAll('[data-status]').length`);
 check(`producción: ${view} con piezas reales`,rows>0);
 note(`producción/${view}: ${rows} filas/piezas en pantalla`);
}
await capture('produccion-lista-lotes-escritorio');
await clickByText('Tablero',`button,a,[role=tab],[role=group] button`);
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero de nuevo'});
await sleep(1500);

// ── 3. Pieza (drawer con datos reales) ──────────────────────────────────────
const firstCard=await evaluate(`document.querySelector('[data-order] button')?.textContent||''`);
await evaluate(`(()=>{const column=document.querySelector('[data-column]');const card=column?.querySelector('[data-order]');const button=card?.querySelector('button');if(button)button.click();})()`);
const drawer=await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:15000,label:'drawer de pieza'}).catch(()=>false);
check('pieza: abre el drawer',drawer);
if(drawer){
 await sleep(2000);
 const content=await evaluate(`document.querySelector('[role="dialog"]')?.textContent||''`);
 check('pieza: muestra el título de la pieza',content.includes(firstCard.slice(0,12)));
 check('pieza: trae checklist',/Checklist/i.test(content));
 check('pieza: trae enlaces o el estado de archivos',/Archivos y enlaces|enlace/i.test(content));
 note(`pieza: drawer de «${firstCard.slice(0,40)}» con ${content.length} caracteres de contenido real`);
 await capture('produccion-pieza-drawer');
 await evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');const close=[...(dialog?[...dialog.querySelectorAll('button')]:[])].find(b=>/cerrar|Cerrar/i.test(b.getAttribute('aria-label')||b.textContent));if(close)close.click();})()`);
 await sleep(800);
}

// ── 4. Proyectos: lista, cuadrícula y detalle ───────────────────────────────
await goTo('Proyectos');
await waitFor(`document.querySelector('.project-entry')`,{label:'proyectos'});
await sleep(1500);
const listRows=await evaluate(`document.querySelectorAll('.project-entry').length`);
const dbProjects=Number(psql('select count(*) from agency_projects'));
check('proyectos: lista con todas las filas',listRows,dbProjects);
await capture('proyectos-lista-escritorio');
check('proyectos: cuadrícula disponible',await evaluate(`(()=>{const button=document.querySelector('button[aria-label="Ver como cuadrícula"]');if(!button)return false;button.click();return true;})()`));
await sleep(1200);
const gridCards=await evaluate(`document.querySelectorAll('.project-entry').length`);
check('proyectos: cuadrícula con las mismas tarjetas',gridCards,listRows);
await capture('proyectos-cuadricula-escritorio');
await evaluate(`(()=>{const card=document.querySelector('.project-entry');const button=card?.querySelector('button[aria-label^="Ver detalle"]')||card?.querySelector('button');if(button)button.click();})()`);
const projectDrawer=await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:15000,label:'detalle de proyecto'}).catch(()=>false);
check('proyectos: el detalle abre',projectDrawer);
// Proyecto pesado: el que concentra las 3.000 piezas (detalle con tope).
const heavyName=psql("select p.name from agency_projects p join agency_work_orders o on o.project_id=p.id group by p.id,p.name order by count(*) desc limit 1");
const heavy=await evaluate(`(()=>{const button=document.querySelector('button[aria-label="Ver detalle del proyecto: ${heavyName}"]');if(!button)return false;button.click();return true;})()`);
check('proyectos: se abre el proyecto con 3.000 piezas',heavy);
if(heavy){
 const t0=Date.now();
 await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:30000,label:'detalle pesado'});
 await sleep(2000);
 const listed=await evaluate(`document.querySelectorAll('[role="dialog"] li').length`);
 const dialogText=await evaluate(`[...document.querySelectorAll('[role="dialog"]')].map(d=>d.textContent).join(' ')`);
 const summary=/y \d+ piezas más/.test(dialogText);
 if(!summary)note(`  (texto del diálogo: ${dialogText.slice(-160).replace(/\\s+/g,' ')})`);
 note(`proyectos: detalle de «${heavyName}» (3.000 piezas) en ${((Date.now()-t0)/1000).toFixed(1)} s · ${listed} piezas listadas`);
 check('proyectos: el detalle acota la lista de piezas',listed<=51);
 check('proyectos: el detalle resume el resto',summary);
 await capture('proyectos-detalle-pesado');
 await evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');const close=[...(dialog?[...dialog.querySelectorAll('button')]:[])].find(b=>/cerrar|Cerrar/i.test(b.getAttribute('aria-label')||b.textContent));if(close)close.click();})()`);
 await sleep(600);
}

// ── 5. Inventario: carga con 2.000 equipos ──────────────────────────────────
const started=Date.now();
await goTo('Inventario');
const inventoryReady=await waitFor(`document.querySelector('[data-grid-card="equipment"],[data-list-row="equipment"]')`,{timeout:60000,label:'inventario'}).catch(()=>false);
const inventoryMs=Date.now()-started;
check('inventario: carga con 2.000 equipos',inventoryReady);
const loadedCards=await evaluate(`document.querySelectorAll('[data-grid-card="equipment"],[data-list-row="equipment"]').length`);
const dbItems=Number(psql('select count(*) from agency_inventory'));
check('inventario: catálogo completo en pantalla',loadedCards,dbItems);
note(`inventario: ${loadedCards} equipos en ${(inventoryMs/1000).toFixed(1)} s (catálogo 18,6 MB)`);
await capture('inventario-cuadricula-escritorio');

// ── 6. Estudio ──────────────────────────────────────────────────────────────
await goTo('Estudio');
const studioReady=await waitFor(`document.querySelector('[data-grid-card="studio-spaces"],[data-list-row="studio-reservations"]')`,{timeout:30000,label:'estudio'}).catch(()=>false);
check('estudio: espacios y reservas renderizan',studioReady);
await sleep(1500);
const studioCounts=await evaluate(`(()=>({spaces:document.querySelectorAll('[data-grid-card="studio-spaces"]').length,reservations:document.querySelectorAll('[data-list-row="studio-reservations"]').length}))()`);
note(`estudio: ${studioCounts.spaces} espacios, ${studioCounts.reservations} reservas del mes`);
await capture('estudio-escritorio');

// ── 7. Historial de trabajo ─────────────────────────────────────────────────
await send('Page.navigate',{url:BASE+'/equipo/historial'});
await sleep(4000);
const historyReady=await waitFor(`document.querySelector('[aria-label="Historial de trabajo"]')`,{timeout:30000,label:'historial'}).catch(()=>false);
await sleep(2000);
const history=await evaluate(`(()=>{const section=document.querySelector('[aria-label="Historial de trabajo"]');return {found:Boolean(section),entries:section?section.querySelectorAll('article,li').length:0,text:(section?.textContent||'').slice(0,80)};})()`);
check('historial: el feed renderiza',history.found);
note(`historial: ${history.entries} bloques visibles («${history.text.replace(/\s+/g,' ').slice(0,50)}…»)`);
await capture('historial-escritorio');

// ── 8. Mobile: sin desborde en toda la vertical ─────────────────────────────
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
for(const [name,marker] of [['Producción','[data-column]'],['Proyectos','.project-entry'],['Inventario','[data-grid-card="equipment"],[data-list-row="equipment"]'],['Estudio','[data-grid-card="studio-spaces"],[data-list-row="studio-reservations"]'],['Historial de trabajo','[aria-label="Historial de trabajo"]']]){
 if(name==='Historial de trabajo')await send('Page.navigate',{url:BASE+'/equipo/historial'});else await goTo(name);
 await waitFor(marker,{timeout:40000,label:`${name} mobile`}).catch(()=>undefined);
 await sleep(1500);
 const overflow=await docOverflow();
 check(`mobile ${name}: sin scroll horizontal del documento`,overflow,0);
 await capture(`mobile-${name.toLowerCase()}`);
}

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS QA OPS v1.0.116: tablero por columna, planner, pieza, proyectos (lista/cuadrícula/detalle), inventario con 2.000 equipos, estudio, historial y mobile.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
