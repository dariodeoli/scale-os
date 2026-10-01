/*
 * QA ola 2 de Operaciones (issue #123) contra la app real del stack local
 * (`e2e-ops-stack.mjs`): Inventario, Producción, Proyectos y Estudio a 390×844
 * y 768×1024, claro/oscuro, con foco en modales (foco, Escape, scroll interno,
 * targets ≥44), formularios (validación visible), tableros (scroll) y estados
 * vacíos. Deja capturas en work/visual-harness/qa-ola2/shots y el log de
 * chequeos en results.txt.
 *
 * Uso: node build-tools/visual-harness/e2e-ops-stack.mjs   (queda corriendo)
 *      node build-tools/visual-harness/qa-ola2-ops.mjs
 * Env: BASE_URL; la sesión sale de work/visual-harness/ops-qa-session.txt.
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const sessionFile=process.env.QA_SESSION_FILE||resolve(repo,'work/visual-harness/ops-qa-session.txt');
const env=Object.fromEntries(readFileSync(sessionFile,'utf8').split('\n').filter(Boolean).map(line=>line.split('=')));
const BASE=process.env.BASE_URL||env.BASE||'http://127.0.0.1:3006';
const TOKEN=process.env.QA_TOKEN||env.OWNER_TOKEN||'measure-token';
const OUT=resolve(repo,'work/visual-harness/qa-ola2');
const SHOTS=resolve(OUT,'shots');
mkdirSync(SHOTS,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${typeof value==='object'?JSON.stringify(value):String(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=25000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,250));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`${SHOTS}/${name}.png`,Buffer.from(data,'base64'));note(`captura shots/${name}.png`);};

const clickByText=(text,selector='button,a')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const clickByLabel=(label,selector='button,a,[role=button]')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>(node.getAttribute('aria-label')||'')===${JSON.stringify(label)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const setInput=async(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(String(value))});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return el.value;})()`);
const setTheme=async(theme)=>{await evaluate(`(()=>{localStorage.setItem('scale-theme',${JSON.stringify(theme)});if(${JSON.stringify(theme)}==='light')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=${JSON.stringify(theme)};return document.documentElement.dataset.theme||'light';})()`);await sleep(250);};
const setViewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await sleep(300);};

const escape=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await sleep(450);};
const dialogState=()=>evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');if(!dialog)return null;const heading=dialog.querySelector('h2');const body=dialog.querySelector('.dialog-body')||[...dialog.querySelectorAll('div')].find(node=>/auto|scroll/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+2)||null;const buttons=[...dialog.querySelectorAll('button')].filter(button=>button.getClientRects().length>0);const lastButton=buttons.at(-1)||null;const focusInside=dialog.contains(document.activeElement);return {title:heading?heading.textContent.trim():null,focusInside,bodyScroll:body?{sh:body.scrollHeight,ch:body.clientHeight,oy:getComputedStyle(body).overflowY}:null,submitBottom:lastButton?Math.round(lastButton.getBoundingClientRect().bottom):null,viewport:innerHeight,inv:(()=>{const found=[];for(const el of dialog.querySelectorAll('button,a[href]')){const r=el.getBoundingClientRect();if(r.width>0&&r.height>0&&r.height<44&&!el.closest('.toque-44'))found.push({label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,30),h:Math.round(r.height)});}return found.slice(0,8);})()};})()`);
const openDialogFor=async(title,{timeout=20000}={})=>{await waitFor(`(()=>{const h=document.querySelector('[role="dialog"] h2');return h&&h.textContent.trim()===${JSON.stringify(title)};})()`,{timeout,label:`diálogo «${title}»`});return dialogState();};
const submitDialog=async()=>{const clicked=await evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');if(!dialog)return false;const scope=dialog.querySelector('.dialog-footer')||dialog;const candidates=[...scope.querySelectorAll('button')].filter(button=>button.getClientRects().length>0&&!button.disabled);const button=candidates.find(button=>button.type==='submit')||candidates.find(button=>button.getAttribute('form')&&button.type!=='button')||candidates.at(-1);if(!button)return false;button.click();return true;})()`);await sleep(800);return clicked;};
const validationState=()=>evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');if(!dialog)return null;const invalid=[...dialog.querySelectorAll('[aria-invalid="true"]')].map(el=>el.id||el.name||el.tagName);const nativeInvalid=[...dialog.querySelectorAll('input:invalid,select:invalid,textarea:invalid')].map(el=>el.id||el.name||el.tagName);const error=[...dialog.querySelectorAll('.error,[role="alert"]')].map(el=>el.textContent.trim().slice(0,80));return {invalid,nativeInvalid,error};})()`);
const dialogOpen=()=>evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
const closeDialog=async(triggerText=null)=>{if(await dialogOpen()){await escape();}
 if(await dialogOpen()){await clickByLabel('Cerrar');await sleep(500);}
 await waitFor(`!document.querySelector('[role="dialog"]')`,{timeout:8000,label:'diálogo cerrado'});
 if(triggerText){return evaluate(`(()=>{const active=document.activeElement;const text=(active?.getAttribute?.('aria-label')||active?.textContent||'').trim();return text.includes(${JSON.stringify(triggerText)});})()`);}
 return true;};

const navItem=async(name)=>evaluate(`(()=>{const side=document.querySelector('.desktop-sidebar'),drawer=document.querySelector('.mobile-sidebar');const roots=[side&&side.getBoundingClientRect().width>0?side:null,drawer].filter(Boolean);for(const root of roots){const el=[...root.querySelectorAll('button,a')].find(node=>node.textContent.trim()===${JSON.stringify(name)}&&node.getClientRects().length>0);if(el){el.click();return true;}}return false;})()`);
const ensureDrawer=async()=>{if(await evaluate(`!document.querySelector('.mobile-sidebar')&&(document.querySelector('.mobile-menu-trigger')?.getBoundingClientRect().width||0)>0`)){await clickByLabel('Abrir menú');await waitFor(`document.querySelector('.mobile-sidebar')`,{label:'drawer móvil',timeout:8000});}};
const goTo=async(name)=>{
 if(await navItem(name)){await sleep(1600);return true;}
 await ensureDrawer();
 if(await navItem(name)){await sleep(1600);return true;}
 const groups=await evaluate(`(()=>{const root=document.querySelector('.mobile-sidebar')||document.querySelector('.desktop-sidebar');if(!root)return [];return [...root.querySelectorAll('.nav-group-toggle')].map(group=>group.textContent.trim());})()`);
 for(const group of groups){
  await evaluate(`(()=>{const root=document.querySelector('.mobile-sidebar')||document.querySelector('.desktop-sidebar');const group=[...root.querySelectorAll('.nav-group-toggle')].find(node=>node.textContent.trim()===${JSON.stringify(group)});if(!group)return false;group.click();return true;})()`);
  await sleep(1700);
  await ensureDrawer();
  if(await navItem(name)){await sleep(1600);return true;}
 }
 return false;
};
const clickInControl=async(controlLabel,text)=>evaluate(`(()=>{const control=document.querySelector('[aria-label=${JSON.stringify(controlLabel)}]');if(!control)return false;const el=[...control.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getClientRects().length>0);if(!el)return false;el.click();return true;})()`);
const section=async(label,fn)=>{try{await fn();}catch(error){log.push(`✗ ${label}: ${error.message}`);process.exitCode=1;try{await capture(`debug-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`);}catch{}}};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:TOKEN,url:BASE});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await evaluate(`localStorage.clear()`);
await send('Page.reload');
await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Inventario'||n.textContent.trim()==='Resumen')`,{label:'cáscara',timeout:30000});
note('sesión inyectada; preferencias locales limpiadas');

for(const [width,height] of [[390,844],[768,1024]]){
 await setViewport(width,height);
 await setTheme('light');
 const W=String(width);
 log.push(`\n──── ${width}×${height} ────`);

 // ── Cáscara ───────────────────────────────────────────────────────────────
 await section(`shell ${W}`,async()=>{
  if(width<768){
   const trigger=await evaluate(`(()=>{const el=document.querySelector('.mobile-menu-trigger');if(!el)return null;const r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};})()`);
   check('shell: trigger del menú 44×44',trigger&&trigger.h>=44&&trigger.w>=44);
   await evaluate(`document.querySelector('.mobile-menu-trigger')?.focus()`);
   await clickByLabel('Abrir menú');
   await waitFor(`document.querySelector('.mobile-sidebar')`,{label:'drawer'});
   const drawer=await dialogState();
   check('shell: el drawer móvil toma el foco',drawer?drawer.focusInside:false);
   await capture(`shell-menu-${W}-light`);
   const closed=await closeDialog('Abrir menú');
   check('shell: Escape cierra el drawer y devuelve el foco',closed);
  }
 const toggle=await evaluate(`(()=>{const el=document.querySelector('.theme-toggle');if(!el)return null;const r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};})()`);
 if(width<768)check('shell: toggle de tema con target ≥44 en móvil',toggle&&toggle.h>=44&&toggle.w>=44);else check('shell: toggle de tema presente',Boolean(toggle));
 });

 // ── Inventario ────────────────────────────────────────────────────────────
 await section(`inventario ${W}`,async()=>{
  await goTo('Inventario');
  await waitFor(`document.querySelector('[data-list-row="equipment"],[data-grid-card="equipment"]')`,{label:'inventario'});
  await sleep(600);
  await clickInControl('Vista de inventario','Lista');
  await waitFor(`document.querySelector('[data-list-row="equipment"]')`,{label:'lista de inventario'});
  await sleep(400);
  check('inventario: sin overflow horizontal del documento',(await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`))<=1);
  const listScroll=await evaluate(`(()=>{const row=document.querySelector('[data-list-row="equipment"]');if(!row)return null;let node=row.parentElement;while(node&&node!==document.body){const s=getComputedStyle(node);if(/(auto|scroll)/.test(s.overflowX))break;node=node.parentElement;}if(!node||node===document.body)return {scrollable:false,moved:false};const before=node.scrollLeft;node.scrollLeft=9999;return {scrollable:node.scrollWidth>node.clientWidth+1,moved:node.scrollLeft>before};})()`);
  check('inventario: la lista scrollea en horizontal sin romper columnas',listScroll&&listScroll.scrollable===true&&listScroll.moved===true);
  const rowTargets=await evaluate(`(()=>{const row=document.querySelector('[data-list-row="equipment"]');if(!row)return null;return [...row.querySelectorAll('button,a[href]')].filter(el=>el.getClientRects().length>0).map(el=>Math.round(el.getBoundingClientRect().height));})()`);
  if(width<768)check('inventario: acciones de fila ≥44 en móvil',rowTargets&&rowTargets.every(h=>h>=43));
  await capture(`inventario-lista-${W}-light`);
  await setTheme('dark');await capture(`inventario-lista-${W}-dark`);await setTheme('light');

  await setInput('input[aria-label="Buscar equipo o ubicación"]','zzz-no-existe-ola2');
  await sleep(500);
  check('inventario: estado vacío de búsqueda',await evaluate(`document.body.textContent.includes('No hay equipos que coincidan con la búsqueda.')`));
  await capture(`inventario-busqueda-vacia-${W}-light`);
  await setInput('input[aria-label="Buscar equipo o ubicación"]','');
  await sleep(400);

  const trigger=await clickByText('Agregar equipo');
  check('inventario: abre «Nuevo equipo»',trigger);
  const itemDialog=await openDialogFor('Nuevo equipo');
  check('inventario/equipo: el foco entra al diálogo',itemDialog.focusInside);
  if(width<768)check('inventario/equipo: targets del diálogo ≥44 en móvil',itemDialog.inv.length===0,true);
  if(width<768&&itemDialog.inv.length)note(`inventario/equipo: targets <44: ${JSON.stringify(itemDialog.inv)}`);
  let tabStays=true;
  for(let index=0;index<8;index++){
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
   await sleep(120);
   if(!(await evaluate(`document.querySelector('[role="dialog"]')?.contains(document.activeElement)===true`))){tabStays=false;break;}
  }
  check('inventario/equipo: Tab no escapa del diálogo',tabStays);
  if(itemDialog.bodyScroll&&itemDialog.bodyScroll.sh>itemDialog.bodyScroll.ch+4){
   check('inventario/equipo: el cuerpo del diálogo scrollea adentro',await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const b=d&&(d.querySelector('.dialog-body')||[...d.querySelectorAll('div')].find(node=>/auto|scroll/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+2));if(!b)return false;b.scrollTop=300;return b.scrollTop>0;})()`));
   check('inventario/equipo: el pie queda visible',itemDialog.submitBottom!==null&&itemDialog.submitBottom<=itemDialog.viewport+1);
  }else{
   note('inventario/equipo: el formulario entra completo sin scroll interno');
  }
  await capture(`inventario-nuevo-equipo-${W}-light`);
  await setTheme('dark');await capture(`inventario-nuevo-equipo-${W}-dark`);await setTheme('light');
  await submitDialog();
  const itemValidation=await validationState();
  check('inventario/equipo: envío vacío deja validación visible',Boolean(itemValidation&&(itemValidation.invalid.length||itemValidation.nativeInvalid.length||itemValidation.error.length)));
  check('inventario/equipo: Escape cierra y devuelve el foco',await closeDialog('Agregar equipo'));

  // Ubicaciones: crear dos y reordenar.
  await clickInControl('Vista de inventario','Ubicaciones');
  await waitFor(`document.querySelector('[data-board-column]')`,{label:'pipeline'});
  await capture(`inventario-pipeline-${W}-light`);
  await setTheme('dark');await capture(`inventario-pipeline-${W}-dark`);await setTheme('light');
  await evaluate(`(()=>{const summary=[...document.querySelectorAll('summary')].find(s=>s.textContent.includes('Ubicaciones de guardado'));if(summary)summary.closest('details').setAttribute('open','');return true;})()`);
  await sleep(300);
  for(const name of ['Depósito QA A','Depósito QA B']){
   if(await evaluate(`document.body.textContent.includes(${JSON.stringify(name)})`)){note(`inventario/ubicación: ${name} ya existía; se omite la creación`);continue;}
   const opened=await clickByText('Crear ubicación');
   if(!opened){note(`inventario/ubicación: «Crear ubicación» no visible para ${name}`);break;}
   const dialog=await openDialogFor('Nueva ubicación');
   check(`inventario/ubicación: foco al abrir (${name})`,dialog.focusInside);
   await setInput('#inventory-place-name',name);
   await submitDialog();
   await sleep(900);
  }
  const locations=await evaluate(`[...document.querySelectorAll('[data-board-column] h3')].map(h=>h.textContent.trim())`);
  check('inventario/ubicación: las ubicaciones nuevas aparecen en el pipeline',locations.filter(name=>name.startsWith('Depósito QA')).length>=2,true);
  const reorder=await evaluate(`(()=>[...document.querySelectorAll('[aria-label^="Mover antes:"],[aria-label^="Mover después:"]')].slice(0,6).map(b=>({label:b.getAttribute('aria-label'),h:Math.round(b.getBoundingClientRect().height),disabled:b.disabled})))()`);
  if(width<768)check('inventario/ubicación: reordenar con target ≥44 en móvil',reorder.length>0&&reorder.every(button=>button.h>=43));
  const movable=reorder.find(button=>!button.disabled);
  if(movable){
   const before=locations.slice();
   await clickByLabel(movable.label);
   await sleep(1200);
   const after=await evaluate(`[...document.querySelectorAll('[data-board-column] h3')].map(h=>h.textContent.trim())`);
   check('inventario/ubicación: mover cambia el orden',JSON.stringify(before)!==JSON.stringify(after),true);
  }else{
   note('inventario/ubicación: sin botones de reorden habilitados (ya están en el orden pedido)');
  }
  await capture(`inventario-ubicaciones-${W}-light`);

  // Reservas.
  await clickInControl('Vistas de inventario','Calendario y reservas');
  await waitFor(`document.querySelector('[data-list-row="reservations"]')||document.body.textContent.includes('Sin reservas en este mes.')`,{label:'reservas'});
  await capture(`inventario-reservas-${W}-light`);
  await setTheme('dark');await capture(`inventario-reservas-${W}-dark`);await setTheme('light');
  await clickInControl('Vistas de inventario','Equipos');
  await sleep(800);
  const reserveTrigger=await clickByText('Reservar equipos');
  check('inventario: abre «Reservar equipos»',reserveTrigger);
  const reservationDialog=await openDialogFor('Reservar equipos');
  check('inventario/reserva: foco al abrir',reservationDialog.focusInside);
  if(reservationDialog.bodyScroll&&reservationDialog.bodyScroll.sh>reservationDialog.bodyScroll.ch+4){
   check('inventario/reserva: el cuerpo del diálogo scrollea adentro',await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const b=d&&(d.querySelector('.dialog-body')||[...d.querySelectorAll('div')].find(node=>/auto|scroll/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+2));if(!b)return false;b.scrollTop=300;return b.scrollTop>0;})()`));
   check('inventario/reserva: el pie queda visible',reservationDialog.submitBottom!==null&&reservationDialog.submitBottom<=reservationDialog.viewport+1);
  }else{
   note('inventario/reserva: el formulario entra completo sin scroll interno');
  }
  await submitDialog();
  const reservationValidation=await validationState();
  check('inventario/reserva: envío vacío deja validación visible',Boolean(reservationValidation&&(reservationValidation.invalid.length||reservationValidation.nativeInvalid.length||reservationValidation.error.length)));
  await capture(`inventario-reserva-${W}-light`);
  check('inventario/reserva: Escape cierra y devuelve el foco',await closeDialog('Reservar equipos'));
 });

 // ── Producción ────────────────────────────────────────────────────────────
 await section(`producción ${W}`,async()=>{
  await goTo('Producción');
  await waitFor(`document.querySelector('[data-column]')`,{label:'tablero'});
  await sleep(700);
  await capture(`produccion-tablero-${W}-light`);
  await setTheme('dark');await capture(`produccion-tablero-${W}-dark`);await setTheme('light');
  check('producción: sin overflow horizontal del documento',(await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`))<=1);
  const boardScroll=await evaluate(`(()=>{const rail=[...document.querySelectorAll('[data-column]')][0]?.parentElement;if(!rail)return null;const before=rail.scrollLeft;rail.scrollLeft=9999;return {scrollable:rail.scrollWidth>rail.clientWidth+1,moved:rail.scrollLeft>before};})()`);
  check('producción: el tablero scrollea por etapas',boardScroll&&boardScroll.scrollable===true&&boardScroll.moved===true);
  const orderTrigger=await clickByText('Nueva orden');
  check('producción: abre «Nueva orden de trabajo»',orderTrigger);
  const orderDialog=await openDialogFor('Nueva orden de trabajo');
  check('producción/pieza: foco al abrir',orderDialog.focusInside);
  if(width<768)check('producción/pieza: targets ≥44',orderDialog.inv.length===0,true);
  await capture(`produccion-nueva-pieza-${W}-light`);
  await submitDialog();
  const orderValidation=await validationState();
  check('producción/pieza: envío vacío deja validación visible',Boolean(orderValidation&&(orderValidation.invalid.length||orderValidation.nativeInvalid.length||orderValidation.error.length)));
  check('producción/pieza: Escape cierra y devuelve el foco',await closeDialog('Nueva orden'));
 });

 // ── Proyectos ─────────────────────────────────────────────────────────────
 await section(`proyectos ${W}`,async()=>{
  await goTo('Proyectos');
  await waitFor(`document.querySelector('.project-entry')`,{label:'proyectos'});
  await sleep(500);
  await capture(`proyectos-lista-${W}-light`);
  await setTheme('dark');await capture(`proyectos-lista-${W}-dark`);await setTheme('light');
  check('proyectos: sin overflow horizontal del documento',(await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`))<=1);
  const projectTrigger=await clickByText('Nuevo proyecto');
  check('proyectos: abre «Nuevo proyecto»',projectTrigger);
  const projectDialog=await openDialogFor('Nuevo proyecto');
  check('proyectos: foco al abrir',projectDialog.focusInside);
  await submitDialog();
  const projectValidation=await validationState();
  check('proyectos: envío vacío deja validación visible',Boolean(projectValidation&&(projectValidation.invalid.length||projectValidation.nativeInvalid.length||projectValidation.error.length)));
  await capture(`proyectos-nuevo-${W}-light`);
  check('proyectos: Escape cierra y devuelve el foco',await closeDialog('Nuevo proyecto'));
 });

 // ── Estudio ───────────────────────────────────────────────────────────────
 await section(`estudio ${W}`,async()=>{
  await goTo('Estudio');
  await waitFor(`document.querySelector('[aria-label="Calendario mensual del estudio"]')||document.body.textContent.includes('Sin espacios todavía')||document.body.textContent.includes('Nueva reserva')`,{label:'estudio'});
  await sleep(500);
  const studioEmpty=await evaluate(`document.body.textContent.includes('Sin espacios todavía.')`);
  if(studioEmpty){
   check('estudio: estado vacío visible',true);
   await capture(`estudio-vacio-${W}-light`);
   await setTheme('dark');await capture(`estudio-vacio-${W}-dark`);await setTheme('light');
  }
  const spaceExists=await evaluate(`document.body.textContent.includes('Set QA ola 2')`);
  if(!spaceExists){
   const spaceTrigger=await clickByText('Agregar espacio');
   check('estudio: abre «Nuevo espacio de estudio»',spaceTrigger);
   const spaceDialog=await openDialogFor('Nuevo espacio de estudio');
   check('estudio/espacio: foco al abrir',spaceDialog.focusInside);
   await submitDialog();
   const spaceValidation=await validationState();
   check('estudio/espacio: envío vacío deja validación visible',Boolean(spaceValidation&&(spaceValidation.invalid.length||spaceValidation.nativeInvalid.length||spaceValidation.error.length)));
   await capture(`estudio-nuevo-espacio-${W}-light`);
   const spaceName=await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const input=[...d.querySelectorAll('input[type="text"],input:not([type])')][0];return input?input.id:null;})()`);
   if(spaceName)await setInput(`#${spaceName}`,'Set QA ola 2');
   const scenario=await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const label=[...d.querySelectorAll('label')].find(l=>l.textContent.includes('Escenario'));return label?.htmlFor||null;})()`);
   if(scenario)await setInput(`#${scenario}`,'Fondo blanco · QA');
   await submitDialog();
   await waitFor(`!document.querySelector('[role="dialog"]')`,{timeout:12000,label:'espacio guardado'});
   await sleep(900);
   check('estudio/espacio: el espacio se guarda y aparece',await evaluate(`document.body.textContent.includes('Set QA ola 2')`));
  }else{
   note('estudio: el espacio QA ya existía; se omite la creación');
  }
  const reserveTrigger=await clickByText('Nueva reserva');
  check('estudio: abre «Nueva reserva»',reserveTrigger);
  const studioDialog=await openDialogFor('Nueva reserva de estudio');
  check('estudio/reserva: foco al abrir',studioDialog.focusInside);
  await submitDialog();
  const studioValidation=await validationState();
  check('estudio/reserva: envío vacío deja validación visible',Boolean(studioValidation&&(studioValidation.invalid.length||studioValidation.nativeInvalid.length||studioValidation.error.length)));
  const studioFields=await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const space=d.querySelector('#studio-reservation-space');const start=d.querySelector('#studio-reservation-start');const end=d.querySelector('#studio-reservation-end');return {spaceOptions:space?space.options.length:0,spaceDisabled:space?space.disabled:true,start:start?start.type:null,end:end?end.type:null};})()`);
  check('estudio/reserva: espacio con opciones y fechas datetime-local',studioFields.spaceOptions>=1&&!studioFields.spaceDisabled&&studioFields.start==='datetime-local'&&studioFields.end==='datetime-local');
  await capture(`estudio-reserva-${W}-light`);
  await setTheme('dark');await capture(`estudio-reserva-${W}-dark`);await setTheme('light');
  check('estudio/reserva: Escape cierra y devuelve el foco',await closeDialog('Nueva reserva'));
  const reservationExists=await evaluate(`document.body.textContent.includes('QA ola 2 · franja')`);
  if(!reservationExists){
   await clickByText('Nueva reserva');
   await openDialogFor('Nueva reserva de estudio');
   await setInput('#studio-reservation-title','QA ola 2 · franja');
   const spacePicked=await evaluate(`(()=>{const space=document.querySelector('#studio-reservation-space');const option=[...space.options].find(candidate=>candidate.value);if(!option)return false;const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;setter.call(space,option.value);space.dispatchEvent(new Event('change',{bubbles:true}));return space.value;})()`);
   await setInput('#studio-reservation-start','2026-10-20T10:00');
   await setInput('#studio-reservation-end','2026-10-20T11:00');
   const responsible=await evaluate(`(()=>{const check=[...document.querySelectorAll('[role="dialog"] input[type="checkbox"]')].find(box=>!box.disabled&&!box.checked);if(!check)return false;check.click();return true;})()`);
   await submitDialog();
   const saved=await waitFor(`!document.querySelector('[role="dialog"]')`,{timeout:12000,label:'reserva guardada'}).then(()=>true).catch(()=>false);
   check('estudio/reserva: se guarda con espacio, fechas y responsable',Boolean(saved&&spacePicked&&responsible&&await evaluate(`document.body.textContent.includes('QA ola 2 · franja')`)));
   if(!saved)await closeDialog('Nueva reserva');
  }else{
   note('estudio/reserva: la reserva QA ya existía; se omite la creación');
  }
 });
}

writeFileSync(resolve(OUT,'results.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(process.exitCode?'QA ola 2 OPS: FALLÓ':'QA ola 2 OPS: PASS (todas las verificaciones)');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
