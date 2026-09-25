/*
 * Auditoría de accesibilidad AA de la vertical OPS (ronda 13, #60, refs #44).
 *
 * Por pantalla (Producción/tablero, planificador, Proyectos, Inventario,
 * Estudio, Historial) en claro y oscuro:
 *   1) contraste AA (4.5:1 texto / 3:1 grande) con las muestras que fallan;
 *   2) recorrido de teclado: cada parada visible y con indicador de foco;
 *   3) pie de diálogo/drawer: foco atrapado y retorno al disparador;
 *   4) tablero: mover una pieza con teclado (Space → flechas → Space) y
 *      verificar el estado en Postgres (se revierte al final);
 *   5) targets ≥44 en mobile y `prefers-reduced-motion`;
 *   6) roles/ARIA básicos (tabla/filas/encabezados, diálogos, aria-live).
 *
 * Uso: node build-tools/visual-harness/a11y-vertical.mjs
 * Requisitos: stack local (receta en `e2e-drag.mjs`); PSQL_ARGS apunta al clúster.
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const PSQL=[...(process.env.PSQL_ARGS||'-h 127.0.0.1 -p 55432 -U postgres -d scaleos').split(' '),'-t','-A','-c'];
const psql=(sql)=>execFileSync('psql',[...PSQL,sql],{encoding:'utf8'}).trim();
const OUT=process.env.QA_OUT||'work/visual-harness/a11y-60';

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

let chrome=await launchChrome();
let cdp=await openTarget(chrome.port);
let send=(m,p={})=>cdp.send(m,p);
let evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
/** Navegador nuevo por pantalla: la navegación cruzada dejaba la app a medias. */
async function freshBrowser(){
 try{await evaluate(`true`);}catch{}
 await cdp.send('Page.close').catch(()=>undefined);
 chrome.process?.kill?.('SIGKILL');
 chrome=await launchChrome();
 cdp=await openTarget(chrome.port);
 send=(m,p={})=>cdp.send(m,p);
 evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
 await send('Page.enable');await send('Runtime.enable');
 await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
}
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,300));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const clickByText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim()===${JSON.stringify(text)}&&n.offsetParent!==null);if(!el)return false;el.click();return true;})()`);
const capture=async(name)=>{mkdirSync(OUT,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`${OUT}/${name}.png`,Buffer.from(data,'base64'));};

/* ── Contraste ────────────────────────────────────────────────────────────── */
import {CONTRAST_JS} from './contrast.mjs';
/* ── Teclado: paradas de foco ─────────────────────────────────────────────── */
const focusState=()=>evaluate(`(()=>{const el=document.activeElement;if(!el||el===document.body)return {tag:'BODY'};const r=el.getBoundingClientRect();const style=getComputedStyle(el);return {tag:el.tagName,role:el.getAttribute('role')||'',label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40),outline:style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0,shadow:style.boxShadow!=='none',visible:r.width>1&&r.height>1,insideDialog:Boolean(el.closest('[role="dialog"]'))};})()`);
const pressTab=async(shift=false)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});await sleep(120);};

const screens=[
 {name:'Producción · Tablero',route:'/produccion',marker:'[data-column]',slug:'produccion-tablero'},
 {name:'Producción · Planificador',route:'/produccion',marker:'[role="table"]',slug:'produccion-planificador',view:'Lista y lotes'},
 {name:'Proyectos',route:'/proyectos',marker:'.project-entry',slug:'proyectos'},
 {name:'Inventario',route:'/inventario',marker:'[data-grid-card="equipment"],[data-list-row="equipment"]',slug:'inventario'},
 {name:'Estudio',route:'/estudio',marker:'[data-list="studio-reservations"]',slug:'estudio'},
 {name:'Historial',route:'/equipo/historial',marker:'[aria-label="Historial de trabajo"]',slug:'historial'},
];

await send('Page.enable');await send('Runtime.enable');
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});

for(const theme of ['light','dark']){
 for(const screen of screens){
  await freshBrowser();
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:BASE+'/'});
  await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Producción')`,{timeout:45000,label:`cáscara ${theme}`});
  await send('Page.navigate',{url:BASE+screen.route});
  await sleep(1000);
  await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
  await sleep(1200);
  if(screen.route==='/produccion'&&!await evaluate(`Boolean(document.querySelector('[data-column]'))`)){await clickByText('Tablero');await sleep(2000);}
  if(screen.view){await clickByText(screen.view);await sleep(1800);}
  let loaded=await waitFor(screen.marker,{timeout:30000,label:`${screen.name} ${theme}`}).catch(()=>false);
  if(!loaded){await sleep(3000);if(screen.view){await clickByText(screen.view);await sleep(1800);}loaded=await waitFor(screen.marker,{timeout:30000,label:`${screen.name} ${theme} (reintento)`}).catch(()=>false);}
  check(`${screen.name} (${theme}): carga`,loaded);
  if(!loaded)continue;
  await sleep(1200);
  // 1) Contraste
  const contrast=await evaluate(CONTRAST_JS);
  check(`${screen.name} (${theme}): contraste AA`,contrast.failureCount,0);
  check(`${screen.name} (${theme}): UI ≥3:1`,contrast.uiFailureCount,0);
  note(`${screen.name} (${theme}): ${contrast.checked} nodos de texto · ${contrast.uiChecked} controles`);
  if(contrast.failureCount)for(const f of contrast.failures.slice(0,4))note(`  falla ${f.ratio}<${f.threshold} · ${f.size}px/${f.weight} · ${f.fg} sobre ${f.bg} · «${f.text}» (${f.cls})`);
  if(contrast.uiFailureCount)for(const f of contrast.uiFailures.slice(0,3))note(`  UI ${f.ratio}<3 · ${f.kind} de ${f.tag}.${f.cls}`);
  // 2) Recorrido de teclado
  await evaluate(`document.body.focus();document.activeElement?.blur();`);
  const stops=[];
  for(let i=0;i<10;i++){await pressTab();stops.push(await focusState());}
  const invisible=stops.filter(stop=>stop.visible===false).length;
  const withoutIndicator=stops.filter(stop=>stop.tag!=='BODY'&&!stop.outline&&!stop.shadow).length;
  check(`${screen.name} (${theme}): paradas de foco visibles`,invisible,0);
  check(`${screen.name} (${theme}): foco con indicador`,withoutIndicator,0);
  note(`${screen.name} (${theme}): 10 paradas → ${stops.slice(0,5).map(stop=>`${stop.tag}${stop.label?':'+stop.label.slice(0,18):''}`).join(' · ')}`);
  if(!process.exitCode)await capture(`${screen.slug}-foco-${theme}`);
  // 6) Roles/ARIA de la pantalla
  const aria=await evaluate(`(()=>{const tables=[...document.querySelectorAll('[role="table"]')];const bad=tables.filter(t=>!t.getAttribute('aria-label'));const headers=tables.flatMap(t=>[...t.querySelectorAll('[role="columnheader"]')]);const rows=tables.flatMap(t=>[...t.querySelectorAll('[role="row"]')]);const live=[...document.querySelectorAll('[aria-live]')].length;return {tables:tables.length,sinNombre:bad.length,headers:headers.length,rows:rows.length,live};})()`);
  check(`${screen.name} (${theme}): tablas con nombre`,aria.sinNombre,0);
  if(aria.tables)check(`${screen.name} (${theme}): encabezados por tabla`,aria.headers>=aria.tables);
  note(`${screen.name} (${theme}): ${aria.tables} tablas · ${aria.rows} filas · aria-live ${aria.live}`);
 }
}

