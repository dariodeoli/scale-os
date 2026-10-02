/*
 * Auditoría demo de Operaciones (#141): capturas antes/después de Producción,
 * Inventario (acciones/verificación) y Estudio a 390×844 y 1440×900, claro y
 * oscuro, con verificación del patrón compacto (tarjeta + ⋯ + acción rápida).
 *
 * Requisitos: stack local de OPS (`e2e-ops-stack.mjs`) con el build actual.
 * Uso: node build-tools/visual-harness/qa-ops-demo-141.mjs --tag antes|despues [--checks]
 * Salida: docs/qa/demo-141/<tag>/ (capturas) + informe-<tag>.json
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
const out=resolve(repo,'docs/qa/demo-141',tag);
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
const clickByText=(text,selector='button,a')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
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

const widths=[[390,844],[1440,900]];
for(const [width,height] of widths){
 await setViewport(width,height);await setTheme('light');
 const W=String(width);
 log.push(`\n──── ${width}×${height} ────`);

 // Producción: tarjeta compacta.
 await goTo('Producción');
 await waitFor(`document.querySelector('[data-order]')`,{label:'tablero'});
 await sleep(700);
 await capture(`produccion-tablero-${W}-light`);
 await setTheme('dark');await capture(`produccion-tablero-${W}-dark`);await setTheme('light');
 if(withChecks){
  const card=await evaluate(`(()=>{const el=document.querySelector('[data-order]');if(!el)return null;const text=el.textContent;return {hasDescriptionPreview:/Falta la aprobación|Confirmar con el cliente|Notas largas importadas/.test(text)&&el.querySelector('p.line-clamp-2')!==null,hasMenu:Boolean(el.querySelector('button[aria-haspopup="menu"]')),hasTitle:Boolean(el.querySelector('button[aria-label^="Abrir "]')),hasDue:Boolean(el.querySelector('.due-date,[data-due],time'))||text.includes('Entrega'),hasPeople:Boolean(el.querySelector('.assigned-people')),hasProgress:text.includes('pasos')||text.includes('Aprobaciones')};})()`);
  check(`producción ${W}: la tarjeta no repite la descripción`,card&&card.hasDescriptionPreview===false);
  check(`producción ${W}: tarjeta con título/cliente/vence/responsable/avance`,Boolean(card&&card.hasTitle&&card.hasDue&&card.hasPeople&&card.hasProgress));
  check(`producción ${W}: acciones secundarias en el menú ⋯`,Boolean(card&&card.hasMenu));
  // El menú abre y ofrece editar/archivar.
  await evaluate(`(()=>{const el=document.querySelector('[data-order]');const menu=el.querySelector('button[aria-haspopup="menu"]');if(menu)menu.click();return true;})()`);
  await sleep(400);
  const menuText=await evaluate(`document.querySelector('[role="menu"]')?.innerText||''`);
  check(`producción ${W}: ⋯ con Editar y Mover a papelera`,/Editar/.test(menuText)&&/papelera/i.test(menuText));
  await capture(`produccion-menu-${W}-light`);
  await evaluate(`document.body.click()`);await sleep(300);
  await capture(`produccion-detalle-${W}-light`);
 }

 // Inventario: una acción rápida + ⋯.
 await goTo('Inventario');
 await waitFor(`document.querySelector('[data-grid-card="equipment"],[data-list-row="equipment"]')`,{label:'inventario'});
 await sleep(500);
 await capture(`inventario-tarjeta-${W}-light`);
 await setTheme('dark');await capture(`inventario-tarjeta-${W}-dark`);await setTheme('light');
 if(withChecks){
  const actions=await evaluate(`(()=>{const card=document.querySelector('[data-grid-card="equipment"]');if(!card)return null;const buttons=[...card.querySelectorAll('button')].filter(b=>b.getClientRects().length>0);const labelled=node=>node.getAttribute('aria-label')||node.querySelector('[aria-label]')?.getAttribute('aria-label')||node.textContent.trim();return {count:buttons.length,labels:buttons.map(labelled).slice(0,10),quick:buttons.some(b=>!b.getAttribute('aria-haspopup')&&(labelled(b).startsWith('Marcar verificado')||labelled(b).startsWith('Ver detalle'))),menu:buttons.some(b=>b.getAttribute('aria-haspopup')==='menu')};})()`);
  check(`inventario ${W}: una acción rápida visible`,Boolean(actions&&actions.quick));
  check(`inventario ${W}: menú ⋯ de acciones`,Boolean(actions&&actions.menu));
  check(`inventario ${W}: sin la fila de seis iconos`,Boolean(actions&&actions.count<=8),true);
  if(actions)note(`inventario ${W}: ${actions.count} botones visibles — ${JSON.stringify(actions.labels)}`);
  await evaluate(`(()=>{const card=document.querySelector('[data-grid-card="equipment"]');const menu=card.querySelector('button[aria-haspopup="menu"]');if(menu)menu.click();return true;})()`);
  await sleep(400);
  const menuText=await evaluate(`document.querySelector('[role="menu"]')?.innerText||''`);
  for(const label of ['Ver detalle','Editar equipo','Imprimir etiqueta','Archivar equipo'])check(`inventario ${W}: ⋯ con ${label}`,menuText.includes(label));
  await capture(`inventario-menu-${W}-light`);
  await evaluate(`document.body.click()`);await sleep(300);
 }
 // Lista y pipeline (patrón compartido).
 await evaluate(`(()=>{const control=document.querySelector('[aria-label="Vista de inventario"]');const el=control&&[...control.querySelectorAll('button')].find(n=>n.textContent.trim()==='Lista');if(el)el.click();return true;})()`);
 await sleep(600);
 await capture(`inventario-lista-${W}-light`);
 await evaluate(`(()=>{const control=document.querySelector('[aria-label="Vista de inventario"]');const el=control&&[...control.querySelectorAll('button')].find(n=>n.textContent.trim()==='Ubicaciones');if(el)el.click();return true;})()`);
 await waitFor(`document.querySelector('[data-board-column]')`,{label:'pipeline'});
 await sleep(400);
 await capture(`inventario-pipeline-${W}-light`);

 // Estudio: empty state.
 await goTo('Estudio');
 await waitFor(`document.body.textContent.includes('Sin espacios todavía')||document.querySelector('[data-grid="studio-spaces"]')`,{label:'estudio'});
 await sleep(400);
 await capture(`estudio-vacio-${W}-light`);
 await setTheme('dark');await capture(`estudio-vacio-${W}-dark`);await setTheme('light');
 if(withChecks){
  const empty=await evaluate(`(()=>{const title=[...document.querySelectorAll('p')].find(node=>node.textContent.includes('Sin espacios todavía'));if(!title)return {empty:0,panel:0};const box=title.parentElement;return {empty:Math.round(box?.getBoundingClientRect().height||0),panel:Math.round(box?.parentElement?.getBoundingClientRect().height||0)};})()`);
  note(`estudio ${W}: empty state ${empty.empty} px · panel ${empty.panel} px (patrón DSN #138 pendiente)`);
  checks.push({label:`estudio ${W}: empty state medido`,ok:true,value:empty});
 }
}

writeFileSync(resolve(out,`informe-${tag}.json`),JSON.stringify({generatedAt:new Date().toISOString(),tag,checks,log},null,1));
writeFileSync(resolve(out,`qa-${tag}.txt`),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(withChecks?(process.exitCode?`Demo audit #141 (${tag}): FALLÓ`:`Demo audit #141 (${tag}): PASS`):`Demo audit #141 (${tag}): capturas listas`);
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
