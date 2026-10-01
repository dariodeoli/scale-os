/*
 * QA y evidencia del alta manual de equipos (#130): divulgación progresiva
 * (básico visible + «Más datos» plegable), cantidad por unidad reservable,
 * «Guardar y agregar otro» con reenfoque y defaults previos, errores junto al
 * campo, serie que bloquea la cantidad y responsive 390/768 claro-oscuro.
 *
 * Requisitos: stack local de OPS (`e2e-ops-stack.mjs`) levantado con el build
 * actual. Salida: docs/qa/alta-130/ (capturas + informe.json + log).
 * Uso: node build-tools/visual-harness/qa-ops-alta-130.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const out=resolve(repo,'docs/qa/alta-130');
mkdirSync(out,{recursive:true});
const session=Object.fromEntries(readFileSync(resolve(repo,'work/visual-harness/ops-qa-session.txt'),'utf8').split('\n').filter(Boolean).map((line)=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE||'http://127.0.0.1:3006';
const ORG=session.ORG;
// Marcador por corrida: las series de QA no colisionan entre re-ejecuciones.
const RUN=Date.now().toString(36);
const psql=(sql)=>execFileSync('/opt/homebrew/Cellar/postgresql@17/17.11/bin/psql',['-h','127.0.0.1','-p','55432','-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();
const log=[];const checks=[];
const check=(label,value,expected=true)=>{const ok=value===expected;checks.push({label,ok,value,expected});log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=20000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78});writeFileSync(resolve(out,`${name}.jpg`),Buffer.from(data,'base64'));note(`captura ${name}.jpg`);};
const clickByText=(text,selector='button,a')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const clickByLabel=(label,selector='button,a,[role=button]')=>evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>(node.getAttribute('aria-label')||'')===${JSON.stringify(label)}&&node.getClientRects().length>0);if(!el)return false;el.focus?.();el.click();return true;})()`);
const setInput=async(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(String(value))});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return el.value;})()`);
const setTheme=async(theme)=>{await evaluate(`(()=>{localStorage.setItem('scale-theme',${JSON.stringify(theme)});if(${JSON.stringify(theme)}==='light')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=${JSON.stringify(theme)};return document.documentElement.dataset.theme||'light';})()`);await sleep(250);};
const setViewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await sleep(300);};
const escape=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await sleep(450);};
const closeDialog=async()=>{await escape();if(await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`))await clickByLabel('Cerrar');await waitFor(`!document.querySelector('[role="dialog"]')`,{timeout:8000,label:'diálogo cerrado'});};

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
const openNewItem=async()=>{
 const opened=await clickByText('Agregar equipo');
 if(!opened)throw new Error('sin botón Agregar equipo');
 await waitFor(`(()=>{const h=document.querySelector('[role="dialog"] h2');return h&&h.textContent.trim()==='Nuevo equipo';})()`,{label:'diálogo Nuevo equipo'});
 await sleep(400);
};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:session.OWNER_TOKEN||'measure-token',url:BASE});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await evaluate(`localStorage.clear()`);await send('Page.reload');await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Inventario'||n.textContent.trim()==='Resumen')`,{label:'cáscara',timeout:30000});

for(const [width,height] of [[390,844],[768,1024]]){
 await setViewport(width,height);await setTheme('light');
 const W=String(width);
 log.push(`\n──── ${width}×${height} ────`);
 await goTo('Inventario');
 await waitFor(`document.querySelector('[data-grid-card="equipment"],[data-list-row="equipment"]')`,{label:'inventario'});
 await sleep(500);

 // Básico visible y «Más datos» plegado.
 await openNewItem();
 const basic=await evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');const details=dialog.querySelector('details');const vis=(id)=>{const el=dialog.querySelector('#'+id);if(!el)return false;return el.checkVisibility?el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}):Boolean(el.getClientRects().length);};return {quantity:Boolean(dialog.querySelector('#inventory-item-quantity')),name:Boolean(dialog.querySelector('#inventory-item-name')),value:Boolean(dialog.querySelector('#inventory-item-value')),detailsOpen:details?details.hasAttribute('open'):null,advancedVisible:vis('inventory-item-purchase')||vis('inventory-item-notes')};})()`);
 check(`alta ${W}: nombre, cantidad y valor visibles`,basic.name&&basic.quantity&&basic.value);
 check(`alta ${W}: «Más datos» plegado`,basic.detailsOpen===false);
 check(`alta ${W}: los campos avanzados no ocupan la primera pasada`,basic.advancedVisible===false);
 const advancedText=await evaluate(`document.querySelector('[role="dialog"] details')?.textContent||''`);
 for(const label of ['Foto del equipo','Valor de compra · Opcional','Método de depreciación','Estado','Custodio registrado','Fecha de adquisición','Notas'])check(`alta ${W}: ${label} sigue en Más datos`,advancedText.includes(label));
 await capture(`alta-basico-${W}-light`);
 await setTheme('dark');await capture(`alta-basico-${W}-dark`);await setTheme('light');

 // Validación junto al campo.
 await clickByText('Crear equipo');
 await waitFor(`document.querySelector('#inventory-item-name-error')`,{label:'error del nombre'});
 check(`alta ${W}: el error del nombre vive junto al campo`,await evaluate(`document.querySelector('#inventory-item-name-error')?.getAttribute('role')`),'alert');
 check(`alta ${W}: el input queda marcado inválido`,await evaluate(`document.querySelector('#inventory-item-name')?.getAttribute('aria-invalid')`),'true');
 await capture(`alta-error-nombre-${W}-light`);

 // Cantidad: 3 unidades y «Crear 3 equipos».
 const itemName=`Equipo QA #130 ${RUN} · ${W}`;
 await setInput('#inventory-item-name',itemName);
 await setInput('#inventory-item-quantity','3');
 check(`alta ${W}: el CTA dice cuántos equipos crea`,(await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].some(b=>b.textContent.trim()==='Crear 3 equipos')`)));
 await capture(`alta-cantidad-${W}-light`);
 await clickByText('Crear 3 equipos');
 await waitFor(`!document.querySelector('[role="dialog"]')`,{timeout:12000,label:'alta en serie'});
 await sleep(1200);
 if(ORG)check(`alta ${W}: 3 unidades persistidas`,psql(`select count(*) from agency_inventory where organization_id=${ORG} and name='${itemName}'`),'3');

 // «Guardar y agregar otro»: no cierra, avisa, limpia lo único y reenfoca.
 await openNewItem();
 await evaluate(`(()=>{const summary=document.querySelector('[role="dialog"] details summary');if(summary)summary.click();return true;})()`);
 await waitFor(`document.querySelector('[role="dialog"] details[open]')`,{timeout:5000,label:'Más datos abierto'});
 await evaluate(`document.querySelector('[role="dialog"] details')?.scrollIntoView({block:'start'})`);
 await sleep(300);
 await capture(`alta-mas-datos-${W}-light`);
 await setTheme('dark');await capture(`alta-mas-datos-${W}-dark`);await setTheme('light');
 await evaluate(`document.querySelector('[role="dialog"] .dialog-body, [role="dialog"] div[class*="overflow-y-auto"]')?.scrollTo?.(0,0)`);
 await setInput('#inventory-item-name','Equipo serie #130');
 await setInput('#inventory-item-value','450');
 await clickByText('Guardar y agregar otro');
 await waitFor(`document.body.textContent.includes('Equipo «Equipo serie #130» creado')`,{timeout:12000,label:'aviso de creado'});
 check(`alta ${W}: el diálogo sigue abierto`,await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`));
 check(`alta ${W}: el nombre se limpia`,await evaluate(`document.querySelector('#inventory-item-name')?.value`),'');
 check(`alta ${W}: el valor previo se conserva`,await evaluate(`document.querySelector('#inventory-item-value')?.value`),'450');
 check(`alta ${W}: el foco vuelve al nombre`,await evaluate(`document.activeElement?.id`),'inventory-item-name');
 await capture(`alta-agregar-otro-${W}-light`);
 await setTheme('dark');await capture(`alta-agregar-otro-${W}-dark`);await setTheme('light');
 await closeDialog();

 // Serie/IMEI: cantidad 1 y deshabilitada.
 await openNewItem();
 await setInput('#inventory-item-quantity','5');
 await setInput('#inventory-item-serial','SN-QA-130');
 const serialState=await evaluate(`(()=>{const q=document.querySelector('#inventory-item-quantity');return {value:q?.value,disabled:q?.disabled};})()`);
 check(`alta ${W}: con serie la cantidad queda en 1`,serialState.value,'1');
 check(`alta ${W}: con serie la cantidad se deshabilita`,serialState.disabled,true);
 await capture(`alta-serie-${W}-light`);
 await closeDialog();
}

writeFileSync(resolve(out,'informe.json'),JSON.stringify({generatedAt:new Date().toISOString(),checks,log},null,1));
writeFileSync(resolve(out,'qa-alta-130.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(process.exitCode?'Alta de equipos #130: FALLÓ':'Alta de equipos #130: PASS');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