// 3) Pieza (drawer): foco atrapado y retorno al disparador.
await freshBrowser();
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:BASE+'/produccion'});
await sleep(8000);
if(!await evaluate(`Boolean(document.querySelector('[data-column]'))`)){await clickByText('Tablero');await sleep(2500);}
await waitFor(`document.querySelector('[data-column]')`,{label:'tablero para pieza'});
const triggerBefore=await evaluate(`(()=>{const card=document.querySelector('[data-order]');const button=card?.querySelector('button');button?.focus();button?.click();return {tag:document.activeElement?.tagName,label:(document.activeElement?.textContent||'').trim().slice(0,30)};})()`);
const drawer=await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:20000,label:'drawer de pieza'}).catch(()=>false);
check('pieza: el drawer abre con teclado/click',drawer);
if(drawer){
 await sleep(2200);
 const inside=await evaluate(`Boolean(document.activeElement?.closest('[role="dialog"]'))`);
 const trapped=[];for(let i=0;i<10;i++){await pressTab();trapped.push(await evaluate(`Boolean(document.activeElement?.closest('[role="dialog"]'))`));}
 check('pieza: el foco entra al drawer',inside);
 check('pieza: el foco queda atrapado',trapped.every(Boolean),true);
 await capture(`pieza-drawer-foco-${'dark'}`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await sleep(1200);
 const returned=await evaluate(`(()=>{const el=document.activeElement;if(!el)return {tag:'NONE'};return {tag:el.tagName,label:(el.textContent||'').trim().slice(0,30),isTrigger:/${triggerBefore.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/.test(el.textContent||'')};})()`);
 check('pieza: el foco vuelve al disparador',returned.isTrigger,true);
 note(`pieza: disparador «${triggerBefore.label}» → vuelve a ${returned.tag} «${returned.label}»`);
}

// 4) Tablero por teclado: mover una pieza y verificar en Postgres.
if(!await evaluate(`Boolean(document.querySelector('[data-order]'))`)){await clickByText('Tablero');await sleep(2500);}
await waitFor(`document.querySelector('[data-order]')`,{label:'tablero teclado'});
const keyboard=await evaluate(`(()=>{const card=document.querySelector('[data-order][data-status]');if(!card)return null;card.focus();return {id:card.getAttribute('data-order'),status:card.getAttribute('data-status'),role:card.getAttribute('role'),tabIndex:card.getAttribute('tabindex')};})()`);
check('tablero: la tarjeta es enfocable',keyboard?.tabIndex!==null&&keyboard!==null);
check('tablero: la tarjeta se anuncia como arrastrable',keyboard?.role,'button');
if(keyboard){
 const key=async(k,code,vk)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:vk});await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:vk});await sleep(220);};
 await key(' ','Space',32);
 for(let step=0;step<14;step++)await key('ArrowRight','ArrowRight',39);
 await key(' ','Space',32);
 await sleep(2500);
 const after=psql(`select status from agency_work_orders where id=${keyboard.id}`);
 check('tablero: mover con teclado persiste en Postgres',after!==keyboard.status,true);
 note(`tablero teclado: orden ${keyboard.id} ${keyboard.status} → ${after}`);
 if(after!==keyboard.status){await psql(`update agency_work_orders set status='${keyboard.status}' where id=${keyboard.id}`);note('estado restaurado en Postgres');}
}

