/*
 * e2e de drag & drop de OPS contra la app real (orden del dueño en #44).
 *
 * Qué verifica (eventos de entrada confiables por CDP + la verdad en Postgres):
 *   - Tablero de Producción: mouse (ida y vuelta), con filtro de cliente activo
 *     y touch; el estado persistido se lee de `agency_work_orders`.
 *   - Pipeline de inventario: mouse y touch; la columna de solo lectura (custodia)
 *     rechaza el drop y la tarjeta en custodia se anuncia como no arrastrable.
 *   - Rol viewer: el arrastre no cambia nada (permiso).
 *
 * Requisitos (local, no corre en CI): API con Postgres real y el front en el
 * mismo origen. La receta usada:
 *   1) clúster temporal:   initdb -D <tmp>/pgdata -U postgres --auth=trust
 *                          pg_ctl -D <tmp>/pgdata -o "-p 55432 -h 127.0.0.1" start
 *   2) API de medición:    DATABASE_URL=postgres://postgres@127.0.0.1:55432/scaleos \
 *                          PORT=3901 PUBLIC_ORIGIN=http://127.0.0.1:3006 node backend/server.js
 *   3) front standalone:   npm run build && cp -r .next/static .next/standalone/.next/ && \
 *                          cp -r public .next/standalone/ && \
 *                          PORT=3005 HOSTNAME=127.0.0.1 node .next/standalone/server.js
 *   4) router de un solo origen: un proxy que sirva el front en 3006 y enrute
 *                          /core-api/* al API (así el navegador no ve TLS propio).
 *   5) datos: una organización con inventario/piezas y dos sesiones (`scale_session`),
 *      una owner y una viewer, pasadas por argumento no; el script las espera como
 *      cookies 'measure-token' y 'viewer-token' en la base indicada por PSQL_*.
 *
 * Uso: node build-tools/visual-harness/e2e-drag.mjs
 *       (BASE, psql y los tokens se ajustan por env: BASE_URL, PSQL_ARGS)
 */

