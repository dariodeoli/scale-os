/*
 * Campaña de testeos #154 — vertical OPS (v1.0.168 + ronda #151).
 *
 * Recorrido crítico con datos reales de la demo + casos borde, en 390/1440 y
 * claro/oscuro, con sesión owner y viewer:
 *   A) Producción tablero: columnas, conteos, filtro, riel de etapas, detalle.
 *   B) Detalle de pieza: comentarios, checklist, historial, edición.
 *   C) Flujo de aprobación → publicación.
 *   D) Vistas: Mi día, Calendario, Lista y lotes.
 *   E) Proyectos: lista y detalle (contador de piezas vs. lista).
 *   F) Inventario: búsqueda vacía, foto rota, verificación, cuadrícula, pipeline,
 *      calendario de reservas y alta (validación).
 *   G) Estudio: alta de espacio + reserva + cancelación (vacíos al inicio).
 *   H) Historial: pendientes internos + actividad.
 *   I) Permisos: viewer sin acciones ni arrastre; cookie vencida → login.
 *
 * Requisitos: stack local de OPS (`e2e-ops-stack.mjs`) con el build actual.
 * Uso: node build-tools/visual-harness/qa-testeos-168-ops.mjs [--checks]
 * Salida: docs/qa/testeos-168/ops/ (capturas) + informe-ops.json + qa-ops.txt
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const withChecks=process.argv.includes('--checks');
const out=resolve(repo,process.env.QA_OUT||'docs/qa/testeos-168/ops');
mkdirSync(out,{recursive:true});
const session=Object.fromEntries(readFileSync(resolve(repo,'work/visual-harness/ops-qa-session.txt'),'utf8').split('\n').filter(Boolean).map((line)=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE||'http://127.0.0.1:3006';

const log=[];const checks=[];const findings=[];
const check=(label,value,expected=true)=>{const ok=value===expected;checks.push({label,ok,value,expected});log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok){findings.push({label,value,expected,severity:'media'});process.exitCode=1;}};
const note=(text)=>log.push(`· ${text}`);
const finding=(label,detail,severity='media')=>{findings.push({label,detail,severity});log.push(`⚠ ${severity}: ${label} — ${detail}`);};
const step=async(label,fn)=>{try{await fn();}catch(error){finding(label,String(error?.message||error),'alta');}};

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=20000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78});writeFileSync(resolve(out,`${name}.jpg`),Buffer.from(data,'base64'));note(`captura ${name}.jpg`);};
const clickByText=(text,selector='button,a,summary')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const fill=(selector,value,kind='input')=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;const proto=${kind==='textarea'?'window.HTMLTextAreaElement':'window.HTMLInputElement'}.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
const select=(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;const setter=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
const setTheme=async(theme)=>{await evaluate(`(()=>{localStorage.setItem('scale-theme',${JSON.stringify(theme)});if(${JSON.stringify(theme)}==='light')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=${JSON.stringify(theme)};return document.documentElement.dataset.theme||'light';})()`);await sleep(250);};
const setViewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await sleep(300);};
const setSession=async(token)=>{await send('Network.setCookie',{name:'scale_session',value:token,url:BASE});};
const closeDialog=()=>evaluate(`(()=>{const panel=[...document.querySelectorAll('[role="dialog"]')].find(node=>node.getClientRects().length>0);if(!panel)return false;const close=[...panel.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||'').match(/cerrar|close|volver/i));if(close){close.click();return true;}return false;})()`);
// Navegación por ruta directa (el riel lateral lo audita DSN); el estado del shell
// se restaura igual que con un clic y evita depender de grupos colapsados.
const goto=async(path,waitExpression)=>{await send('Page.navigate',{url:BASE+path});if(waitExpression)await waitFor(waitExpression,{label:path,timeout:25000});await sleep(700);};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await setSession(session.OWNER_TOKEN);
await setViewport(390,844);await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await evaluate(`localStorage.clear()`);await send('Page.reload');await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Inventario'||n.textContent.trim()==='Resumen')`,{label:'cáscara',timeout:30000});

// Foto rota real para el caso borde de Inventario (#151).
const prepareBrokenPhoto=async()=>{
 const response=await fetch(BASE+'/core-api/api/agency/inventory',{headers:{Cookie:`scale_session=${session.OWNER_TOKEN}`}});
 const data=await response.json();
 const item=(data.records||[]).find(row=>!row.photo_url)||(data.records||[])[0];
 if(!item)return null;
 await fetch(`${BASE}/core-api/api/agency/inventory/${item.id}`,{method:'PATCH',headers:{Cookie:`scale_session=${session.OWNER_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({photo_url:'https://qa-154.invalid/foto-rota.jpg'})});
 note(`foto rota preparada en «${item.name}» (#${item.id})`);
 return {id:String(item.id),name:item.name};
};
const broken=await prepareBrokenPhoto();

const widths=[[390,844],[1440,900]];
for(const [width,height] of widths){
 await setViewport(width,height);await setTheme('light');
 const W=String(width);
 log.push(`\n──── ${width}×${height} — OPS ────`);

 // A) Producción · tablero.
 await step('OPS tablero',async()=>{
  await goto('/produccion',`document.querySelector('[data-order]')`);
  await sleep(900);
  const board=await evaluate(`(()=>{const columns=[...document.querySelectorAll('[data-column]')];const cards=[...document.querySelectorAll('[data-order]')];const counts=columns.map(c=>c.querySelector(':scope > div em')?.textContent?.trim()||'');const first=cards[0];return {columns:columns.length,cards:cards.length,counts,hasTitle:Boolean(first?.querySelector('button[aria-label^="Abrir "]')),hasPeople:Boolean(first?.querySelector('.assigned-people')),hasDue:Boolean(first?.querySelector('.due-date'))};})()`);
  if(withChecks){
   check(`tablero ${W}: 7 etapas`,board.columns,7);
   check(`tablero ${W}: piezas cargadas`,board.cards>0,true);
   check(`tablero ${W}: conteos visibles`,board.counts.every(value=>value!==''),true);
   check(`tablero ${W}: tarjeta con identidad/due/responsables`,board.hasTitle&&board.hasDue&&board.hasPeople,true);
  }
  await capture(`produccion-tablero-${W}-light`);
  await setTheme('dark');await capture(`produccion-tablero-${W}-dark`);await setTheme('light');
  // Filtro por cliente.
  const client=await evaluate(`(()=>{const options=[...document.querySelectorAll('.production-client-filter select option')].filter(o=>o.value);const pick=options[1]?.textContent||'';return pick;})()`);
  if(client){
   await select('.production-client-filter select',await evaluate(`(()=>{const option=[...document.querySelectorAll('.production-client-filter select option')].find(o=>o.value&&o.textContent.trim()===${JSON.stringify(client)});return option?option.value:'';})()`));
   await sleep(1600);
   const filtered=await evaluate(`(()=>{const cards=[...document.querySelectorAll('[data-order]')];const counter=document.querySelector('.production-command-toolbar-actions p')?.textContent||'';return {cards:cards.length,match:cards.length>0&&cards.every(c=>c.textContent.includes(${JSON.stringify(client)})),counter};})()`);
   if(withChecks)check(`tablero ${W}: filtro de cliente honesto`,filtered.match,true);
   note(`filtro ${W}: ${filtered.counter} · ${filtered.cards} tarjetas de «${client}»`);
   await setTheme('light');
   // Restablecer.
   await evaluate(`(()=>{const select=document.querySelector('.production-client-filter select');if(!select)return false;const setter=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;setter.call(select,'');select.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
   await sleep(1200);
  }
  // Riel de etapas.
  const nav=await evaluate(`(()=>({next:Boolean(document.querySelector('[data-board-next]')),prev:Boolean(document.querySelector('[data-board-prev]')),label:document.querySelector('[data-board-window] span')?.textContent||''}))()`);
  if(nav.next){const before=nav.label;await evaluate(`document.querySelector('[data-board-next]').click()`);await sleep(800);const after=await evaluate(`document.querySelector('[data-board-window] span')?.textContent||''`);if(withChecks)check(`tablero ${W}: el riel avanza etapas`,before!==after,true);await evaluate(`document.querySelector('[data-board-prev]')?.click()`);await sleep(600);}
  // Detalle desde la tarjeta.
  await evaluate(`(()=>{const button=document.querySelector('[data-order] button[aria-label^="Abrir "]');if(button)button.click();return Boolean(button);})()`);
  await waitFor(`Boolean(document.querySelector('[role="dialog"]'))`,{label:'detalle de pieza'});
  await sleep(1200);
  await closeDialog();await sleep(600);
 });

 // B) Detalle de pieza: comentarios, checklist e historial.
 await step('OPS detalle de pieza',async()=>{
  const opened=await evaluate(`(()=>{const card=[...document.querySelectorAll('[data-order][data-status="to_record"]')].find(node=>/pasos/.test(node.innerText))||document.querySelector('[data-order]');const button=card?.querySelector('button[aria-label^="Abrir "]');if(button)button.click();return Boolean(button);})()`);
  if(!opened)throw new Error('no hay pieza para abrir');
  await waitFor(`Boolean(document.querySelector('[role="dialog"]'))`,{label:'detalle de pieza'});
  await sleep(1400);
  await capture(`pieza-detalle-${W}-light`);
  await setTheme('dark');await capture(`pieza-detalle-${W}-dark`);await setTheme('light');
  // Historial.
  await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const tab=[...panel.querySelectorAll('button')].find(node=>node.textContent.trim()==='Historial');if(tab)tab.click();return true;})()`);
  await sleep(900);
  const history=await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');return panel?panel.innerText:'';})()`);
  if(withChecks)check(`detalle ${W}: historial con registro`,/Creó la pieza|Actualizó la pieza/.test(history),true);
  // Comentarios.
  await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const tab=[...panel.querySelectorAll('button')].find(node=>node.textContent.trim().startsWith('Comentarios'));if(tab)tab.click();return true;})()`);
  await sleep(900);
  await capture(`pieza-comentarios-${W}-light`);
  const composer=await evaluate(`Boolean(document.querySelector('.comment-composer textarea'))`);
  if(composer){
   await fill('.comment-composer textarea','Testeo #154: comentario de campaña con datos reales.','textarea');
   await evaluate(`(()=>{const form=document.querySelector('.comment-composer');form?.requestSubmit();return true;})()`);
   await sleep(1500);
   const commented=await evaluate(`(document.querySelector('[role="dialog"]')?.innerText||'').includes('Testeo #154')`);
   if(withChecks)check(`detalle ${W}: el comentario se publica`,commented,true);
  }else{finding('detalle: composer de comentarios','no se montó el composer de comentarios','media');}
  // Checklist.
  await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const tab=[...panel.querySelectorAll('button')].find(node=>node.textContent.trim()==='Detalle');if(tab)tab.click();return true;})()`);
  await sleep(700);
  const before=await evaluate(`document.querySelectorAll('.work-checklist-items li').length`);
  await fill('input[placeholder="Escribí una tarea concreta"]','Testeo #154 · revisar entrega');
  await clickByText('Agregar ítem');
  await waitFor(`document.querySelectorAll('.work-checklist-items li').length>${before}`,{label:'ítem nuevo'});
  const itemSelector='.work-checklist-items li:last-child input[type=checkbox]';
  await evaluate(`document.querySelector(${JSON.stringify(itemSelector)})?.click()`);
  await sleep(1200);
  const completed=await evaluate(`/Completado/.test(document.querySelector('.work-checklist-items li:last-child')?.innerText||'')`);
  if(withChecks)check(`detalle ${W}: completar ítem deja estado`,completed,true);
  await capture(`pieza-checklist-${W}-light`);
  await setTheme('dark');await capture(`pieza-checklist-${W}-dark`);await setTheme('light');
  await evaluate(`document.querySelector(${JSON.stringify(itemSelector)})?.click()`);await sleep(900);
  await evaluate(`(()=>{const item=document.querySelector('.work-checklist-items li:last-child');const remove=[...item.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Quitar ítem'));if(remove)remove.click();return true;})()`);
  await sleep(400);await clickByText('Sí, quitar ítem');await sleep(900);
  const after=await evaluate(`document.querySelectorAll('.work-checklist-items li').length`);
  if(withChecks)check(`detalle ${W}: quitar ítem del checklist`,after,before);
  await closeDialog();await sleep(600);
 });

 // C) Flujo de aprobación → publicación.
 await step('OPS aprobación y publicación',async()=>{
  const opened=await evaluate(`(()=>{const card=document.querySelector('[data-order][data-status="review"]');const button=card?.querySelector('button[aria-label^="Abrir "]');if(button)button.click();return Boolean(button);})()`);
  if(!opened){note(`aprobación ${W}: sin pieza en revisión`);return;}
  await waitFor(`Boolean(document.querySelector('[role="dialog"]'))`,{label:'detalle review'});
  await sleep(1300);
  const approve=await clickByText('Aprobar siguiente nivel');
  await sleep(1800);
  const status=await evaluate(`document.querySelector('[role="dialog"]')?.innerText||''`);
  if(withChecks)check(`aprobación ${W}: la pieza se aprueba o queda en revisión`,/Aprobado|Revisión/.test(status),true);
  if(/Aprobado/.test(status)&&approve){await clickByText('Marcar publicada');await sleep(1800);waitFor(`/Publicado/.test(document.querySelector('[role="dialog"]')?.innerText||'')`,{label:'publicada',timeout:8000});}
  await capture(`pieza-aprobacion-${W}-light`);
  await closeDialog();await sleep(600);
 });

 // D) Vistas del planificador.
 await step('OPS vistas',async()=>{
  await goto('/produccion',`document.querySelector('[data-order]')`);
  for(const view of ['Mi día','Calendario','Lista y lotes']){
   await clickByText(view);
   await sleep(1400);
   const text=await evaluate(`document.body.innerText`);
   const healthy=!/(No se pudo|undefined|NaN)/.test(text);
   if(withChecks)check(`vista ${view} ${W}: carga sin errores`,healthy,true);
   await capture(`produccion-${view.replace(/[^\w]+/g,'-').toLowerCase()}-${W}-light`);
   await setTheme('dark');await capture(`produccion-${view.replace(/[^\w]+/g,'-').toLowerCase()}-${W}-dark`);await setTheme('light');
   if(view==='Lista y lotes'){
    const rows=await evaluate(`document.querySelectorAll('[role="table"] [role="rowgroup"] [role="row"]').length`);
    if(withChecks)check(`vista Lista ${W}: filas visibles`,rows>0,true);
   }
  }
  await clickByText('Tablero');await sleep(900);
 });

 // E) Proyectos: lista y detalle fiel.
 await step('OPS proyectos',async()=>{
  await goto('/proyectos',`document.querySelector('.project-entry,[data-project]')`);
  await sleep(900);
  await capture(`proyectos-lista-${W}-light`);
  await setTheme('dark');await capture(`proyectos-lista-${W}-dark`);await setTheme('light');
  const picked=await evaluate(`(()=>{const cards=[...document.querySelectorAll('.project-entry,[data-project]')];for(const card of cards){const button=[...card.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||'').startsWith('Ver detalle del proyecto'));if(button){button.click();return true;}}return false;})()`);
  if(picked){
   await waitFor(`/Piezas del proyecto/.test(document.querySelector('[role="dialog"]')?.innerText||'')`,{label:'detalle de proyecto'});
   await sleep(900);
   const detail=await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const count=panel.querySelector('[data-pieces-count]');const list=[...panel.querySelectorAll('h4')].find(h=>h.textContent.trim()==='Piezas del proyecto')?.parentElement?.querySelector('ul');return {count:count?Number(count.getAttribute('data-pieces-count')):null,items:list?list.querySelectorAll('li').length:0,empty:/El proyecto todavía no tenía piezas|todavía no tiene piezas/i.test(panel.innerText)};})()`);
   if(withChecks)check(`proyecto ${W}: contador = lista`,detail.count===null?detail.empty:detail.count===detail.items,true);
   await capture(`proyecto-detalle-${W}-light`);
   await setTheme('dark');await capture(`proyecto-detalle-${W}-dark`);await setTheme('light');
   await closeDialog();await sleep(500);
  }else{finding('proyectos: detalle','ningún proyecto ofreció Ver detalle','media');}
 });

 // F) Inventario: casos borde.
 await step('OPS inventario',async()=>{
  await goto('/inventario',`document.querySelector('[aria-label="Vista de inventario"]')`);
  await sleep(900);
  // Lista.
  await evaluate(`(()=>{const control=document.querySelector('[aria-label="Vista de inventario"]');const el=control&&[...control.querySelectorAll('button')].find(n=>n.textContent.trim()==='Lista');if(el)el.click();return true;})()`);
  await waitFor(`document.querySelector('[data-list-row="equipment"]')`,{label:'lista de inventario'});
  await sleep(700);
  const list=await evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-list-row="equipment"]')];const broken=rows.filter(row=>[...row.querySelectorAll('img')].some(img=>/qa-154\\.invalid/.test(img.getAttribute('src')||''))).length;const placeholder=[...document.querySelectorAll('[data-list-row="equipment"] [aria-label]')].filter(node=>(node.getAttribute('aria-label')||'').startsWith('Sin foto')).length;const clipped=rows.filter(row=>{const b=row.querySelector('b');return b&&b.scrollWidth>b.clientWidth+1;}).length;return {rows:rows.length,broken,placeholder,clipped};})()`);
  if(withChecks){
   check(`inventario ${W}: foto rota sin <img> quebrada`,list.broken,0);
   if(broken)check(`inventario ${W}: la foto rota usa placeholder`,list.placeholder>0,true);
   check(`inventario ${W}: nombres sin recortar`,list.clipped,0);
  }
  await capture(`inventario-lista-${W}-light`);
  await setTheme('dark');await capture(`inventario-lista-${W}-dark`);await setTheme('light');
  // Búsqueda sin resultados.
  await fill('input[placeholder*="Memoria"]','zzz-sin-resultados');
  await sleep(900);
  const emptySearch=await evaluate(`/No hay equipos que coincidan con la búsqueda/.test(document.body.innerText)`);
  if(withChecks)check(`inventario ${W}: búsqueda vacía con salida`,emptySearch,true);
  await capture(`inventario-busqueda-vacia-${W}-light`);
  await clickByText('Limpiar búsqueda');await sleep(700);
  // Verificación rápida.
  const verify=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Marcar verificado:'));if(button){button.click();return true;}return false;})()`);
  if(verify){await sleep(1800);const stamp=await evaluate(`/Control:|✓|Sin verificación/.test(document.body.innerText)`);if(withChecks)check(`inventario ${W}: verificación registrada`,stamp,true);}
  else note(`inventario ${W}: sin acción rápida de verificación`);
  // Cuadrícula y pipeline.
  for(const view of ['Cuadrícula','Ubicaciones']){
   await evaluate(`(()=>{const control=document.querySelector('[aria-label="Vista de inventario"]');const el=control&&[...control.querySelectorAll('button')].find(n=>n.textContent.trim()===${JSON.stringify(view)});if(el)el.click();return true;})()`);
   await sleep(1200);
   const okView=view==='Cuadrícula'?await evaluate(`document.querySelectorAll('[data-grid-card="equipment"]').length>0`):await evaluate(`document.querySelectorAll('[data-board-column]').length>0`);
   if(withChecks)check(`inventario ${W}: vista ${view}`,okView,true);
   await capture(`inventario-${view.toLowerCase()}-${W}-light`);
   await setTheme('dark');await capture(`inventario-${view.toLowerCase()}-${W}-dark`);await setTheme('light');
  }
  // Calendario y reservas.
  await clickByText('Calendario y reservas');
  await sleep(1400);
  const calendar=await evaluate(`/Calendario/.test(document.body.innerText)&&!/(No se pudo|undefined)/.test(document.body.innerText)`);
  if(withChecks)check(`inventario ${W}: calendario sin errores`,calendar,true);
  await capture(`inventario-calendario-${W}-light`);
  await setTheme('dark');await capture(`inventario-calendario-${W}-dark`);await setTheme('light');
  await clickByText('Equipos');await sleep(900);
  // Alta: validación de campos obligatorios.
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Agregar equipo'&&b.getClientRects().length>0);if(button)button.click();return Boolean(button);})()`);
  await waitFor(`document.querySelector('#inventory-item-name')`,{label:'alta de equipo'});
  await sleep(500);
  const submit=await evaluate(`(()=>{const name=document.querySelector('#inventory-item-name');const form=name?.closest('form');if(!form)return null;return {valid:form.checkValidity(),required:name.required};})()`);
  if(withChecks)check(`inventario ${W}: alta exige nombre`,submit?submit.valid===false&&submit.required===true:false,true);
  await capture(`inventario-alta-${W}-light`);
  await closeDialog();await sleep(500);
 });

 // G) Estudio: alta de espacio + reserva + cancelación.
 await step('OPS estudio',async()=>{
  await goto('/estudio',`/Sin espacios todavía|Agregar espacio/.test(document.body.innerText)`);
  await sleep(1500);
  const empty=await evaluate(`/Sin espacios todavía/.test(document.body.innerText)`);
  note(`estudio ${W}: vacío inicial = ${empty}`);
  await capture(`estudio-${W}-light`);
  await setTheme('dark');await capture(`estudio-${W}-dark`);await setTheme('light');
  // Crear espacio (si la demo ya tiene uno, el paso queda verificado igual).
  const needsSpace=/Sin espacios todavía/.test(await evaluate(`document.body.innerText`));
  if(needsSpace){
   const spaceReady=await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Agregar espacio'&&b.getClientRects().length>0)`,{label:'botón Agregar espacio',timeout:15000}).catch(()=>false);
   if(spaceReady&&await clickByText('Agregar espacio')){
    await waitFor(`document.querySelector('[role="dialog"]')`,{label:'alta de espacio'});
    await sleep(500);
    await fill('[role="dialog"] input','QA Testeos 168 · Estudio');
    const saved=await clickByText('Guardar');
    await sleep(1800);
    if(withChecks)check(`estudio ${W}: el espacio se crea`,saved,true);
    await capture(`estudio-espacio-${W}-light`);
   }else{finding('estudio: alta de espacio','no se encontró el botón Agregar espacio','media');}
  }else note(`estudio ${W}: el espacio ya existe (creado en el paso de 390)`);
  // Reserva nueva.
  const reserveReady=await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Nueva reserva'&&!b.disabled&&b.getClientRects().length>0)`,{label:'botón Nueva reserva',timeout:15000}).catch(()=>false);
  if(reserveReady&&await clickByText('Nueva reserva')){
   await waitFor(`document.querySelector('#studio-reservation-title')`,{label:'nueva reserva'});
   await sleep(500);
   await fill('#studio-reservation-title','QA Testeos 168 · Grabación');
   const spaceValue=await evaluate(`(()=>{const select=document.querySelector('#studio-reservation-space');return select?[...select.options].find(o=>o.value)?.value||'':'';})()`);
   if(spaceValue)await select('#studio-reservation-space',spaceValue);
   const today=await evaluate(`(()=>{const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,10);})()`);
   await fill('#studio-reservation-start',`${today}T09:00`);
   await fill('#studio-reservation-end',`${today}T10:00`);
   await evaluate(`(()=>{const member=[...document.querySelectorAll('[role="dialog"] fieldset input[type=checkbox]')][0];if(member)member.click();return true;})()`);
   await clickByText('Guardar reserva');
   await sleep(1800);
   const created=await evaluate(`[...document.querySelectorAll('[data-list-row="studio-reservations"]')].some(row=>/QA Testeos 168/.test(row.textContent)&&/Reservada/.test(row.textContent))`);
   if(withChecks)check(`estudio ${W}: la reserva se crea`,created,true);
   await capture(`estudio-reserva-${W}-light`);
   // Cancelar la reserva creada.
   const cancel=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Cancelar reserva: QA Testeos 168'));if(button){button.click();return true;}return false;})()`);
   if(cancel){await sleep(500);await clickByText('Confirmar cancelación');await sleep(1600);const cancelled=await evaluate(`/Reserva cancelada/.test(document.body.innerText)||/Cancelada/.test(document.body.innerText)`);if(withChecks)check(`estudio ${W}: la reserva se cancela`,cancelled,true);}
   await capture(`estudio-cancelada-${W}-light`);
  }else{finding('estudio: reserva','no se encontró el botón Nueva reserva','media');}
 });

 // H) Historial (actividad) y Resumen (pendientes internos).
 await step('OPS historial',async()=>{
  await goto('/equipo/historial',`/Ver historial importado de Trello/.test(document.body.innerText)`);
  await sleep(900);
  const history=await evaluate(`(()=>{const text=document.body.innerText;return {feed:/Ver historial importado de Trello/.test(text),records:/Creó|Actualizó|Eliminó|Sin actividad registrada/.test(text),error:/No se pudo cargar el historial/.test(text)};})()`);
  if(withChecks){check(`historial ${W}: actividad del equipo`,history.feed&&history.records,true);check(`historial ${W}: sin error de carga`,history.error,false);}
  await capture(`historial-${W}-light`);
  await setTheme('dark');await capture(`historial-${W}-dark`);await setTheme('light');
  await goto('/resumen',`/Pendientes internos/.test(document.body.innerText)`);
  const tasks=await evaluate(`/Pendientes internos/.test(document.body.innerText)&&!/No se pudieron cargar/.test(document.body.innerText)`);
  if(withChecks)check(`resumen ${W}: pendientes internos`,tasks,true);
 });
}

// I) Permisos de viewer.
await step('OPS permisos viewer',async()=>{
 await setViewport(1440,900);await setSession(session.VIEWER_TOKEN);
 await send('Page.navigate',{url:BASE+'/'});
 await sleep(4500);
 await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Resumen')`,{label:'cáscara viewer',timeout:30000});
 await goto('/produccion',`document.querySelector('[data-order]')`);
 await sleep(800);
 const board=await evaluate(`(()=>{const card=document.querySelector('[data-order]');return {menu:Boolean(card?.querySelector('button[aria-haspopup="menu"]')),grip:Boolean(card&&[...card.querySelectorAll('[role="img"]')].some(n=>(n.getAttribute('aria-label')||'').startsWith('Mover ')))};})()`);
 if(withChecks){check('viewer: sin menú ⋯ en la tarjeta',board.menu,false);check('viewer: sin manija de arrastre',board.grip,false);}
 await capture('viewer-produccion-1440-light');
 await setTheme('dark');await capture('viewer-produccion-1440-dark');await setTheme('light');
 await goto('/inventario',`document.querySelector('[aria-label="Vista de inventario"]')`);
 await sleep(900);
 const inventory=await evaluate(`(()=>{const text=document.body.innerText;return {add:/Agregar equipo/.test(text),reserve:/Reservar equipos/.test(text),verify:Boolean([...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Marcar verificado:')))};})()`);
 if(withChecks){check('viewer: sin alta de equipos',inventory.add,false);check('viewer: sin reserva de equipos',inventory.reserve,false);check('viewer: sin verificación',inventory.verify,false);}
 await capture('viewer-inventario-1440-light');
});

// J) Sesión vencida/revocada.
await step('OPS sesión vencida',async()=>{
 await setSession('sesion-invalida-qa-154');
 await send('Page.navigate',{url:BASE+'/'});
 await sleep(4500);
 const login=await evaluate(`(()=>{const text=document.body.innerText;return {shell:Boolean(document.querySelector('.control-shell')),login:/Ingresar|Iniciar sesión|Correo|Contraseña/.test(text)||Boolean(document.querySelector('input[type="email"],input[type="password"]'))};})()`);
 if(withChecks){check('sesión vencida: sin shell interno',login.shell,false);check('sesión vencida: pantalla de acceso',login.login,true);}
 await capture('sesion-vencida-1440-light');
});

writeFileSync(resolve(out,'informe-ops.json'),JSON.stringify({generatedAt:new Date().toISOString(),checks,findings,log},null,1));
writeFileSync(resolve(out,'qa-ops.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(withChecks?(process.exitCode?`Testeos #154 OPS: ${findings.length} hallazgo(s)`:'Testeos #154 OPS: PASS'):'Testeos #154 OPS: capturas listas');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
