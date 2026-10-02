/*
 * Capturas de evidencia del #137 (chrome móvil): header demo→drawer, tabs con
 * scroll/selector (Producción, Equipo, Configuración, Inventario), popup «Nueva
 * orden» con combobox y a11y del switch Lista/Cuadrícula. Claro/oscuro y medidas
 * crudas en JSON.
 *
 * Requiere el stack local (e2e-com-stack.mjs con puertos propios) y el artifact
 * construido del branch:
 *   PG_BIN=... PG_DIR=/tmp/dsn-137-pg PG_PORT=55447 API_PORT=3947 FRONT_PORT=3047 \
 *   PROXY_PORT=3048 QA_SESSION=dsn-137-session.txt node build-tools/visual-harness/e2e-com-stack.mjs
 *   node build-tools/visual-harness/capture-demo-chrome-137.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const sessionFile=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'dsn-137-session.txt');
const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const OUT=resolve(repo,process.env.OUT_DIR||'docs/qa/demo-chrome-137');
const measurements=[];
mkdirSync(OUT,{recursive:true});

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{
 const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));
 return result.value;
};
const sleep=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=60000,label=''}={})=>{
 const start=Date.now();
 while(Date.now()-start<timeout){
  try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}
  await sleep(250);
 }
 throw new Error(`timeout esperando ${label||expression}`);
};
const shot=async(file,clip,scale=2)=>{
 const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:true,...(clip?{clip:{...clip,scale}}:{})});
 writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
 console.log(`${file}${clip?` (recorte ×${scale})`:''}`);
};
const rectOf=(selector)=>evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return null;const box=element.getBoundingClientRect();if(!box.width||!box.height)return null;return {x:Math.max(0,Math.floor(box.left)+window.scrollX-8),y:Math.max(0,Math.floor(box.top)+window.scrollY-8),width:Math.ceil(box.width)+16,height:Math.ceil(box.height)+16};})()`);
const click=async(selector)=>{
 const ok=await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return false;element.click();return true;})()`);
 if(!ok)throw new Error(`no se encontró ${selector}`);
 await sleep(450);
};
const applyTheme=theme=>evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
const nav=async(path,ready)=>{await send('Page.navigate',{url:BASE+path});await waitFor(`document.querySelector('.workspace-topbar')&&document.querySelector(${JSON.stringify(ready)})`,{label:`${path} ${ready}`});await sleep(900);};

try{
 await send('Page.enable');await send('Runtime.enable');
 await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});
 for(const theme of (process.env.QA_THEMES||'light,dark').split(',')){
  for(const [width,height] of (process.env.QA_SIZES||'390x844,1440x900').split(',').map(size=>size.split('x').map(Number))){
   const mobile=width<768;
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
   // ── Header: modo demo sin fila propia; el disparador abre el popup ────────
   await nav('/resumen','.workspace-topbar');
   await applyTheme(theme);
   await waitFor(`document.querySelector('.topbar-status')`,{label:'topbar-status'});
   const header=await evaluate(`(()=>{
    const topbar=document.querySelector('.workspace-topbar');
    const items=[...topbar.querySelectorAll('.topbar-primary,.topbar-status,.topbar-utility-actions')];
    const lineas=new Set(items.filter(element=>element.getClientRects().length).map(element=>Math.round(element.getBoundingClientRect().top))).size;
    const status=document.querySelector('.topbar-status');
    const trigger=document.querySelector('.demo-trigger');
    return {lineas,alto:Math.round(topbar.getBoundingClientRect().height),statusTop:status?Math.round(status.getBoundingClientRect().top):null,triggerTop:trigger?Math.round(trigger.getBoundingClientRect().top):null,triggerHeight:trigger?Math.round(trigger.getBoundingClientRect().height):null,inlineDemo:document.querySelector('.demo-tools')?document.querySelector('.demo-tools').getClientRects().length>0:false};
   })()`);
   measurements.push({step:'header',theme,width,height,...header});
   console.log(`header ${width} ${theme}:`,JSON.stringify(header));
   const topbar=await rectOf('.workspace-topbar');
   if(topbar)await shot(`header-${width}-${theme}.jpg`,topbar);
   if(mobile){
    await click('.demo-trigger');
    await waitFor(`document.querySelector('.unified-dialog')`,{label:'drawer demo'});
    const drawer=await rectOf('.unified-dialog');
    if(drawer)await shot(`demo-drawer-${width}-${theme}.jpg`,drawer);
    const drawerInfo=await evaluate(`(()=>{const dialog=document.querySelector('.unified-dialog');return {titulo:dialog?.querySelector('h2')?.textContent||'',selects:dialog.querySelectorAll('select').length,reset:dialog.querySelector('a[aria-label="Reiniciar demo"]')?true:false,cliente:dialog.textContent.includes('Así te ve tu cliente')};})()`);
    measurements.push({step:'demo-drawer',theme,width,...drawerInfo});
    console.log(`drawer demo ${width} ${theme}:`,JSON.stringify(drawerInfo));
    await click('.unified-dialog .dialog-heading .icon-button');
    await sleep(300);
   }
   // ── Tabs de apartados: Equipo y Configuración (scroll con chevrones) ──────
   for(const [path,label] of [['/equipo','equipo'],['/configuracion','configuracion']]){
    await nav(path,'.section-tabs');
    await applyTheme(theme);
    const tabs=await evaluate(`(()=>{const track=document.querySelector('.tab-scroller-track');const bar=document.querySelector('.section-tabs');const scroller=document.querySelector('.tab-scroller');return {scrollWidth:track?Math.round(track.scrollWidth):null,clientWidth:track?Math.round(track.clientWidth):null,scrollable:track?track.scrollWidth>track.clientWidth+1:false,segundaLinea:bar?Math.round(bar.getBoundingClientRect().height)>56:false,chevrones:scroller?scroller.querySelectorAll('.tab-scroller-button').length:0,prevDisabled:scroller?.querySelector('.tab-scroller-button.prev')?.disabled??null,nextDisabled:scroller?.querySelector('.tab-scroller-button.next')?.disabled??null};})()`);
    measurements.push({step:'tabs-'+label,theme,width,height,...tabs});
    console.log(`tabs ${label} ${width} ${theme}:`,JSON.stringify(tabs));
    const barBox=await rectOf('.tab-scroller');
    if(barBox)await shot(`tabs-${label}-${width}-${theme}.jpg`,barBox);
    if(mobile&&tabs.nextDisabled===false&&theme==='light'){
     await click('.tab-scroller-button.next');
     const scrolled=await evaluate(`(()=>{const track=document.querySelector('.tab-scroller-track');return {scrollLeft:Math.round(track.scrollLeft),prevDisabled:document.querySelector('.tab-scroller-button.prev')?.disabled??null};})()`);
     measurements.push({step:'tabs-'+label+'-scrolled',theme,width,...scrolled});
     const barBox2=await rectOf('.tab-scroller');
     if(barBox2)await shot(`tabs-${label}-scroll-${width}-${theme}.jpg`,barBox2);
    }
   }
   // ── Tabs de Producción: una fila con scroll (sin envolver) ────────────────
   await nav('/produccion','.production-view-tabs');
   await applyTheme(theme);
   const production=await evaluate(`(()=>{const segmented=document.querySelector('[aria-label="Vista de Producción"]');const track=document.querySelector('.production-view-tabs .tab-scroller-track');const buttons=segmented?[...segmented.querySelectorAll('button')]:[];const tops=new Set(buttons.map(button=>Math.round(button.getBoundingClientRect().top)));return {botones:buttons.length,lineas:tops.size,scrollWidth:track?Math.round(track.scrollWidth):null,clientWidth:track?Math.round(track.clientWidth):null,chevrones:document.querySelectorAll('.production-view-tabs .tab-scroller-button').length};})()`);
   measurements.push({step:'tabs-produccion',theme,width,height,...production});
   console.log(`tabs produccion ${width} ${theme}:`,JSON.stringify(production));
   const productionBox=await rectOf('.production-view-tabs');
   if(productionBox)await shot(`tabs-produccion-${width}-${theme}.jpg`,productionBox);
   // ── Popup «Nueva orden»: combobox primero, resto después de elegir ────────
   await click('button.primary');
   await waitFor(`document.querySelector('.unified-dialog')`,{label:'nueva orden'});
   const before=await evaluate(`(()=>{const dialog=document.querySelector('.unified-dialog');return {textarea:dialog.querySelectorAll('textarea').length,inputs:dialog.querySelectorAll('input').length,combo:dialog.querySelectorAll('.ops-select-trigger').length};})()`);
   measurements.push({step:'orden-paso1',theme,width,...before});
   console.log(`orden paso 1 ${width} ${theme}:`,JSON.stringify(before));
   const orderDialog=await rectOf('.unified-dialog');
   if(orderDialog)await shot(`orden-paso1-${width}-${theme}.jpg`,orderDialog);
   await click('.unified-dialog .ops-select-trigger');
   await waitFor(`document.querySelector('.ops-select-options')`,{label:'combobox proyectos'});
   const combo=await evaluate(`(()=>{const dialog=document.querySelector('.unified-dialog');const search=dialog.querySelector('.ops-select-options input');return {opciones:dialog.querySelectorAll('.ops-select-options [role="option"]').length,buscador:!!search};})()`);
   measurements.push({step:'orden-combobox',theme,width,...combo});
   console.log(`orden combobox ${width} ${theme}:`,JSON.stringify(combo));
   if(orderDialog)await shot(`orden-combobox-${width}-${theme}.jpg`,orderDialog);
   await click('.ops-select-options [role="option"]');
   await waitFor(`document.querySelector('.unified-dialog textarea')`,{label:'resto del formulario'});
   const after=await evaluate(`(()=>{const dialog=document.querySelector('.unified-dialog');return {textarea:dialog.querySelectorAll('textarea').length,inputs:dialog.querySelectorAll('input').length,cambiar:[...dialog.querySelectorAll('button')].some(button=>button.textContent.includes('Cambiar'))};})()`);
   measurements.push({step:'orden-paso2',theme,width,...after});
   console.log(`orden paso 2 ${width} ${theme}:`,JSON.stringify(after));
   const orderDialog2=await rectOf('.unified-dialog');
   if(orderDialog2)await shot(`orden-paso2-${width}-${theme}.jpg`,orderDialog2);
   await click('.unified-dialog .dialog-heading .icon-button');
   // ── Inventario y planificador: el mismo carril desplazable ────────────────
   for(const [path,label,ready] of [['/inventario','inventario','.tab-scroller'],['/resumen','planificador','.tab-scroller']]){
    await nav(path,ready);
    await applyTheme(theme);
    const bar=await evaluate(`(()=>{const track=document.querySelector('.tab-scroller-track');const group=document.querySelector('[aria-label="Vistas de inventario"],[aria-label="Vista de inventario"],[role="tablist"]');const buttons=group?[...group.querySelectorAll('button')]:[];const tops=new Set(buttons.map(button=>Math.round(button.getBoundingClientRect().top)));return {scrollWidth:track?Math.round(track.scrollWidth):null,clientWidth:track?Math.round(track.clientWidth):null,lineas:tops.size,chevrones:document.querySelectorAll('.tab-scroller-button').length,segundaLinea:tops.size>1};})()`);
    measurements.push({step:'tabs-'+label,theme,width,height,...bar});
    console.log(`tabs ${label} ${width} ${theme}:`,JSON.stringify(bar));
    const barRect=await rectOf('.tab-scroller');
    if(barRect)await shot(`tabs-${label}-${width}-${theme}.jpg`,barRect);
   }
   // ── Switch Lista/Cuadrícula: semántica aria-pressed y foco visible ────────
   await nav('/clientes','.client-directory-view-controls');
   await applyTheme(theme);
   const view=await evaluate(`(()=>{const controls=document.querySelector('.client-directory-view-controls');const buttons=[...controls.querySelectorAll('button')];return {botones:buttons.length,pressed:buttons.map(button=>button.getAttribute('aria-pressed')),nombres:buttons.map(button=>button.getAttribute('aria-label')),checkboxes:controls.querySelectorAll('input[type=checkbox]').length,altura:buttons[0]?Math.round(buttons[0].getBoundingClientRect().height):null};})()`);
   measurements.push({step:'switch-vistas',theme,width,...view});
   console.log(`switch vistas ${width} ${theme}:`,JSON.stringify(view));
   const viewBox=await rectOf('.client-directory-view-controls');
   if(viewBox)await shot(`switch-vistas-${width}-${theme}.jpg`,viewBox);
  }
 }
 console.log(`Capturas en ${OUT}`);
 writeFileSync(resolve(OUT,'mediciones.json'),JSON.stringify(measurements,null,1));
}catch(error){
 console.error(error.stack||error);
 process.exitCode=1;
}finally{
 cdp.close();
 await chrome.close?.();
 process.exit(process.exitCode||0);
}