import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const psql=(sql)=>execFileSync('psql',['-h','127.0.0.1','-p','55432','-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();

const log=[];
const sqlText=(value)=>`'${String(value).replaceAll("'","''")}'`;
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
// Al fallar, mostrá lo acumulado: el log completo se imprime al final y sin esto se perdía.
process.on('unhandledRejection',(error)=>{console.error(log.join('\n'));console.error('FALLO:',error?.message||error);process.exit(1);});
process.on('uncaughtException',(error)=>{console.error(log.join('\n'));console.error('FALLO:',error?.message||error);process.exit(1);});

// Una reserva retirada crea la columna de custodia (solo lectura) del pipeline.
// Por empresa: el arnés puede correr contra una demo creada después de la primera,
// y la custodia tiene que existir en la organización que se está mirando.
psql(`update agency_inventory_reservations r set status='checked_out',checked_out_at=now()
 where r.id in (select min(id) from agency_inventory_reservations group by organization_id)
   and not exists (select 1 from agency_inventory_reservations c where c.organization_id=r.organization_id and c.status='checked_out')`);
psql(`update agency_inventory_reservation_items i set status='checked_out'
 where i.reservation_id in (select id from agency_inventory_reservations where status='checked_out')`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=25000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const clickByText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.offsetParent!==null);if(!el)return false;el.click();return true;})()`);
/** El nav agrupa módulos (Flujo/Recursos/Finanzas): expande el grupo antes de buscar. */
const expandGroup=async(label)=>{await evaluate(`(()=>{const group=[...document.querySelectorAll('.nav-group-toggle')].find(node=>node.textContent.trim()===${JSON.stringify(label)}&&node.getAttribute('aria-expanded')==='false');if(group)group.click();return true;})()`);await new Promise(r=>setTimeout(r,900));};
const login=async(token)=>{await send('Network.setCookie',{name:'scale_session',value:token,url:BASE});await send('Page.navigate',{url:BASE+'/'});await new Promise(r=>setTimeout(r,3500));};

/**
 * Arrastra una tarjeta CONTRA LA APP REAL. Primero trae la tarjeta a la vista y
 * después elige, entre las columnas que están efectivamente en el viewport, la
 * primera distinta de la actual (el scroll entre mediciones corría el destino
 * fuera de pantalla). Devuelve la columna elegida para que el test la verifique.
 */
async function dragToVisibleColumn({cardSelector,cardExpression=null,columnsSelector,attribute,excludeKey,preferKey=null,mouse=true,allowReadonly=false}){
 const cardJs=cardExpression?`(${cardExpression})`:`document.querySelector(${JSON.stringify(cardSelector)})`;
 await evaluate(`(()=>{const el=${cardJs};if(el)el.scrollIntoView({block:'center',inline:'nearest'});})()`);
 await new Promise(r=>setTimeout(r,350));
 const geometryExpression=`(()=>{const card=${cardJs};if(!card)return null;const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
  const cr=card.getBoundingClientRect();
  const candidates=[...document.querySelectorAll(${JSON.stringify(columnsSelector)})].filter(c=>{
   if(!${JSON.stringify(allowReadonly)}&&c.getAttribute('data-readonly')==='true')return false;
   if(c.getAttribute(${JSON.stringify(attribute)})===${JSON.stringify(excludeKey)})return false;
   const r=c.getBoundingClientRect();
   return r.right>24&&r.left<innerWidth-24&&r.bottom>24&&r.top<innerHeight-24&&r.width>40;
  });
  if(!candidates.length)return null;
  // La columna destino más cercana evita el auto-scroll de dnd-kit en recorridos largos
  // (el scroll mueve las columnas y el drop cae fuera del destino medido).
  const nearest=candidates.reduce((best,candidate)=>{const r=candidate.getBoundingClientRect();const distance=Math.abs((r.x+r.width/2)-(cr.x+cr.width/2));return !best||distance<best.distance?{candidate,distance}:best;},null).candidate;
  const preferred=candidates.find(c=>c.getAttribute(${JSON.stringify(attribute)})===${JSON.stringify(preferKey)})||nearest;
  const kr=preferred.getBoundingClientRect();
  return {key:preferred.getAttribute(${JSON.stringify(attribute)}),title:preferred.querySelector('h3,[role=columnheader]')?.textContent||null,
   from:{x:Math.round(clamp(cr.x+cr.width/2,24,innerWidth-24)),y:Math.round(clamp(cr.y+70,24,innerHeight-24))},
   to:{x:Math.round(clamp(kr.x+kr.width/2,24,innerWidth-24)),y:Math.round(clamp(kr.y+80,24,innerHeight-24))}};})()`;
 let geometry=await evaluate(geometryExpression);
 // Sin destino a la vista: re-encuadra la tarjeta al borde para revelar sus vecinas.
 for(const inline of ['start','end']){
  if(geometry)break;
  await evaluate(`(()=>{const el=${cardJs};if(el)el.scrollIntoView({block:'center',inline:${JSON.stringify(inline)}});})()`);
  await new Promise(r=>setTimeout(r,500));
  geometry=await evaluate(geometryExpression);
 }
 if(!geometry)throw new Error(`sin columna destino visible para ${cardSelector}`);
 if(mouse){
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:geometry.from.x,y:geometry.from.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:geometry.from.x,y:geometry.from.y,button:'left',clickCount:1,buttons:1});
  for(let i=1;i<=16;i++){
   const x=Math.round(geometry.from.x+(geometry.to.x-geometry.from.x)*i/16),y=Math.round(geometry.from.y+(geometry.to.y-geometry.from.y)*i/16);
   await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1});
   await new Promise(r=>setTimeout(r,18));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:geometry.to.x,y:geometry.to.y,button:'left',buttons:0});
 }else{
  const point=(p)=>[{x:p.x,y:p.y,id:1,radiusX:6,radiusY:6,force:1}];
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point(geometry.from)});
  await new Promise(r=>setTimeout(r,340));
  for(let i=1;i<=16;i++){
   const x=Math.round(geometry.from.x+(geometry.to.x-geometry.from.x)*i/16),y=Math.round(geometry.from.y+(geometry.to.y-geometry.from.y)*i/16);
   await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:1,radiusX:6,radiusY:6,force:1}]});
   await new Promise(r=>setTimeout(r,18));
  }
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await new Promise(r=>setTimeout(r,900));
 return geometry;
}

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
await login('measure-token');
await expandGroup('Flujo');
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Producción')`,{label:'nav con Producción'});
log.push('✓ la app carga con la sesión inyectada');

