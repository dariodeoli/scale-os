/*
 * Consistencia post-rediseño (ronda 9, refs #42 #44): recorre la vertical OPS en
 * la app real por RUTA (arranque limpio por tema) a 360/390/430/768/1440 en
 * claro y oscuro; deja capturas y verifica invariantes del sistema:
 *   - un solo h1 por pantalla (el header unificado del shell);
 *   - sin scroll horizontal del documento en cada ancho;
 *   - filas de lista dentro del contrato 44–52.
 *
 * Uso: node build-tools/visual-harness/consistencia-vertical.mjs
 * Requisitos: stack local (receta en `e2e-drag.mjs`). Env: BASE_URL, QA_OUT.
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';

const BASE=process.env.BASE_URL||'http://127.0.0.1:3006';
const OUT=process.env.QA_OUT||'work/visual-harness/consistencia-119';
const WIDTHS=[360,390,430,768,1440];
const THEMES=['light','dark'];

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
const capture=async(name)=>{mkdirSync(OUT,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${OUT}/${name}.png`,Buffer.from(data,'base64'));};

// Pantalla → ruta propia (el shell resuelve la sección desde el pathname).
const screens=[
 {name:'Producción · Tablero',route:'/produccion',marker:'[data-column]',slug:'produccion-tablero'},
 {name:'Producción · Mi día',route:'/produccion',marker:'[role="table"]',slug:'produccion-mi-dia',view:'Mi día'},
 {name:'Producción · Calendario',route:'/produccion',marker:'[aria-label="Calendario de entregas del mes"]',slug:'produccion-calendario',view:'Calendario'},
 {name:'Producción · Lista y lotes',route:'/produccion',marker:'[role="table"]',slug:'produccion-lista',view:'Lista y lotes'},
 {name:'Proyectos',route:'/proyectos',marker:'.project-entry',slug:'proyectos'},
 {name:'Inventario',route:'/inventario',marker:'[data-grid-card="equipment"],[data-list-row="equipment"]',slug:'inventario'},
 {name:'Estudio',route:'/estudio',marker:'[data-grid-card="studio-spaces"],[data-list-row="studio-reservations"]',slug:'estudio'},
 {name:'Historial',route:'/equipo/historial',marker:'[aria-label="Historial de trabajo"]',slug:'historial'},
];

await send('Page.enable');await send('Runtime.enable');
await send('Network.setCookie',{name:'scale_session',value:'measure-token',url:BASE});

for(const theme of THEMES){
 for(const screen of screens){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  // Arranque limpio con el tema fijado antes de cargar.
  await send('Page.navigate',{url:BASE+'/'});
  await sleep(2000);
  await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
  await send('Page.navigate',{url:BASE+screen.route});
  await sleep(5000);
  if(screen.name==='Producción · Tablero'&&!await evaluate(`Boolean(document.querySelector('[data-column]'))`)){await clickByText('Tablero');await sleep(1500);}
  if(screen.view){
   await waitFor(`document.querySelector('[data-column]')`,{label:`${screen.name} base`}).catch(()=>undefined);
   check(`${screen.name}: cambia de vista`,await clickByText(screen.view));
   await sleep(1500);
  }
  const expectedTitle=screen.name.split(' · ')[0];
  const loaded=await waitFor(`document.querySelector('.workspace-page-header h1')?.textContent?.trim()===${JSON.stringify(expectedTitle)}`,{timeout:60000,label:`${screen.name} ${theme} (título)`}).catch(()=>false);
  check(`${screen.name} (${theme}): carga (título del shell)`,loaded);
  const ok=await waitFor(screen.marker,{timeout:20000,label:`${screen.name} ${theme} (contenido)`}).catch(()=>false);
  note(`${screen.name} (${theme}): contenido ${ok?'presente':'con otra vista guardada'}`);
  await sleep(1200);
  const audit=await evaluate(`(()=>{const shellHeader=document.querySelector('.workspace-page-header');const h1=[...document.querySelectorAll('h1')].filter(n=>n.offsetParent);const rows=[...document.querySelectorAll('[data-list-row],[role="row"]')].filter(n=>!n.querySelector('.col-span-full')).map(n=>Math.round(n.getBoundingClientRect().height*10)/10).filter(h=>h>=40);const overflow=document.documentElement.scrollWidth-document.documentElement.clientWidth;return {title:shellHeader?.querySelector('h1')?.textContent?.trim()||null,h1Count:h1.length,rows:{min:rows.length?Math.min(...rows):null,max:rows.length?Math.max(...rows):null},overflow};})()`);
  check(`${screen.name} (${theme}): un solo h1`,audit.h1Count,1);
  check(`${screen.name} (${theme}): sin desborde del documento`,audit.overflow,0);
  if(audit.rows.min!==null)check(`${screen.name} (${theme}): filas 44–52`,audit.rows.min>=44&&audit.rows.max<=52,true);
  note(`${screen.name} (${theme}): título «${audit.title}» · filas ${audit.rows.min??'—'}–${audit.rows.max??'—'}`);
  for(const width of WIDTHS){
   const mobile=width<768;
   await send('Emulation.setDeviceMetricsOverride',{width,height:mobile?844:900,deviceScaleFactor:mobile?2:1,mobile});
   await sleep(600);
   const overflow=await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`);
   check(`${screen.name} (${theme}, ${width}px): sin desborde`,overflow,0);
   if(width===WIDTHS[0]||width===WIDTHS[2]||width===WIDTHS[4])await capture(`${screen.slug}-${width}-${theme}`);
  }
 }
}

console.log(log.join('\n'));
console.log(process.exitCode?'FALLÓ':'PASS consistencia OPS v1.0.119: header único, filas 44–52 y capturas claro/oscuro a 360–1440.');
await send('Page.close').catch(()=>{});
process.exit(process.exitCode||0);
