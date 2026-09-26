/*
 * QA ola 2 de la vertical FIN (ronda 16, #70, refs #67).
 *
 * Recorre Finanzas, Mora, Previsión, Informes y Comisiones en la app real a
 * 360/390/430/1280 en claro y oscuro y deja una línea por chequeo:
 *   - sin scroll horizontal del documento (los rieles internos se registran);
 *   - targets ≥44 px en mobile sobre el contenido de la sección;
 *   - filas de lista dentro del contrato 44–52;
 *   - contraste AA (4.5:1 texto / 3:1 bordes) por tema;
 *   - modales en 390: foco atrapado, Escape cierra y devuelve el foco,
 *     cuerpo con scroll y pie alcanzable en formularios largos;
 *   - llamadas de red por pantalla: `/reports` única en Informes y ventana de
 *     pagos en Finanzas (#67).
 *
 * Requisitos: `node build-tools/visual-harness/e2e-fin-stack.mjs` corriendo
 * (deja la sesión en work/visual-harness/fin-qa-session.txt).
 * Env: QA_LABEL=antes|despues (solo nombra la salida).
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {CONTRAST_JS} from './contrast.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const sessionFile=resolve(here,'../../work/visual-harness/fin-qa-session.txt');
const session=Object.fromEntries(readFileSync(sessionFile,'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const LABEL=process.env.QA_LABEL||'run';
const OUT=resolve(here,`../../work/visual-harness/qa-fin-${LABEL}`);
mkdirSync(OUT,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=30000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(OUT,`${name}.png`),Buffer.from(data,'base64'));};

const requests=[];
cdp.on('Network.requestWillBeSent',event=>requests.push(event.request.url));
const drain=()=>{const urls=requests.slice();requests.length=0;return urls;};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE});

const setViewport=(width,mobile)=>send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:mobile?2:1,mobile:!!mobile});
const setTheme=async(theme)=>{await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return document.documentElement.dataset.theme;})()`);};

const screens=[
 {name:'Finanzas',route:'/pagos',marker:'section[aria-label="Finanzas"]',slug:'finanzas'},
 {name:'Mora',route:'/pagos/mora',marker:'section[aria-label="Cobranza y mora"]',slug:'mora'},
 {name:'Previsión',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]',slug:'prevision'},
 {name:'Informes',route:'/informes',marker:'section[aria-label="Reportes de la agencia"]',slug:'informes'},
 {name:'Comisiones',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]',slug:'comisiones'},
];

const AUDIT_JS=(marker)=>`(()=>{
 const section=document.querySelector(${JSON.stringify(marker)});
 if(!section)return null;
 const doc=document.documentElement;
 const small=[];
 section.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea,summary').forEach(el=>{
  if(el.disabled||el.closest('[aria-hidden="true"]')||el.closest('svg'))return;
  const r=el.getBoundingClientRect();
  if(!r.width||!r.height)return;
  if(r.height<43.5)small.push({tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,44),h:Math.round(r.height*10)/10,cls:String(el.className).slice(0,70)});
 });
 const rows=[...section.querySelectorAll('[role="row"]')].filter(row=>!row.querySelector('[role="columnheader"]')&&(row.querySelector('[role="cell"],[role="gridcell"],span,div')));
 const heights=rows.map(row=>Math.round(row.getBoundingClientRect().height*10)/10);
 const scrollers=[...section.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return el.scrollWidth>el.clientWidth+2&&(s.overflowX==='auto'||s.overflowX==='scroll');}).map(el=>({cls:String(el.className).slice(0,60),sw:el.scrollWidth,cw:el.clientWidth}));
 return {overflow:doc.scrollWidth-doc.clientWidth,small,rowMin:heights.length?Math.min(...heights):null,rowMax:heights.length?Math.max(...heights):null,rows:rows.length,scrollers};
})()`;

const SUMMARY_JS=`(()=>{const el=document.querySelector('[role="dialog"]');if(!el)return null;const body=el.querySelector('.dialog-body');const footer=el.querySelector('.dialog-footer');const rect=el.getBoundingClientRect();const buttons=[...el.querySelectorAll('button')].filter(b=>!b.disabled&&b.getBoundingClientRect().height>0);return {title:(el.querySelector('.dialog-heading h2')||el.querySelector('h2'))?.textContent||'',width:Math.round(rect.width),height:Math.round(rect.height),right:Math.round(rect.right),bottom:Math.round(rect.bottom),bodyScrollable:body?body.scrollHeight>body.clientHeight+2:null,bodyScrollHeight:body?body.scrollHeight:null,bodyClientHeight:body?body.clientHeight:null,footerButtons:buttons.length,focusInside:Boolean(document.activeElement&&el.contains(document.activeElement))};})()`;

const closeDialog=async()=>{
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await sleep(400);
 return evaluate(`Boolean(document.querySelector('[role="dialog"]'))===false&&Boolean(document.querySelector('[data-qa-trigger]'))&&document.activeElement?.dataset?.qaTrigger==='1'`);
};
const tabStaysInside=async(count)=>{
 const inside=[];
 for(let i=0;i<count;i++){
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await sleep(40);
  inside.push(await evaluate(`Boolean(document.querySelector('[role="dialog"]')?.contains(document.activeElement))`));
 }
 return inside;
};

// ── Barrido por pantalla, ancho y tema ─────────────────────────────────────
for(const screen of screens){
 for(const theme of ['light','dark']){
  for(const width of [360,390,430,1280]){
   await setViewport(width,width<768);
   requests.length=0;
   await send('Page.navigate',{url:BASE+screen.route});
   await waitFor(`document.querySelector(${JSON.stringify(screen.marker)})`,{timeout:45000,label:`${screen.name} ${theme} ${width}`});
   await setTheme(theme);
   await sleep(600);
   const urls=drain();
   const audit=await evaluate(AUDIT_JS(screen.marker));
   check(`${screen.name} (${theme}, ${width}): sin scroll horizontal del documento`,audit.overflow,0);
   if(width<768){
    check(`${screen.name} (${theme}, ${width}): targets ≥44`,audit.small.length,0);
    if(audit.small.length)for(const item of audit.small.slice(0,6))note(`  ${screen.name} ${width}: ${item.h}px · ${item.tag} «${item.label}» · ${item.cls}`);
   }
   if(audit.rowMin!==null)check(`${screen.name} (${theme}, ${width}): filas 44–52`,audit.rowMin>=44&&audit.rowMax<=52,true);
   if(audit.scrollers.length)note(`${screen.name} (${theme}, ${width}): rieles internos ${JSON.stringify(audit.scrollers.map(s=>`${s.sw}>${s.cw}`))}`);
   if(theme==='dark'||width===390){
    const contrast=await evaluate(CONTRAST_JS);
    check(`${screen.name} (${theme}, ${width}): contraste texto AA`,contrast.failureCount,0);
    check(`${screen.name} (${theme}, ${width}): bordes de control 3:1`,contrast.uiFailureCount,0);
    for(const failure of contrast.failures.slice(0,5))note(`  contraste ${failure.ratio} (<${failure.threshold}) «${failure.text}» ${failure.cls}`);
    for(const failure of contrast.uiFailures.slice(0,3))note(`  borde ${failure.ratio} ${failure.cls}`);
   }
   if(width===390||width===1280)await capture(`${screen.slug}-${width}-${theme}`);
   if(width===390){
    const reports=urls.filter(url=>url.includes('/api/agency/reports'));
    note(`${screen.name} (${width}, ${theme}): /reports ${reports.length} · ${reports.map(url=>url.split('?')[1]||'').join(' | ')}`);
    if(screen.name==='Informes')check(`Informes (${width}, ${theme}): una sola llamada a /reports`,reports.length,1);
    if(screen.name==='Finanzas'){
     const payments=urls.filter(url=>url.includes('/api/agency/payments'));
     note(`Finanzas pagos: ${payments.join(' ')}`);
    }
   }
  }
 }
}

// ── Modales en 390 (foco, scroll y pie) ────────────────────────────────────
await setViewport(390,true);
const modals=[
 {screen:screens[0],label:'Registrar cobro',long:true},
 {screen:screens[0],label:'Factura',long:true},
 {screen:screens[0],label:'Cuenta',long:true},
 {screen:screens[0],label:'Transferir',long:false},
 {screen:screens[4],label:'Comisión',long:true},
 {screen:screens[4],label:'Nuevo descuento',long:true},
];
for(const theme of ['dark']){
 for(const modal of modals){
  await send('Page.navigate',{url:BASE+modal.screen.route});
  await waitFor(`document.querySelector(${JSON.stringify(modal.screen.marker)})`,{timeout:45000,label:modal.screen.name});
  await setTheme(theme);
  await sleep(500);
  const opened=await evaluate(`(()=>{document.querySelectorAll('[data-qa-trigger]').forEach(el=>el.removeAttribute('data-qa-trigger'));const section=document.querySelector(${JSON.stringify(modal.screen.marker)});const button=[...section.querySelectorAll('button,a[href]')].find(el=>el.getBoundingClientRect().height>0&&(el.getAttribute('aria-label')||el.textContent||'').trim()===${JSON.stringify(modal.label)});if(!button)return false;button.focus();button.setAttribute('data-qa-trigger','1');button.click();return true;})()`).catch(()=>false);
  if(!opened){check(`${modal.screen.name} · «${modal.label}»: disparador visible`,false);continue;}
  await waitFor(`document.querySelector('[role="dialog"]')`,{timeout:8000,label:`diálogo «${modal.label}»`});
  await sleep(450);
  const summary=await evaluate(SUMMARY_JS);
  const slug=`modal-${modal.screen.slug}-${modal.label.toLowerCase().replace(/[^a-z]+/g,'-')}`;
  check(`${modal.screen.name} · «${modal.label}»: foco inicial adentro`,summary.focusInside,true);
  check(`${modal.screen.name} · «${modal.label}»: dentro del viewport`,summary.right<=390&&summary.bottom<=900,true);
  const overflow=await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`);
  check(`${modal.screen.name} · «${modal.label}»: sin scroll horizontal`,overflow,0);
  const inside=await tabStaysInside(18);
  check(`${modal.screen.name} · «${modal.label}»: foco atrapado (18 tabs)`,inside.every(Boolean),true);
  if(modal.long){
   check(`${modal.screen.name} · «${modal.label}»: cuerpo con scroll o completo`,summary.bodyScrollable!==null,true);
   const footerReachable=await evaluate(`(()=>{const body=document.querySelector('[role="dialog"] .dialog-body');if(!body)return false;body.scrollTop=body.scrollHeight;return body.scrollTop+body.clientHeight>=body.scrollHeight-2;})()`);
   check(`${modal.screen.name} · «${modal.label}»: pie alcanzable`,footerReachable,true);
  }
  await capture(slug);
  const closed=await closeDialog();
  check(`${modal.screen.name} · «${modal.label}»: Escape cierra y devuelve el foco`,closed,true);
 }
}

// ── Formularios largos inline (Previsión) y reduced-motion ────────────────
await setViewport(390,true);
await send('Page.navigate',{url:BASE+'/pagos/prevision'});
await waitFor(`document.querySelector('section[aria-label="Previsión financiera"]')`,{timeout:45000,label:'Previsión'});
await sleep(700);
const forms=await evaluate(`(()=>{const section=document.querySelector('section[aria-label="Previsión financiera"]');const list=[...section.querySelectorAll('form')];return list.map(form=>{const fields=[...form.querySelectorAll('input,select,textarea,button[type="submit"]')].filter(el=>el.getBoundingClientRect().height>0);const rect=form.getBoundingClientRect();return {fields:fields.length,minWidth:Math.min(...fields.map(el=>Math.round(el.getBoundingClientRect().width))),overflow:form.scrollWidth-form.clientWidth,width:Math.round(rect.width)};});})()`);
check('Previsión: formularios sin desborde',forms.every(form=>form.overflow===0),true);
note(`Previsión formularios: ${JSON.stringify(forms)}`);
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await sleep(300);
const motion=await evaluate(`(()=>{const el=document.querySelector('section[aria-label="Previsión financiera"] button');if(!el)return null;const s=getComputedStyle(el);return {duration:s.transitionDuration,animation:s.animationDuration};})()`);
note(`Previsión reduced-motion: ${JSON.stringify(motion)}`);
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});

// ── #67 en la UI: la lista de cobros viaja con ventana y completa a demanda ──
await setViewport(390,true);
requests.length=0;
await send('Page.navigate',{url:BASE+'/pagos'});
await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{timeout:45000,label:'Finanzas (ventana de cobros)'});
await sleep(900);
const paymentList=()=>evaluate(`(()=>{const section=document.querySelector('section[aria-label="Finanzas"]');const table=section.querySelector('[role="table"][aria-label="Cobros registrados"]');const rows=table?table.querySelectorAll('[role="rowgroup"] > [role="row"]').length:0;const button=[...section.querySelectorAll('button')].find(el=>(el.textContent||'').trim()==='Ver todos los cobros');return {rows,button:Boolean(button)};})()`);
const windowed=await paymentList();
check('Finanzas: la lista de cobros llega con ventana de 20',windowed.rows,20);
check('Finanzas: ofrece completar el histórico de cobros',windowed.button,true);
await evaluate(`(()=>{const button=[...document.querySelectorAll('section[aria-label="Finanzas"] button')].find(el=>(el.textContent||'').trim()==='Ver todos los cobros');if(button)button.click();})()`);
await sleep(1400);
const completed=await paymentList();
check('Finanzas: «Ver todos los cobros» trae el histórico',completed.rows>20,true);
check('Finanzas: el histórico se pide con limit=all',requests.some(url=>url.includes('/api/agency/payments?limit=all')),true);

writeFileSync(resolve(OUT,'qa.txt'),log.join('\n')+'\n');
writeFileSync(resolve(OUT,'qa.json'),JSON.stringify({label:LABEL,log},null,1));
console.log(log.join('\n'));
console.log(`\nEvidencia en ${OUT}`);
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(process.exitCode||0);
