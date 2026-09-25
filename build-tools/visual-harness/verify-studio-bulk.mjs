/*
 * Lote en Reservas de Estudio (#59, refs #44): flujo completo contra la app real.
 *
 *   - la barra de lote aparece con reservas gestionables del mes;
 *   - seleccionar por fila y "Seleccionar visibles" respeta el tope (50);
 *   - "Cancelar" pide confirmación y cancela (batch si existe; si no, cancels
 *     unitarios con la versión de cada fila);
 *   - Postgres confirma el estado y la lista se refresca sin las canceladas;
 *   - el calendario queda intacto.
 *
 * Requisitos: stack local (receta en `e2e-drag.mjs`). Env: BASE_URL, PSQL_ARGS, QA_OUT.
 * Uso: node build-tools/visual-harness/verify-studio-bulk.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const PSQL=[...(process.env.PSQL_ARGS||'-h 127.0.0.1 -p 55432 -U postgres -d scaleos').split(' '),'-t','-A','-c'];
const psql=(sql)=>execFileSync('psql',[...PSQL,sql],{encoding:'utf8'}).trim();
const OUT=process.env.QA_OUT||'work/visual-harness/ronda-59-bulk';

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,300));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const clickByText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim()===${JSON.stringify(text)}&&n.offsetParent!==null);if(!el)return false;el.click();return true;})()`);
const capture=async(name)=>{mkdirSync(OUT,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`${OUT}/${name}.png`,Buffer.from(data,'base64'));note(`captura ${OUT}/${name}.png`);};

const reservedBefore=Number(psql("select count(*) from agency_studio_reservations where status='reserved'"));
const month=psql("select to_char(current_date,'YYYY-MM')");
const inMonth=Number(psql(`select count(*) from agency_studio_reservations where status='reserved' and starts_at >= date_trunc('month',current_date)`));

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
await send('Page.navigate',{url:BASE+'/estudio'});
await sleep(6000);
await waitFor(`document.querySelector('[data-list="studio-reservations"]')`,{label:'reservas del estudio'});
await sleep(1500);
check('estudio: hay reservas gestionables del mes',inMonth>0);
const bar=await waitFor(`document.querySelector('.bulk-bar')`,{timeout:15000,label:'barra de lote'}).catch(()=>false);
check('estudio: la barra de lote aparece',bar);
const initial=await evaluate(`(()=>({hint:/Seleccioná varias reservas/.test(document.body.textContent||''),checkboxes:document.querySelectorAll('[data-list-row="studio-reservations"] input[type=checkbox]').length}))()`);
note(`reservas del mes: ${inMonth} · casillas de selección: ${initial.checkboxes}`);

// Selección por fila (2) y contador.
await evaluate(`(()=>{const boxes=[...document.querySelectorAll('[data-list-row="studio-reservations"] input[type=checkbox]:not(:disabled)')];boxes.slice(0,2).forEach(box=>box.click());return boxes.length;})()`);
await sleep(900);
const selectedText=await evaluate(`document.querySelector('.bulk-count')?.textContent?.trim()||''`);
check('estudio: el contador refleja 2 seleccionadas',/2 de 50 seleccionadas/.test(selectedText));
note(`contador: «${selectedText}»`);
await capture('estudio-lote-seleccion');

// "Seleccionar visibles" respeta el tope.
await clickByText('Seleccionar visibles');
await sleep(900);
const visibleText=await evaluate(`document.querySelector('.bulk-count')?.textContent?.trim()||''`);
check('estudio: seleccionar visibles usa el total del mes',new RegExp(`${Math.min(inMonth,50)} de 50 seleccionadas`).test(visibleText));
note(`contador tras visibles: «${visibleText}»`);

// Confirmación + cancelación en lote (batch o fallback unitario).
const targetIds=await evaluate(`(()=>[...document.querySelectorAll('[data-list-row="studio-reservations"] input[type=checkbox]:checked')].slice(0,2).map(box=>box.closest('[data-list-row]')?.querySelector('b')?.textContent||''))()`);
await evaluate(`(()=>{const boxes=[...document.querySelectorAll('[data-list-row="studio-reservations"] input[type=checkbox]')];boxes.forEach(box=>{if(box.checked)box.click();});return true;})()`);
await sleep(600);
await evaluate(`(()=>{const boxes=[...document.querySelectorAll('[data-list-row="studio-reservations"] input[type=checkbox]')];boxes.slice(0,2).forEach(box=>box.click());return true;})()`);
await sleep(700);
check('estudio: "Cancelar" abre la confirmación',await clickByText('Cancelar'));
const dialog=await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:15000,label:'confirmación'}).catch(()=>false);
check('estudio: la confirmación pide el lote',dialog);
const dialogText=await evaluate(`[...document.querySelectorAll('[role="dialog"]')].map(d=>d.textContent).join(' ')`);
check('estudio: la confirmación explica el efecto',/Se liberan los espacios/.test(dialogText));
await capture('estudio-lote-confirmacion');
const confirmText=(dialogText.match(/Cancelar \d+ reservas? de estudio/)||[''])[0];
const cancelledBefore=Number(psql("select count(*) from agency_studio_reservations where status='cancelled'"));
const confirmed=await evaluate(`(()=>{const dialog=[...document.querySelectorAll('[role="dialog"]')].pop();const button=[...(dialog?[...dialog.querySelectorAll('button')]:[])].find(b=>/Cancelar reservas/i.test(b.textContent));if(!button)return false;button.click();return true;})()`);
check('estudio: se confirma el lote',confirmed);
const done=await waitFor(`/reservas? canceladas?\./.test(document.body.textContent||'')`,{timeout:30000,label:'aviso de cancelación'}).catch(()=>false);
check('estudio: el lote avisa el resultado',done);
await sleep(2500);
const cancelledAfter=Number(psql("select count(*) from agency_studio_reservations where status='cancelled'"));
check('estudio: Postgres registra 2 cancelaciones',cancelledAfter-cancelledBefore,2);
const notice=await evaluate(`(()=>{const text=document.body.textContent||'';const match=text.match(/\\d+ reservas? canceladas?\\./);return match?match[0]:'';})()`);
note(`aviso: «${notice}» · confirmación: «${confirmText}»`);
const remaining=await evaluate(`document.querySelectorAll('[data-list-row="studio-reservations"] input[type=checkbox]').length`);
note(`reservas gestionables restantes en la lista: ${remaining} (antes ${initial.checkboxes})`);
check('estudio: la lista se refrescó sin las canceladas',remaining,initial.checkboxes-2);
const calendar=await evaluate(`Boolean(document.querySelector('[aria-label^="Calendario"]'))`);
check('estudio: el calendario sigue en su lugar',calendar);

// Mobile: barra usable a 360 y targets de 44.
await send('Emulation.setDeviceMetricsOverride',{width:360,height:844,deviceScaleFactor:2,mobile:true});
await sleep(1200);
const mobile=await evaluate(`(()=>{const bar=document.querySelector('.bulk-bar');const buttons=[...document.querySelectorAll('.bulk-bar button')].map(b=>Math.round(b.getBoundingClientRect().height));const boxes=[...document.querySelectorAll('[data-list-row="studio-reservations"] label')].map(l=>Math.round(l.getBoundingClientRect().height)).filter(h=>h>0);return {bar:bar?Math.round(bar.getBoundingClientRect().width):0,viewport:innerWidth,buttons,boxes:boxes.slice(0,2),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};})()`);
check('estudio 360: la barra entra en el viewport',mobile.bar<=mobile.viewport,true);
check('estudio 360: botones de la barra ≥44',mobile.buttons.every(h=>h>=44));
check('estudio 360: casillas con target ≥44',mobile.boxes.every(h=>h>=44));
note(`mobile: barra ${mobile.bar}/${mobile.viewport} · botones ${mobile.buttons.join('/')} · casillas ${mobile.boxes.join('/')} · desborde ${mobile.overflow}`);
await capture('estudio-lote-mobile');

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS lote en Reservas de Estudio: selección, tope, confirmación, cancelación y refresco verificados.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