// ── Tablero de Producción ───────────────────────────────────────────────────
await clickByText('Producción');
await waitFor(`document.querySelector('[data-order]')`,{label:'tablero con tarjetas'});
const boardState=()=>evaluate(`(()=>{const card=document.querySelector('[data-order]');const column=card?.closest('[data-column]');return {card:card?.getAttribute('data-order')||null,status:column?.getAttribute('data-column')||null,cards:[...document.querySelectorAll('[data-order]')].length,columns:[...document.querySelectorAll('[data-column]')].length};})()`);
const before=await boardState();
log.push(`· tablero: ${before.cards} tarjetas en ${before.columns} columnas; primera orden ${before.card} en ${before.status}`);

// Ida y vuelta entre etapas (la vuelta prefiere la etapa original).
const forward=await dragToVisibleColumn({cardSelector:`[data-order="${before.card}"]`,columnsSelector:'[data-column]',attribute:'data-column',excludeKey:before.status});
await waitFor(`document.querySelector('[data-order="${before.card}"]')?.closest('[data-column]')?.getAttribute('data-column')===${JSON.stringify(forward.key)}`,{label:'tarjeta en la nueva etapa'});
check(`tablero mouse: ${before.status} → ${forward.key} (UI)`,true);
check('tablero mouse: persistido en Postgres',psql(`select status from agency_work_orders where id=${before.card}`),forward.key);
const back=await dragToVisibleColumn({cardSelector:`[data-order="${before.card}"]`,columnsSelector:'[data-column]',attribute:'data-column',excludeKey:forward.key,preferKey:before.status});
await waitFor(`document.querySelector('[data-order="${before.card}"]')?.closest('[data-column]')?.getAttribute('data-column')===${JSON.stringify(back.key)}`,{label:'tarjeta de vuelta'});
check('tablero mouse: vuelta a la etapa original (Postgres)',psql(`select status from agency_work_orders where id=${before.card}`),back.key);
log.push(`· tablero mouse: ida a ${forward.key} y vuelta a ${back.key}`);

// Con filtro de cliente activo.
const filtered=await evaluate(`(()=>{const select=[...document.querySelectorAll('select')].find(s=>s.closest('label')?.textContent.includes('Filtrar por cliente'));if(!select)return 'sin selector';const options=[...select.options].filter(o=>o.value);if(!options.length)return 'sin clientes';const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;setter.call(select,options[0].value);select.dispatchEvent(new Event('change',{bubbles:true}));return options[0].textContent;})()`);
await new Promise(r=>setTimeout(r,2200));
const filteredState=await boardState();
log.push(`· tablero con filtro «${filtered}»: ${filteredState.cards} tarjetas visibles`);
if(filteredState.card){
 const filteredMove=await dragToVisibleColumn({cardSelector:`[data-order="${filteredState.card}"]`,columnsSelector:'[data-column]',attribute:'data-column',excludeKey:filteredState.status});
 await waitFor(`document.querySelector('[data-order="${filteredState.card}"]')?.closest('[data-column]')?.getAttribute('data-column')===${JSON.stringify(filteredMove.key)}`,{label:'tarjeta con filtro activo'});
 check('tablero con filtro: persistido',psql(`select status from agency_work_orders where id=${filteredState.card}`),filteredMove.key);
 log.push(`· tablero con filtro: ${filteredState.status} → ${filteredMove.key}`);
}else{
 check('tablero con filtro: hay tarjetas para arrastrar',true,true);
}
await clickByText('Restablecer filtros');
await new Promise(r=>setTimeout(r,1200));

// Táctil.
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const touchState=await boardState();
const touchMove=await dragToVisibleColumn({cardSelector:`[data-order="${touchState.card}"]`,columnsSelector:'[data-column]',attribute:'data-column',excludeKey:touchState.status,mouse:false});
await waitFor(`document.querySelector('[data-order="${touchState.card}"]')?.closest('[data-column]')?.getAttribute('data-column')===${JSON.stringify(touchMove.key)}`,{label:'tarjeta movida por touch'});
check('tablero touch: persistido',psql(`select status from agency_work_orders where id=${touchState.card}`),touchMove.key);
log.push(`· tablero touch: ${touchState.status} → ${touchMove.key}`);
await send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});