// 5) Mobile targets + reduced motion.
await freshBrowser();
await send('Emulation.setDeviceMetricsOverride',{width:360,height:844,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:BASE+'/produccion'});
await sleep(8000);
if(!await evaluate(`Boolean(document.querySelector('[data-column]'))`)){await clickByText('Tablero');await sleep(2500);}
await waitFor(`document.querySelector('[data-order]')`,{label:'tablero mobile'});
const targets=await evaluate(`(()=>{const small=[];document.querySelectorAll('main button,main a[href],main input:not([type=checkbox]),main select,main textarea').forEach(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height||el.closest('[aria-hidden="true"]'))return;if(r.height<44)small.push({tag:el.tagName,cls:String(el.className).slice(0,40),h:Math.round(r.height)});});return {small:small.slice(0,8),count:small.length};})()`);
check('mobile: targets ≥44 en Producción',targets.count,0);
if(targets.count)for(const item of targets.small.slice(0,4))note(`  target ${item.h}px · ${item.tag}.${item.cls}`);
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await sleep(800);
const motion=await evaluate(`(()=>{const sample=[...document.querySelectorAll('main *')].slice(0,600);let animating=0;const muestras=[];for(const el of sample){const style=getComputedStyle(el);const anim=parseFloat(style.animationDuration)>0.05&&style.animationName!=='none';const trans=parseFloat(style.transitionDuration)>0.15;if(anim||trans){animating+=1;if(muestras.length<4)muestras.push(el.tagName+'.'+String(el.className).slice(0,40)+' '+(anim?'anim '+style.animationName+' '+style.animationDuration:'trans '+style.transitionDuration));}}return {animating,detalle:muestras};})()`);
check('reduced motion: sin animaciones largas ni transiciones >150ms',motion.animating,0);
note(`reduced motion: ${motion.animating} elementos con animación/transición activa`);
if(motion.animating)for(const item of (motion.detalle||[]))note(`  ${item}`);
await send('Emulation.setEmulatedMedia',{features:[]});

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS accesibilidad OPS: contraste AA, foco visible/atrapado, roles, teclado y reduced motion.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
