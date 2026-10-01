/*
 * QA ola 2 — Finanzas (#126): Finanzas (transferencias), Previsión, Informes,
 * Mora y Comisiones en la app real a 390×844 y 768×1024, claro y oscuro.
 *
 * Chequeos:
 *   - sin scroll horizontal del documento; rieles internos con su etiqueta;
 *   - targets ≥44 px en 390 y filas de lista 44–52;
 *   - contraste AA de texto y 3:1 de bordes de control por tema;
 *   - entradas: tipo/inputMode correctos y sin zoom iOS (≥16 px) en 390;
 *   - modales: foco inicial, dentro del viewport, foco atrapado, cuerpo con
 *     scroll/pie alcanzable, Escape cierra y devuelve el foco;
 *   - validación visible al enviar vacío (sin efecto);
 *   - estados vacíos reales con las listas vacías (intercepción de red);
 *   - enmascarado intacto: finance sin salary.view no ve montos por persona.
 *
 * Requisitos: `node build-tools/visual-harness/e2e-fin-stack.mjs` corriendo
 * (sesión en work/visual-harness/fin-qa-session.txt).
 * Env: QA_LABEL=antes|despues, QA_OUT, BASE_URL.
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
const OUT=resolve(here,`../../${process.env.QA_OUT||'docs/qa/qa-fin-126'}`);
mkdirSync(OUT,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};
const note=text=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82});writeFileSync(resolve(OUT,`${name}.jpg`),Buffer.from(data,'base64'));};
const setTheme=theme=>evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
const setViewport=(width,height,mobile=false)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});

// Stubs de red para estados vacíos.
const stubs=new Map();
cdp.on('Fetch.requestPaused',async event=>{
 const stub=[...stubs.entries()].find(([pattern])=>event.request.url.includes(pattern));
 if(!stub){await send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>undefined);return;}
 await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/json'}],body:Buffer.from(JSON.stringify(stub[1])).toString('base64')}).catch(()=>undefined);
});

const screens=[
 {name:'Finanzas',route:'/pagos',marker:'section[aria-label="Finanzas"]',slug:'finanzas'},
 {name:'Mora',route:'/pagos/mora',marker:'section[aria-label="Cobranza y mora"]',slug:'mora'},
 {name:'Previsión',route:'/pagos/prevision',marker:'section[aria-label="Previsión financiera"]',slug:'prevision'},
 {name:'Informes',route:'/informes',marker:'section[aria-label="Reportes de la agencia"]',slug:'informes'},
 {name:'Comisiones',route:'/equipo/comisiones',marker:'section[aria-label="Comisiones y referidos"]',slug:'comisiones'},
];

const AUDIT_JS=(marker,mobile)=>`(()=>{
 const section=document.querySelector(${JSON.stringify(marker)});
 if(!section)return null;
 const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&el.offsetParent!==null;};
 const small=[];
 if(${JSON.stringify(Boolean(mobile))})section.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea,summary').forEach(el=>{
  if(el.disabled||!visible(el))return;
  const r=el.getBoundingClientRect();
  if(r.height<43.5)small.push({tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,44),h:Math.round(r.height*10)/10,cls:String(el.className).slice(0,60)});
 });
 const rows=[...section.querySelectorAll('[role="row"]')].filter(row=>visible(row)&&!row.querySelector('[role="columnheader"]'));
 const heights=rows.map(row=>Math.round(row.getBoundingClientRect().height*10)/10);
 const scrollers=[...section.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return el.scrollWidth>el.clientWidth+2&&(s.overflowX==='auto'||s.overflowX==='scroll');}).map(el=>({cls:String(el.className).slice(0,48),sw:el.scrollWidth,cw:el.clientWidth,label:el.getAttribute('aria-label')||''}));
 const tables=[...section.querySelectorAll('[role="table"]')].map(el=>({label:el.getAttribute('aria-label')||'',scroll:el.scrollWidth>el.clientWidth+2,sw:el.scrollWidth,cw:el.clientWidth}));
 const inputs=[...section.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(visible).map(el=>({tag:el.tagName,type:el.getAttribute('type')||'',inputMode:el.getAttribute('inputMode')||'',font:Math.round(parseFloat(getComputedStyle(el).fontSize)*10)/10,h:Math.round(el.getBoundingClientRect().height)})).slice(0,20);
 return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,small,rowMin:heights.length?Math.min(...heights):null,rowMax:heights.length?Math.max(...heights):null,rows:rows.length,scrollers,tables,inputs};
})()`;

const DIALOG_JS=`(()=>{const dialog=document.querySelector('section[role="dialog"]');if(!dialog)return null;const body=dialog.querySelector('.dialog-body');const rect=dialog.getBoundingClientRect();const buttons=[...dialog.querySelectorAll('button')].filter(button=>!button.disabled&&button.getBoundingClientRect().height>0);return {title:(dialog.querySelector('.dialog-heading h2')||dialog.querySelector('h2'))?.textContent||'',right:Math.round(rect.right),bottom:Math.round(rect.bottom),focusInside:Boolean(document.activeElement&&dialog.contains(document.activeElement)),bodyScrollable:body?body.scrollHeight>body.clientHeight+2:null,bodyScrollHeight:body?body.scrollHeight:0,bodyClientHeight:body?body.clientHeight:0,buttons:buttons.map(button=>({label:(button.getAttribute('aria-label')||button.textContent||'').trim().slice(0,30),h:Math.round(button.getBoundingClientRect().height)})),inputs:[...dialog.querySelectorAll('input:not([type="hidden"]),select,textarea')].map(el=>({type:el.getAttribute('type')||'',inputMode:el.getAttribute('inputMode')||'',font:Math.round(parseFloat(getComputedStyle(el).fontSize)*10)/10})).slice(0,14)};})()`;

const openDialog=async(screen,trigger)=>{
 return evaluate(`(()=>{
  document.querySelectorAll('[data-qa-trigger]').forEach(el=>el.removeAttribute('data-qa-trigger'));
  const section=document.querySelector(${JSON.stringify(screen.marker)});
  if(!section)return false;
  const match=[...section.querySelectorAll('button,a[href]')].find(el=>{
   const rect=el.getBoundingClientRect();if(!(rect.height>0))return false;
   const label=(el.getAttribute('aria-label')||el.textContent||'').trim();
   const title=el.getAttribute('title')||'';
   ${trigger.titlePrefix?`return title.startsWith(${JSON.stringify(trigger.titlePrefix)})||label.startsWith(${JSON.stringify(trigger.titlePrefix)});`:''}
   return label===${JSON.stringify(trigger.text||trigger.label||'')};
  });
  if(!match)return false;
  match.focus();match.setAttribute('data-qa-trigger','1');match.click();return true;
 })()`);
};
const escapeDialog=async()=>{
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await sleep(400);
 return evaluate(`!document.querySelector('section[role="dialog"]')&&document.activeElement?.dataset?.qaTrigger==='1'`);
};
const tabInside=async(count)=>{const inside=[];for(let index=0;index<count;index++){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await sleep(35);inside.push(await evaluate(`Boolean(document.querySelector('section[role="dialog"]')?.contains(document.activeElement))`));}return inside;};

// ── 1. Barrido por pantalla, ancho y tema ─────────────────────────────────
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE,path:'/'});
for(const screen of screens){
 for(const [width,height] of [[390,844],[768,1024]]){
  for(const theme of ['light','dark']){
   await setViewport(width,height,false);
   await send('Page.navigate',{url:BASE+screen.route});
   await waitFor(`document.querySelector(${JSON.stringify(screen.marker)})`,{timeout:60000,label:`${screen.name} ${theme} ${width}`});
   await setTheme(theme);await sleep(700);
   const audit=await evaluate(AUDIT_JS(screen.marker,width<768));
   check(`${screen.name} (${theme}, ${width}): sin scroll horizontal`,audit.overflow,0);
   if(width<768){
    check(`${screen.name} (${theme}, ${width}): targets ≥44`,audit.small.length,0);
    for(const item of audit.small.slice(0,8))note(`  ${screen.name} ${width}: ${item.h}px · ${item.tag} «${item.label}» · ${item.cls}`);
    const zoom=audit.inputs.filter(input=>['text','number','email','tel','date','time',''].includes(input.type)&&input.font<16);
    check(`${screen.name} (${theme}, ${width}): inputs sin zoom iOS (≥16px)`,zoom.length,0);
    for(const item of zoom.slice(0,6))note(`  input ${item.font}px · ${item.tag} ${item.type} · inputMode=${item.inputMode}`);
   }
   if(audit.rowMin!==null)check(`${screen.name} (${theme}, ${width}): filas 44–52`,audit.rowMin>=44&&audit.rowMax<=52,true);
   for(const table of audit.tables)if(table.scroll)check(`${screen.name} (${theme}, ${width}): tabla «${table.label||'sin etiqueta'}» con riel y etiqueta`,Boolean(table.label),true);
   if(audit.scrollers.length)note(`${screen.name} (${theme}, ${width}): rieles ${JSON.stringify(audit.scrollers.map(item=>`${item.sw}>${item.cw}${item.label?` «${item.label}»`:''}`))}`);
   if(theme==='dark'||width===390){
    const contrast=await evaluate(CONTRAST_JS);
    check(`${screen.name} (${theme}, ${width}): contraste texto AA`,contrast.failureCount,0);
    check(`${screen.name} (${theme}, ${width}): bordes 3:1`,contrast.uiFailureCount,0);
    for(const failure of contrast.failures.slice(0,5))note(`  contraste ${failure.ratio} «${failure.text}» ${failure.cls}`);
    for(const failure of contrast.uiFailures.slice(0,3))note(`  borde ${failure.ratio} ${failure.cls}`);
   }
   await capture(`${screen.slug}-${width}-${theme}`);
  }
 }
}

// ── 2. Modales: foco, viewport, scroll, Escape y targets ─────────────────
const MODALS=[
 {screen:screens[0],label:'Registrar cobro',slug:'cobro'},
 {screen:screens[0],label:'Factura',slug:'factura'},
 {screen:screens[0],label:'Cuenta',slug:'cuenta'},
 {screen:screens[0],label:'Transferir',slug:'transferir',form:true},
 {screen:screens[2],titlePrefix:'Editar salario',slug:'salario',form:true},
 {screen:screens[2],titlePrefix:'Ajuste del mes',slug:'ajuste',form:true},
 {screen:screens[4],label:'Comisión',slug:'comision'},
 {screen:screens[4],label:'Nuevo descuento',slug:'descuento',tab:'Descuentos'},
];
for(const [width,height,theme] of [[390,844,'dark'],[768,1024,'light']]){
 await setViewport(width,height,false);
 for(const modal of MODALS){
  await send('Page.navigate',{url:BASE+modal.screen.route});
  await waitFor(`document.querySelector(${JSON.stringify(modal.screen.marker)})`,{timeout:60000,label:`${modal.screen.name} modal ${modal.slug}`});
  await setTheme(theme);await sleep(600);
  if(modal.tab){
   const tabbed=await evaluate(`(()=>{const section=document.querySelector(${JSON.stringify(modal.screen.marker)});const button=[...section.querySelectorAll('button')].find(el=>(el.textContent||'').includes(${JSON.stringify(modal.tab)})&&el.getBoundingClientRect().height>0);if(!button)return false;button.click();return true;})()`);
   if(!tabbed){check(`«${modal.slug}» (${width}): pestaña ${modal.tab}`,false);continue;}
   await sleep(400);
  }
  const opened=await openDialog(modal.screen,modal);
  if(!opened){check(`«${modal.slug}» (${width}): disparador visible`,false);continue;}
  await waitFor(`document.querySelector('section[role="dialog"]')`,{timeout:10000,label:`diálogo ${modal.slug}`});
  await sleep(450);
  const dialog=await evaluate(DIALOG_JS);
  check(`«${modal.slug}» (${width}): foco inicial adentro`,dialog.focusInside,true);
  check(`«${modal.slug}» (${width}): dentro del viewport`,dialog.right<=width&&dialog.bottom<=height,true);
  check(`«${modal.slug}» (${width}): sin scroll horizontal`,await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`),0);
  const smallButtons=dialog.buttons.filter(button=>button.h<43.5);
  if(width===390)check(`«${modal.slug}» (${width}): botones ≥44`,smallButtons.length,0);
  for(const button of smallButtons.slice(0,4))note(`  botón ${button.h}px «${button.label}»`);
  if(width===390){
   const zoom=dialog.inputs.filter(input=>['text','number','email','tel','date','time',''].includes(input.type)&&input.font<16);
   check(`«${modal.slug}» (${width}): inputs sin zoom iOS (≥16px)`,zoom.length,0);
   for(const input of zoom.slice(0,4))note(`  input ${input.font}px · ${input.type} · inputMode=${input.inputMode}`);
  }
  const trapped=await tabInside(14);
  check(`«${modal.slug}» (${width}): foco atrapado (14 tabs)`,trapped.every(Boolean),true);
  if(dialog.bodyScrollable){const reach=await evaluate(`(()=>{const body=document.querySelector('section[role="dialog"] .dialog-body');body.scrollTop=body.scrollHeight;return body.scrollTop+body.clientHeight>=body.scrollHeight-2;})()`);check(`«${modal.slug}» (${width}): pie alcanzable`,reach,true);}
  await capture(`modal-${modal.slug}-${width}-${theme}`);
  check(`«${modal.slug}» (${width}): Escape cierra y devuelve el foco`,await escapeDialog(),true);
 }
}

// ── 3. Validación visible al enviar vacío (sin efectos) ──────────────────
const submitInDialog=async label=>{
 const clicked=await evaluate(`(()=>{const dialog=document.querySelector('section[role="dialog"]');[...dialog.querySelectorAll('input')].forEach(input=>{if(['hidden','checkbox','radio'].includes(input.type))return;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));});const button=[...dialog.querySelectorAll('button[type="submit"],button')].find(el=>(el.textContent||'').trim().includes(${JSON.stringify(label)})&&!el.disabled);if(!button)return false;button.click();return true;})()`);
 await sleep(500);
 const errors=await evaluate(`(()=>{const dialog=document.querySelector('section[role="dialog"]');if(!dialog)return {open:false,errors:0,text:''};const nodes=[...dialog.querySelectorAll('[role="alert"],small.error,.error,[aria-invalid="true"]')].filter(el=>el.getBoundingClientRect().height>0);return {open:true,errors:nodes.length,text:(nodes[0]?.textContent||'').trim().slice(0,80),debug:{title:(dialog.querySelector('h2')?.textContent||'').slice(0,40),buttons:[...dialog.querySelectorAll('button')].map(b=>(b.textContent||'').trim().slice(0,24)),invalid:[...dialog.querySelectorAll('[aria-invalid="true"]')].length}};})()`);
 return {clicked,...errors};
};
const validationCases=[
 {modal:{screen:screens[0],label:'Registrar cobro'},label:'Registrar cobro',slug:'cobro'},
 {modal:{screen:screens[0],label:'Transferir'},label:'Registrar transferencia',slug:'transferir'},
 {modal:{screen:screens[2],titlePrefix:'Editar salario'},label:'Guardar salario',slug:'salario'},
];
await setViewport(390,844,false);
for(const test of validationCases){
 await send('Page.navigate',{url:BASE+test.modal.screen.route});
 await waitFor(`document.querySelector(${JSON.stringify(test.modal.screen.marker)})`,{timeout:60000,label:`validación ${test.slug}`});
 await setTheme('dark');await sleep(600);
 if(!await openDialog(test.modal.screen,test.modal)){check(`validación «${test.slug}»: disparador`,false);continue;}
 await waitFor(`document.querySelector('section[role="dialog"]')`,{timeout:10000,label:`validación ${test.slug}`});
 await sleep(400);
 const result=await submitInDialog(test.label);
 check(`validación «${test.slug}»: el envío vacío muestra error visible`,result.errors>0,true);
 check(`validación «${test.slug}»: el diálogo sigue abierto`,result.open,true);
 note(`validación «${test.slug}»: ${result.text||'(sin texto)'} · ${JSON.stringify(result.debug||{})}`);
 await capture(`validacion-${test.slug}`);
 await escapeDialog();
}

// ── 4. Estados vacíos reales (intercepción de red) ───────────────────────
await send('Fetch.enable',{patterns:[{urlPattern:'*/api/agency/*',requestStage:'Request'}]});
const emptyCases=[
 {screen:screens[0],route:'/pagos',pattern:'/api/agency/transfers',body:{transfers:[]},text:'Aún no hay transferencias entre cuentas',slug:'vacio-transferencias',theme:'dark'},
 {screen:screens[0],route:'/pagos',pattern:'/api/agency/accounts',body:{accounts:[]},text:'Todavía no hay cuentas registradas',slug:'vacio-cuentas',theme:'light'},
 {screen:screens[4],route:'/equipo/comisiones',pattern:'/api/agency/commissions/monthly',body:{month:'2026-10',records:[]},text:'Sin comisiones ni acuerdos comerciales para este mes',slug:'vacio-comisiones',theme:'dark',extra:[['/api/agency/commissions',{commissions:[]}],['/api/agency/referral-discounts',{discounts:[]}],['/api/agency/payouts',{payouts:[]}]]},
 {screen:screens[1],route:'/pagos/mora',pattern:'/api/agency/client-payment-status',body:{clients:[]},text:'Sin registros de cobranza todavía',slug:'vacio-mora',theme:'light'},
];
await setViewport(390,844,false);
for(const test of emptyCases){
 stubs.clear();stubs.set(test.pattern,test.body);
 for(const [pattern,body] of test.extra||[])stubs.set(pattern,body);
 await send('Page.navigate',{url:BASE+test.route});
 await waitFor(`document.querySelector(${JSON.stringify(test.screen.marker)})`,{timeout:60000,label:`vacío ${test.slug}`});
 await setTheme(test.theme);await sleep(900);
 const hasText=await evaluate(`document.body.textContent.includes(${JSON.stringify(test.text)})`);
 check(`vacío «${test.slug}»: estado vacío real`,hasText,true);
 check(`vacío «${test.slug}»: sin scroll horizontal`,await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`),0);
 await capture(test.slug);
}
stubs.clear();
await send('Fetch.disable').catch(()=>undefined);

// ── 5. Enmascarado intacto: la UI con la respuesta enmascarada del API ───
// El API ya entrega `base_amount/override_amount` en null sin `salary.view`
// (cubierto por los tests del API); acá se verifica que la pantalla real no
// dibuje montos ni acciones cuando la respuesta viene enmascarada.
const apiInPage=(method,path,body)=>evaluate(`fetch('/core-api${path}',{method:${JSON.stringify(method)},credentials:'include',headers:{'content-type':'application/json'},body:${body===undefined?'undefined':JSON.stringify(JSON.stringify(body))}}).then(async response=>({status:response.status,data:await response.json().catch(()=>null)}))`);
const forecastReal=await apiInPage('GET','/api/agency/forecast?month=2026-10&months=3');
const maskedForecast=JSON.parse(JSON.stringify(forecastReal.data||{}));
for(const record of maskedForecast?.personnel?.records||[])for(const member of record.members||[]){member.base_amount=null;member.override_amount=null;}
stubs.clear();stubs.set('/api/agency/forecast',maskedForecast);
await send('Fetch.enable',{patterns:[{urlPattern:'*/api/agency/forecast*',requestStage:'Request'}]});
await setViewport(390,844,false);
await send('Page.navigate',{url:BASE+'/pagos/prevision'});
await waitFor(`document.querySelector('section[aria-label="Previsión financiera"]')`,{timeout:60000,label:'Previsión enmascarada'});
await setTheme('dark');await sleep(1000);
const masked=await evaluate(`(()=>{const section=document.querySelector('section[aria-label="Previsión financiera"]');return {sinDato:(section.textContent.match(/Sin dato/g)||[]).length,editar:section.querySelectorAll('button[title^="Editar salario"]').length};})()`);
check('enmascarado: la UI muestra «Sin dato» con la respuesta del API',masked.sinDato>0,true);
check('enmascarado: sin acciones de edición de salario',masked.editar,0);
await capture('enmascarado-prevision-390-finance');
stubs.clear();
await send('Fetch.disable').catch(()=>undefined);

writeFileSync(resolve(OUT,`qa-${LABEL}.txt`),`${log.join('\n')}\n`);
writeFileSync(resolve(OUT,`qa-${LABEL}.json`),`${JSON.stringify({label:LABEL,base:BASE,failures:process.exitCode?1:0,log},null,1)}\n`);
console.log(log.join('\n'));
console.log(`\nEvidencia en ${OUT} · ${log.filter(line=>line.startsWith('✗')).length} fallos`);
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(process.exitCode||0);