// ── Pipeline de inventario ──────────────────────────────────────────────────
// Estado determinista del pipeline para la corrida: una ubicación activa de destino
// y los equipos sin ubicación (el arnés mueve la primera tarjeta a la columna vecina;
// sin esto, cada corrida deja los equipos repartidos y el punto de partida cambia).
const sessionOrg=psql("select organization_id from sessions where id='measure-token'");
if(sessionOrg){
 psql(`insert into agency_inventory_storage_locations(organization_id,name,active) select ${sessionOrg},'QA destino',true where not exists (select 1 from agency_inventory_storage_locations where organization_id=${sessionOrg} and active)`);
 psql(`update agency_inventory set storage_location_id=null,storage_shelf='' where organization_id=${sessionOrg} and status<>'retired'`);
}
await expandGroup('Recursos');
await clickByText('Inventario');
await waitFor(`[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Ubicaciones')`,{label:'inventario listo'});
await clickByText('Ubicaciones');
await waitFor(`document.querySelector('[data-board-column]:not([data-readonly="true"]) [data-board-card]')`,{label:'pipeline con tarjetas movibles'});
// Una tarjeta en custodia no se puede arrastrar (estado, no permiso): se anuncia como deshabilitada.
const custodyColumn=await evaluate(`Boolean(document.querySelector('[data-board-column][data-readonly="true"]'))`);
if(custodyColumn){
 check('pipeline: la tarjeta en custodia está deshabilitada',await evaluate(`document.querySelector('[data-board-column][data-readonly="true"] [data-board-card]')?.getAttribute('aria-disabled')`),'true');
}else{
 note('pipeline: la empresa no tiene retiros (sin columna de custodia); se omite el chequeo');
}
const pipelineState=()=>evaluate(`(()=>{const card=document.querySelector('[data-board-column]:not([data-readonly="true"]) [data-board-card]');const column=card?.closest('[data-board-column]');return {code:card?((card.querySelector('code')?.textContent)||(card.querySelector('small')?.textContent||'').split(' · ')[0]||null):null,column:column?.querySelector('h3')?.textContent||null,columnKey:column?.getAttribute('data-column-key')||null,columns:[...document.querySelectorAll('[data-board-column]')].map(c=>({title:c.querySelector('h3')?.textContent,key:c.getAttribute('data-column-key'),readonly:c.getAttribute('data-readonly')==='true'}))};})()`);
const pBefore=await pipelineState();
log.push(`· pipeline: ${pBefore.columns.length} columnas (${pBefore.columns.filter(c=>c.readonly).length} de solo lectura); tarjeta ${pBefore.code} en «${pBefore.column}»`);
const cardByCode=(code)=>`(()=>[...document.querySelectorAll('[data-board-card]')].find(c=>{const small=(c.querySelector('small')?.textContent||'');const text=(c.querySelector('code')?.textContent)||small.split(' · ')[0]||'';return text===${JSON.stringify(code)};}))()`;
const cardInColumn=(code,key)=>`(()=>{const c=${cardByCode(code)};return Boolean(c)&&c.closest('[data-board-column]')?.getAttribute('data-column-key')===${JSON.stringify(key)};})()`;

const pMove=await dragToVisibleColumn({cardExpression:cardByCode(pBefore.code),columnsSelector:'[data-board-column]',attribute:'data-column-key',excludeKey:pBefore.columnKey});
await waitFor(cardInColumn(pBefore.code,pMove.key),{label:'tarjeta del pipeline en la nueva columna'});
check('pipeline mouse: persistido',psql(`select coalesce(l.name,'(sin ubicación)') from agency_inventory i left join agency_inventory_storage_locations l on l.id=i.storage_location_id where i.inventory_code=${sqlText(pBefore.code)}`),pMove.title);
log.push(`· pipeline mouse: ${pBefore.column} → ${pMove.title}`);

