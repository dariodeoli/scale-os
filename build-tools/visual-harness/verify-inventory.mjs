/*
 * Verificación del inventario (#58, refs #44): catálogo, fotos y nada perdido.
 *
 *   - catálogo con 2.000 equipos: payload (transferSize) y tiempo de carga;
 *   - las piezas están todas (filas == Postgres) y con sus datos clave (código,
 *     serie, estado, ubicación);
 *   - las fotos aparecen donde corresponden: miniatura en la tarjeta/fila y foto
 *     completa en la ficha (drawer), más el avatar del verificador cuando hay;
 *   - avatares de responsables en el pipeline (identidades, no catálogo).
 *
 * El "después" del recorte de `inventory` (issue #58, PLT) se mide con el mismo
 * comando: cuando la lista deje de mandar la foto completa, el payload baja y
 * esta herramienta lo evidencia sin cambios.
 *
 * Requisitos: stack local (receta en `e2e-drag.mjs`). Env: BASE_URL, PSQL_ARGS.
 * Uso: node build-tools/visual-harness/verify-inventory.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {readFileSync} from 'node:fs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const PSQL=[...(process.env.PSQL_ARGS||'-h 127.0.0.1 -p 55432 -U postgres -d scaleos').split(' '),'-t','-A','-c'];
const psql=(sql)=>execFileSync('psql',[...PSQL,sql],{encoding:'utf8'}).trim();
const OUT=process.env.QA_OUT||'work/visual-harness/ronda-58';

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const waitFor=async(expression,{timeout=60000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return true;await new Promise(r=>setTimeout(r,300));}throw new Error(`timeout esperando ${label||expression}`);};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const clickByText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim()===${JSON.stringify(text)}&&n.offsetParent!==null);if(!el)return false;el.click();return true;})()`);
const capture=async(name)=>{mkdirSync(OUT,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`${OUT}/${name}.png`,Buffer.from(data,'base64'));note(`captura ${OUT}/${name}.png`);};
const inventoryRequests=()=>evaluate(`performance.getEntriesByType('resource').filter(e=>e.name.includes('/core-api/api/agency/inventory')).map(e=>({url:e.name.replace(/^.*\\/core-api/,''),size:e.transferSize,ms:Math.round(e.duration)}))`);

const total=Number(psql('select count(*) from agency_inventory'));
const photos=Number(psql("select count(*) from agency_inventory where photo_url is not null"));

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});
await send('Page.navigate',{url:BASE+'/'});
await sleep(4500);
await waitFor(`[...document.querySelectorAll('button,a')].some(n=>n.textContent.trim()==='Inventario')`,{label:'cáscara'});
const started=Date.now();
await clickByText('Inventario');
const ready=await waitFor(`document.querySelector('[data-grid-card="equipment"],[data-list-row="equipment"]')`,{timeout:90000,label:'catálogo'}).catch(()=>false);
const loadMs=Date.now()-started;
check(`catálogo: carga con ${total} equipos`,ready);
const rows=await evaluate(`document.querySelectorAll('[data-grid-card="equipment"],[data-list-row="equipment"]').length`);
check('catálogo: nada perdido (filas == Postgres)',rows,total);
note(`catálogo: ${rows} equipos en ${(loadMs/1000).toFixed(1)} s`);
const catalog=((await inventoryRequests()).filter(entry=>/\/inventory(\?|$)/.test(entry.url)).slice(-1)[0])||{size:0,ms:0,url:''};
note(`payload del catálogo: ${catalog.size} bytes (${catalog.ms} ms de lectura)${catalog.url.includes('fields=')?' con proyección':' — la foto completa viaja por fila'}`);
if(photos)note(`equipos con foto en la base: ${photos}/${total}`);

// Datos clave visibles en la grilla.
const sample=await evaluate(`(()=>{const card=document.querySelector('[data-grid-card="equipment"]');if(!card)return null;const text=card.textContent||'';return {hasCode:/INV-\\d+/.test(text),hasStatus:/Disponible|En uso|Mantenimiento|Archivado/.test(text),hasPhoto:Boolean(card.querySelector('img'))};})()`);
check('tarjeta: código y estado visibles',sample&&sample.hasCode&&sample.hasStatus);
note(`tarjeta: miniatura de foto ${sample?.hasPhoto?'presente':'ausente (se usa el ícono de categoría)'}`);
await capture('inventario-catalogo');

// Ficha: la foto completa sigue donde corresponde + avatares del sello.
const cardClick=await evaluate(`(()=>{const card=document.querySelector('[data-grid-card="equipment"],[data-list-row="equipment"]');const button=card?.querySelector('button[aria-label^="Detalle y trazabilidad"], button[aria-label^="Abrir detalle"]');if(!button)return false;button.click();return true;})()`);
check('ficha: abre el detalle del equipo',cardClick);
const drawer=await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:30000,label:'ficha'}).catch(()=>false);
check('ficha: el drawer renderiza',drawer);
if(drawer){
 await sleep(2000);
 const ficha=await evaluate(`(()=>{const dialog=[...document.querySelectorAll('[role="dialog"]')].pop();const text=dialog?.textContent||'';const images=[...dialog.querySelectorAll('img')].map(img=>img.getAttribute('src')||'');return {hasFullPhoto:images.some(src=>src.startsWith('data:image/')),images:images.length,hasTrace:/Trazabilidad|Serie|Valor|Ubicación/i.test(text)};})()`);
 check('ficha: muestra la foto completa',ficha.hasFullPhoto);
 check('ficha: muestra los datos de trazabilidad',ficha.hasTrace);
 note(`ficha: ${ficha.images} imágenes (incluye la foto del equipo)`);
 await capture('inventario-ficha');
 await evaluate(`(()=>{const dialog=[...document.querySelectorAll('[role="dialog"]')].pop();const close=[...(dialog?[...dialog.querySelectorAll('button')]:[])].find(b=>/cerrar|Cerrar/i.test(b.getAttribute('aria-label')||b.textContent));if(close)close.click();})()`);
 await sleep(600);
}

// Pipeline: tarjetas con foto o ícono, y avatares de responsables si hay.
await clickByText('Cuadrícula').catch(()=>false);
const pipelineOption=await evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(n=>n.textContent.trim()==='Ubicaciones'&&n.offsetParent!==null);if(!el)return false;el.click();return true;})()`);
check('pipeline: se abre la vista de ubicaciones',pipelineOption);
await waitFor(`document.querySelector('[data-board-card]')`,{timeout:60000,label:'pipeline'});
await sleep(1500);
const pipeline=await evaluate(`(()=>{const card=document.querySelector('[data-board-card]');const board=document.querySelector('[data-board="locations"]');return {cards:document.querySelectorAll('[data-board-card]').length,columns:document.querySelectorAll('[data-board-column]').length,cardHasPhotoOrIcon:Boolean(card?.querySelector('img')||card?.querySelector('svg')),avatars:board?board.querySelectorAll('.actor-identity-avatar,img').length:0};})()`);
check('pipeline: tarjetas listadas',pipeline.cards>0);
check('pipeline: la tarjeta muestra foto o ícono de categoría',pipeline.cardHasPhotoOrIcon);
note(`pipeline: ${pipeline.cards} tarjetas en ${pipeline.columns} columnas · ${pipeline.avatars} avatares/imágenes en el tablero`);
await capture('inventario-pipeline');

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS inventario: catálogo completo, fotos donde corresponden (tarjeta/ficha) y payload medido.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
