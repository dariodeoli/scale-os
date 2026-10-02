/*
 * Auditoría demo de Operaciones (#146): capturas antes/después del detalle de
 * proyecto (contador 0 vs 4 piezas), el calendario de Inventario (agenda
 * semanal en móvil, celdas bajas) y las tarjetas de ubicación (pipeline y
 * «Ubicaciones de guardado»).
 *
 * Requisitos: stack local de OPS (`e2e-ops-stack.mjs`) con el build actual.
 * Uso: node build-tools/visual-harness/qa-ops-146.mjs --tag antes|despues [--checks]
 * Salida: docs/qa/demo-146/<tag>/ (capturas) + informe-<tag>.json
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const arg=(name,fallback='')=>{const index=process.argv.indexOf(`--${name}`);return index>=0&&process.argv[index+1]?process.argv[index+1]:fallback;};
const tag=arg('tag','despues');
const withChecks=process.argv.includes('--checks');
const out=resolve(repo,'docs/qa/demo-146',tag);
mkdirSync(out,{recursive:true});
const session=Object.fromEntries(readFileSync(resolve(repo,'work/visual-harness/ops-qa-session.txt'),'utf8').split('\n').filter(Boolean).map((line)=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE||'http://127.0.0.1:3006';

const log=[];const checks=[];
const check=(label,value,expected=true)=>{const ok=value===expected;checks.push({label,ok,value,expected});log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);
const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=20000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78});writeFileSync(resolve(out,`${name}.jpg`),Buffer.from(data,'base64'));note(`captura ${tag}/${name}.jpg`);};
const clickByText=(text,selector='button,a,summary')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const clickByLabel=(label,selector='button,a,[role=button]')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>(node.getAttribute('aria-label')||'')===${JSON.stringify(label)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const setTheme=async(theme)=>{await evaluate(`(()=>{localStorage.setItem('scale-theme',${JSON.stringify(theme)});if(${JSON.stringify(theme)}==='light')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=${JSON.stringify(theme)};return document.documentElement.dataset.theme||'light';})()`);await sleep(250);};
const setViewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await sleep(300);};
const navItem=async(name)=>evaluate(`(()=>{const side=document.querySelector('.desktop-sidebar'),drawer=document.querySelector('.mobile-sidebar');const roots=[side&&side.getBoundingClientRect().width>0?side:null,drawer].filter(Boolean);for(const root of roots){const el=[...root.querySelectorAll('button,a')].find(node=>node.textContent.trim()===${JSON.stringify(name)}&&node.getClientRects().length>0);if(el){el.focus?.();el.click();return true;}}return false;})()`);
const ensureDrawer=async()=>{if(await evaluate(`!document.querySelector('.mobile-sidebar')&&(document.querySelector('.mobile-menu-trigger')?.getBoundingClientRect().width||0)>0`)){await clickByLabel('Abrir menú');await waitFor(`document.querySelector('.mobile-sidebar')`,{label:'drawer móvil',timeout:8000});}};
const goTo=async(name)=>{
 if(await navItem(name)){await sleep(1500);return true;}
 await ensureDrawer();
 if(await navItem(name)){await sleep(1500);return true;}
 const groups=await evaluate(`(()=>{const root=document.querySelector('.mobile-sidebar')||document.querySelector('.desktop-sidebar');if(!root)return [];return [...root.querySelectorAll('.nav-group-toggle')].map(group=>group.textContent.trim());})()`);
 for(const group of groups){
  await evaluate(`(()=>{const root=document.querySelector('.mobile-sidebar')||document.querySelector('.desktop-sidebar');const group=[...root.querySelectorAll('.nav-group-toggle')].find(node=>node.textContent.trim()===${JSON.stringify(group)});if(!group)return false;group.click();return true;})()`);
  await sleep(1600);
  await ensureDrawer();
  if(await navItem(name)){await sleep(1500);return true;}
 }
 return false;
};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:session.OWNER_TOKEN||'measure-token',url:BASE});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await evaluate(`localStorage.clear()`);await send('Page.reload');await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Inventario'||n.textContent.trim()==='Resumen')`,{label:'cáscara',timeout:30000});

// ── Proyectos: contador de piezas = longitud de la lista del detalle ─────────
const openProjectDetail=async(piecesWanted)=>{
 const picked=await evaluate(`(()=>{const cards=[...document.querySelectorAll('.project-entry,[data-project]')];for(const card of cards){const text=card.textContent||'';const title=card.querySelector('dl')?.getAttribute('title')||'';const match=title.match(/·\\s*(\\d+)\\s*piezas?/);if(!match)continue;const pieces=Number(match[1]);if(${piecesWanted}===null||pieces===${piecesWanted}){const button=[...card.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||'').startsWith('Ver detalle del proyecto'));if(!button)continue;button.click();return {name:card.querySelector('h3')?.textContent||'',pieces};}}return null;})()`);
 return picked;
};
const readDetailState=()=>evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');if(!panel)return null;const heading=[...panel.querySelectorAll('h4')].find(node=>node.textContent.trim()==='Piezas del proyecto');const list=heading?.parentElement?.querySelector('ul');const count=panel.querySelector('[data-pieces-count]')?Number(panel.querySelector('[data-pieces-count]').getAttribute('data-pieces-count')):null;let fallback=null;if(count===null){const dt=[...panel.querySelectorAll('dt')].find(node=>node.textContent.trim()==='Piezas');const dd=dt?.parentElement?.querySelector('dd');fallback=dd?Number(dd.textContent.trim()):null;}const items=list?list.querySelectorAll('li').length:0;const empty=/El proyecto todavía no tiene piezas/.test(panel.textContent||'');return {count:count===null?fallback:count,items,empty};})()`);
const auditProject=async(label,piecesWanted,width)=>{
 const picked=await openProjectDetail(piecesWanted);
 if(!picked){note(`proyectos ${width}: sin proyecto ${label} para medir`);return null;}
 await waitFor(`document.querySelector('[role="dialog"]')&&/[Pp]iezas del proyecto/.test(document.querySelector('[role="dialog"]').textContent)`,{label:`detalle ${label}`});
 await sleep(700);
 const state=await readDetailState();
 note(`proyectos ${width} ${label}: «${picked.name}» contador ${state?.count} · lista ${state?.items}${state?.empty?' (vacío visible)':''}`);
 return {label,name:picked.name,card:width,state};
};

const widths=[[390,844],[1440,900]];
const projectAudits=[];
for(const [width,height] of widths){
 await setViewport(width,height);await setTheme('light');
 const W=String(width);
 log.push(`\n──── ${width}×${height} ────`);

 // Proyectos.
 await goTo('Proyectos');
 await waitFor(`document.querySelector('.project-entry,[data-project]')`,{label:'proyectos'});
 await sleep(800);
 await capture(`proyectos-lista-${W}-light`);
 const withPieces=await auditProject('con piezas',null,W);
 if(withPieces){await capture(`proyecto-detalle-${W}-light`);await setTheme('dark');await capture(`proyecto-detalle-${W}-dark`);await setTheme('light');}
 if(withChecks){
  check(`proyectos ${W} con piezas: el contador iguala la lista`,withPieces?.state.count===withPieces?.state.items,true);
  check(`proyectos ${W} con piezas: la lista tiene piezas`,Boolean(withPieces&&withPieces.state.items>0),true);
 }
 if(!await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`)){
  // El detalle no se abrió (o se cerró solo): seguimos sin romper la corrida.
  note(`proyectos ${W}: no quedó detalle abierto`);
 }else{
  await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const close=[...panel.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||'').match(/cerrar|close/i));if(close)close.click();})()`);
  await sleep(500);
 }
 const empty=await auditProject('vacío',0,W);
 if(empty){
  if(withChecks)check(`proyectos ${W} vacío: contador 0 = lista 0`,empty.state.count===0&&empty.state.items===0,true);
  await evaluate(`(()=>{const panel=document.querySelector('[role="dialog"]');const close=[...panel.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||'').match(/cerrar|close/i));if(close)close.click();})()`);
  await sleep(500);
 }
 if(withPieces)projectAudits.push(withPieces);
 if(empty)projectAudits.push(empty);

 // Inventario: calendario.
 await goTo('Inventario');
 await waitFor(`[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Calendario y reservas')`,{label:'inventario'});
 await clickByText('Calendario y reservas');
 await waitFor(`document.querySelector('[aria-label="Calendario de reservas"],[aria-label="Calendario mensual de reservas"]')`,{label:'calendario'});
 await sleep(600);
 await capture(`inventario-calendario-${W}-light`);
 await setTheme('dark');await capture(`inventario-calendario-${W}-dark`);await setTheme('light');
 if(withChecks){
  const calendar=await evaluate(`(()=>{const root=document.querySelector('[data-calendar-agenda],[data-calendar-month]');const agenda=document.querySelector('[data-calendar-agenda]');const month=document.querySelector('[data-calendar-month]');const heights=(nodes)=>[...nodes].map(node=>Math.round(node.getBoundingClientRect().height));return {hasAgenda:Boolean(agenda),hasMonth:Boolean(month),agendaDays:agenda?agenda.querySelectorAll('[data-agenda-day]').length:0,agendaEmpty:agenda?heights(agenda.querySelectorAll('[data-agenda-day][data-empty="true"]')):[],monthEmpty:month?heights(month.querySelectorAll('[data-calendar-day][data-empty="true"]')):[],monthCols:month?getComputedStyle(month).gridTemplateColumns.split(' ').filter(Boolean).length:0,rootHeight:root?Math.round(root.getBoundingClientRect().height):0};})()`);
  note(`calendario ${W}: agenda=${calendar.hasAgenda} (${calendar.agendaDays} días, vacíos ${Math.max(0,...calendar.agendaEmpty)} px) · mes=${calendar.hasMonth} (${calendar.monthCols} cols, vacíos ${Math.max(0,...calendar.monthEmpty)} px) · alto ${calendar.rootHeight} px`);
  if(width===390){
   check(`calendario ${W}: agenda semanal de 7 días`,calendar.agendaDays,7);
   check(`calendario ${W}: días vacíos bajos (≤ 40 px)`,calendar.agendaEmpty.length>0&&Math.max(...calendar.agendaEmpty)<=40,true);
   const before=await evaluate(`document.querySelector('[data-calendar-agenda]')?.textContent||''`);
   await clickByLabel('Semana siguiente');
   await sleep(400);
   const after=await evaluate(`document.querySelector('[data-calendar-agenda]')?.textContent||''`);
   check(`calendario ${W}: «Semana siguiente» avanza`,before!==after,true);
   await clickByLabel('Semana anterior');await sleep(400);
  }else{
   check(`calendario ${W}: mini calendario mensual de 7 columnas`,calendar.monthCols,7);
   check(`calendario ${W}: días vacíos bajos (≤ 56 px)`,calendar.monthEmpty.length>0&&Math.max(...calendar.monthEmpty)<=56,true);
  }
 }

 // Inventario: ubicaciones (pipeline + guardadas). Primero se vuelve a la vista
 // Equipos: el selector «Ubicaciones» vive en el conmutador de vista de equipos.
 await clickByText('Equipos');
 await sleep(700);
 await evaluate(`(()=>{const control=document.querySelector('[aria-label="Vista de inventario"]');const el=control&&[...control.querySelectorAll('button')].find(n=>n.textContent.trim()==='Ubicaciones');if(el)el.click();return true;})()`);
 await waitFor(`document.querySelector('[data-board-column]')`,{label:'pipeline'});
 const savedOpen=async(open)=>{await evaluate(`(()=>{const summary=[...document.querySelectorAll('summary')].find(node=>node.textContent.includes('Ubicaciones de guardado'));if(summary&&Boolean(summary.parentElement.open)!==${open})summary.click();return true;})()`);await sleep(400);};
 // La demo arranca sin lugares guardados: se crean dos por UI para poder ver
 // las filas de «Ubicaciones de guardado» y el orden en el pipeline.
 const createLocation=async(name)=>{
  await clickByText('Crear ubicación');
  await waitFor(`document.querySelector('#inventory-place-name')`,{label:'form de ubicación'});
  await evaluate(`(()=>{const el=document.querySelector('#inventory-place-name');const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(name)});el.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await clickByText('Guardar ubicación');
  await waitFor(`document.body.textContent.includes(${JSON.stringify(name)})`,{label:`ubicación ${name}`,timeout:8000});
  await sleep(600);
 };
 await savedOpen(true);
 if(await evaluate(`document.body.textContent.includes('Todavía no hay ubicaciones guardadas.')`)){
  await createLocation('QA Bodega A');
  await createLocation('QA Bodega B');
 }
 await savedOpen(false);
 await sleep(600);
 await capture(`inventario-ubicaciones-${W}-light`);
 await setTheme('dark');await capture(`inventario-ubicaciones-${W}-dark`);await setTheme('light');
 await savedOpen(true);
 await capture(`inventario-guardado-${W}-light`);
 if(withChecks){
  const locations=await evaluate(`(()=>{const heads=[...document.querySelectorAll('[data-board-head]')].map(node=>Math.round(node.getBoundingClientRect().height));const rows=[...document.querySelectorAll('[data-location-row]')];const rowHeights=rows.map(node=>Math.round(node.getBoundingClientRect().height));const menu=[...document.querySelectorAll('[data-board-head] button[aria-haspopup="menu"]')].length;const arrows=[...document.querySelectorAll('[data-board-head] [role="group"]')].length;const orderable=[...document.querySelectorAll('[data-board-column]:not([data-readonly="true"]) [data-board-head]')].length;return {heads,menu,arrows,orderable,rowHeights,rows:rows.length};})()`);
  note(`ubicaciones ${W}: encabezados ${JSON.stringify(locations.heads)} px · ⋯ ${locations.menu}/${locations.orderable} · filas guardadas ${JSON.stringify(locations.rowHeights)} px`);
  check(`ubicaciones ${W}: el ⋯ reemplaza las flechas sueltas`,locations.arrows===0,true);
  check(`ubicaciones ${W}: los lugares guardados ofrecen su menú ⋯`,locations.menu>0,true);
  check(`ubicaciones ${W}: filas guardadas compactas (≤ 52 px)`,locations.rowHeights.length>0&&Math.max(...locations.rowHeights)<=52,true);
 }

 // Estudio no entra en #146; cierre prolijo de each width.
}

writeFileSync(resolve(out,`informe-${tag}.json`),JSON.stringify({generatedAt:new Date().toISOString(),tag,projectAudits,checks,log},null,1));
writeFileSync(resolve(out,`qa-${tag}.txt`),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(withChecks?(process.exitCode?`Demo audit #146 (${tag}): FALLÓ`:`Demo audit #146 (${tag}): PASS`):`Demo audit #146 (${tag}): capturas listas`);
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