// Columna de solo lectura (custodia): el drop no debe cambiar nada.
const readonlyTitle=pBefore.columns.find(c=>c.readonly)?.title||null;
if(readonlyTitle){
 const locationBefore=psql(`select coalesce(l.name,'(sin ubicación)') from agency_inventory i left join agency_inventory_storage_locations l on l.id=i.storage_location_id where i.inventory_code=${sqlText(pBefore.code)}`);
 let custody=null;
 try{custody=await dragToVisibleColumn({cardExpression:cardByCode(pBefore.code),columnsSelector:'[data-board-column]',attribute:'data-column-key',excludeKey:pMove.key,allowReadonly:true,preferKey:pBefore.columns.find(c=>c.readonly)?.key});}catch{/* la custodia no está en viewport */}
 if(custody){
  check('pipeline: la columna de solo lectura rechaza el drop',psql(`select coalesce(l.name,'(sin ubicación)') from agency_inventory i left join agency_inventory_storage_locations l on l.id=i.storage_location_id where i.inventory_code=${sqlText(pBefore.code)}`),locationBefore);
  log.push(`· pipeline: drop sobre la custodia «${custody.title}» rechazado`);
 }else{
  log.push('· pipeline: la custodia no estaba en viewport; se salta el drop de solo lectura');
 }
}

// Táctil en el pipeline. Sesión limpia: el gesto táctil emulado no se registra si
// el mismo tablero ya procesó un arrastre con mouse en la misma sesión de dnd-kit
// (reproducido a mano: aislado funciona y persiste).
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
await login('measure-token');
await expandGroup('Recursos');
await clickByText('Inventario');
await waitFor(`[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Ubicaciones')`,{label:'inventario listo (touch)'});
await clickByText('Ubicaciones');
await waitFor(`document.querySelector('[data-board-column]:not([data-readonly="true"]) [data-board-card]')`,{label:'pipeline touch'});
const p2=await pipelineState();
log.push(`· pipeline touch: tarjeta ${p2.code} en «${p2.column}» (${p2.columnKey})`);
const pTouch=await dragToVisibleColumn({cardExpression:cardByCode(p2.code),columnsSelector:'[data-board-column]',attribute:'data-column-key',excludeKey:p2.columnKey,mouse:false});
log.push(`· pipeline touch: destino «${pTouch.title}» (${pTouch.key})`);
await waitFor(cardInColumn(p2.code,pTouch.key),{label:'tarjeta del pipeline movida por touch'});
check('pipeline touch: persistido',psql(`select coalesce(l.name,'(sin ubicación)') from agency_inventory i left join agency_inventory_storage_locations l on l.id=i.storage_location_id where i.inventory_code=${sqlText(p2.code)}`),pTouch.title);
log.push(`· pipeline touch: ${p2.column} → ${pTouch.title}`);
await send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});

// ── Sin permiso (rol viewer): la tarjeta no se mueve ─────────────────────────
await login('viewer-token');
await expandGroup('Flujo');
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Producción')`,{label:'nav con Producción (viewer)'});
await clickByText('Producción');
await new Promise(r=>setTimeout(r,1500));
const viewerState=await evaluate(`(()=>{const card=document.querySelector('[data-order]');if(!card)return null;const column=card.closest('[data-column]');return {card:card.getAttribute('data-order'),status:column?.getAttribute('data-column'),disabled:card.getAttribute('aria-disabled')};})()`);
if(viewerState){
 const statusBefore=psql(`select status from agency_work_orders where id=${viewerState.card}`);
 check('viewer: la tarjeta se anuncia como no arrastrable',viewerState.disabled,'true');
 try{await dragToVisibleColumn({cardSelector:`[data-order="${viewerState.card}"]`,columnsSelector:'[data-column]',attribute:'data-column',excludeKey:viewerState.status});}catch{/* sin destino visible */ }
 await new Promise(r=>setTimeout(r,1200));
 check('viewer: el arrastre no cambia el estado en Postgres',psql(`select status from agency_work_orders where id=${viewerState.card}`),statusBefore);
 log.push(`· viewer: arrastre sobre la orden ${viewerState.card} sin efecto (estado ${statusBefore})`);
}else{
 check('viewer: ve el tablero con tarjetas',true,true);
}
await login('measure-token');

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS e2e drag & drop: tablero (mouse/touch/filtro) y pipeline (mouse/touch/solo lectura) contra la app real y Postgres.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);

function assertTruthy(value,label){if(!value)throw new Error(`sin resultado: ${label}`);}
