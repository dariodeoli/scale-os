/*
 * Estado de error y reintento del inventario (#58, refs #44).
 *
 * Con las lecturas de inventario bloqueadas desde el navegador (sin tocar la API):
 *   - la pantalla muestra el mensaje accionable («No hay conexión con el servidor
 *     para el contexto de inventario…»), sin errores crudos;
 *   - al desbloquear, el botón Reintentar recupera el catálogo completo.
 *
 * Requisitos: stack local (receta en `e2e-drag.mjs`). Env: BASE_URL, QA_OUT.
 * Uso: node build-tools/visual-harness/verify-inventory-error.mjs
 */

import {launchChrome,openTarget} from '/Users/fredd/.herdr/worktrees/scale-os/sos-ops/build-tools/visual-harness/chrome.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

const BASE='http://127.0.0.1:3006';
const OUT=process.env.QA_OUT||'work/visual-harness/ronda-58';
const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const api=(action)=>execFileSync('bash',['-lc',action],{encoding:'utf8'});

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const waitFor=async(expression,{timeout=60000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,300));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const capture=async(name)=>{mkdirSync(OUT,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`${OUT}/${name}.png`,Buffer.from(data,'base64'));log.push(`· captura ${OUT}/${name}.png`);};

await send('Page.enable');await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});

// 1) Lecturas de inventario bloqueadas: la sección muestra el estado accionable.
await send('Network.setBlockedURLs',{urls:['*/inventory*']});
await sleep(300);
await send('Page.navigate',{url:BASE+'/'});
await sleep(4000);
await evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim()==='Inventario'&&n.offsetParent);if(el)el.click();return Boolean(el);})()`);
const errored=await waitFor(`document.body.textContent.includes('No se pudo cargar el inventario')`,{timeout:70000,label:'estado de error'}).catch(()=>false);
check('inventario caído: aparece el estado de error',errored);
const shown=await evaluate(`(()=>{const text=(document.body.textContent||'').replace(/\\s+/g,' ');const at=text.indexOf('No se pudo cargar el inventario');return {message:at>=0?text.slice(at,at+240):'',raw:/TimeoutError|SyntaxError|Unexpected token|fetch failed/.test(text)};})()`);
check('inventario caído: mensaje accionable (sin errores crudos)',shown.raw,false);
check('inventario caído: nombra la sección y el motivo',/No hay conexión|categorías|catálogo|contexto/i.test(shown.message));
log.push(`· mensaje mostrado: «${shown.message.trim()}»`);
await capture('inventario-error-api-caida');

// 2) Se desbloquean las lecturas y el botón Reintentar recupera el catálogo.
await send('Network.setBlockedURLs',{urls:[]});
check('API disponible',api("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3901/health"),'200');
const clicked=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>/Reintentar/i.test(b.textContent));if(!button)return false;button.click();return true;})()`);
check('inventario caído: el botón Reintentar existe y se pulsa',clicked);
const recovered=await waitFor(`document.querySelector('[data-grid-card="equipment"],[data-list-row="equipment"]')`,{timeout:90000,label:'catálogo recuperado'}).catch(()=>false);
check('inventario: Reintentar recupera el catálogo',recovered);
const cards=await evaluate(`document.querySelectorAll('[data-grid-card="equipment"],[data-list-row="equipment"]').length`);
log.push(`· catálogo recuperado con ${cards} equipos en pantalla`);
await capture('inventario-recuperado');

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS ruta de error del inventario: mensaje accionable con la API caída y Reintentar recupera el catálogo.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
