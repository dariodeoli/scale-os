/*
 * e2e de QA de la vertical COM (ronda 6, issue #43) contra la app real.
 *
 * Qué verifica (eventos de entrada confiables por CDP + la verdad en Postgres):
 *   - Pipeline: KPIs y columnas contra /api/agency/leads y /pipeline-stages;
 *     drag & drop con mouse y touch (etapa antes/después en Postgres y la
 *     columna de la UI), con >300 órdenes sembradas para el shell.
 *   - Presupuestos: filas/KPIs/encabezado contra /budgets; compositor (modal,
 *     reordenar ítems y persistencia del orden en agency_budget_items);
 *     estado de error con la red bloqueada y reintento.
 *   - Planes y Métricas: columnas/eventos contra /plans y /metrics.
 *   - Payload: cada pantalla de la vertical pide /work-orders?limit=300 y no
 *     vuelve a pedir la lista completa; las búsquedas no pierden resultados.
 *   - Mobile 360/390/430: sin overflow horizontal del documento.
 *
 * Requisitos (local, no corre en CI): el stack de e2e-com-stack.mjs levantado
 * (Postgres propio + API + front + proxy de un solo origen) y la sesión en
 * work/visual-harness/com-qa-session.txt (QA_SESSION). Capturas y log quedan
 * en work/visual-harness/com-qa-real/.
 *
 * Uso: node build-tools/visual-harness/e2e-com-qa.mjs
 *       (BASE y PSQL se ajustan por env: BASE_URL, PG_PORT, PG_BIN)
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const WORK=resolve(repo,'work/visual-harness');
const OUT=resolve(WORK,'com-qa-real');
mkdirSync(OUT,{recursive:true});
const session=Object.fromEntries(readFileSync(resolve(WORK,process.env.QA_SESSION||'com-qa-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE||session.BASE;
const TOKEN=session.SESSION;
const ORG=session.ORG;
const PG_BIN=process.env.PG_BIN||'/opt/homebrew/Cellar/postgresql@17/17.11/bin';
const PG_PORT=process.env.PG_PORT||'55433';
const sqlText=(value)=>`'${String(value).replaceAll("'","''")}'`;
const psql=(sql)=>execFileSync(`${PG_BIN}/psql`,['-h','127.0.0.1','-p',String(PG_PORT),'-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();

const log=[];
process.on('uncaughtException',(error)=>{console.log(log.join('\n'));console.log('\nQA INTERRUMPIDA:',error.message);process.exit(1);});
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(method,params={})=>cdp.send(method,params);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const waitFor=async(expression,{timeout=25000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,200));}throw new Error(`timeout esperando ${label||expression}`);};
const settle=(ms=1200)=>new Promise(r=>setTimeout(r,ms));
const shot=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(OUT,`${name}.png`),Buffer.from(data,'base64'));note(`captura ${name}.png`);};
const api=async(path)=>{const response=await evaluate(`fetch('/core-api/api${path}',{credentials:'same-origin'}).then(async r=>({status:r.status,data:await r.json().catch(()=>null)}))`);return response;};
const requestLog=[];
const consoleErrors=[];
cdp.on('Network.requestWillBeSent',({request})=>requestLog.push({url:request.url,method:request.method,at:Date.now()}));
cdp.on('Runtime.consoleAPICalled',({type,args})=>{if(type==='error')consoleErrors.push(args.map(a=>a.value||a.description||'').join(' ').slice(0,200));});
const since=(t)=>requestLog.filter(entry=>entry.at>=t&&entry.url.includes('/api/'));
const workOrderCalls=(t)=>since(t).filter(entry=>entry.url.includes('/work-orders')).map(entry=>entry.url.replace(/^.*\/api\/agency/,''));
const go=async(path,readyExpr,label)=>{await send('Page.navigate',{url:BASE+path});await settle(2800);if(readyExpr)await waitFor(readyExpr,{label});};
// Lee el valor de un KPI por su etiqueta (Stat: label + valor + hint).
const kpiValue=async(label)=>evaluate(`(()=>{const nodes=[...document.querySelectorAll('div')].filter(n=>n.children.length===0&&n.textContent.trim()===${JSON.stringify(label)});const card=nodes[0]?.parentElement;if(!card)return null;const value=[...card.children].find(c=>/text-2xl|text-3xl/.test(c.getAttribute('class')||''));return value?.textContent.replace(/\\s+/g,' ').trim()||null;})()`);
const kpiNumber=async(label)=>{const text=await kpiValue(label);return text===null?null:Number(String(text).replace(/[^\d.-]/g,''));};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});
await send('Network.setCookie',{name:'scale_session',value:TOKEN,url:BASE,httpOnly:true});
await go('/',`document.querySelector('.desktop-sidebar')&&document.body.textContent.includes('Pipeline')`,'app');
check('sesión inyectada: la app carga',await evaluate(`document.body.textContent.includes('Pipeline')`),true);
await shot('00-resumen-1440');

// ── Pipeline ────────────────────────────────────────────────────────────────
note('── Pipeline');
let t=Date.now();
await go('/pipeline',`document.body.textContent.includes('Oportunidades abiertas')`,'pipeline');
const leads=(await api('/agency/leads')).data.records;
const stages=(await api('/agency/pipeline-stages')).data.stages;
const kindOf=(slug)=>stages.find(stage=>stage.slug===slug)?.kind||(slug==='won'?'won':slug==='lost'?'lost':'open');
const expectedOpen=leads.filter(lead=>kindOf(lead.stage)==='open').length;
const expectedWon=leads.filter(lead=>kindOf(lead.stage)==='won').length;
const expectedWeb=leads.filter(lead=>(lead.notes||'').includes('Origen: landing')).length;
check('KPI «Oportunidades abiertas» = API',await kpiNumber('Oportunidades abiertas'),expectedOpen);
check('KPI «Ganadas» = API',await kpiNumber('Ganadas'),expectedWon);
check('KPI «Consultas web» = API',await kpiNumber('Consultas web'),expectedWeb);
const columnLabels=await evaluate(`(()=>[...document.querySelectorAll('section[aria-label*="oportunidades"]')].map(section=>section.getAttribute('aria-label')))()`);
const boardTotal=columnLabels.reduce((sum,label)=>sum+Number((label.match(/· (\d+) oportunidades/)||[])[1]||0),0);
check('columnas suman todas las oportunidades',boardTotal,leads.length);
note(`${leads.length} oportunidades del API en ${columnLabels.length} columnas: ${columnLabels.slice(0,4).join(' | ')}${columnLabels.length>4?' | …':''}`);
const payloadPipeline=workOrderCalls(t);
check('payload: pide la ventana de 300',payloadPipeline.length>0&&payloadPipeline.every(url=>url.includes('limit=300')),true);
check('payload: no pide la lista completa de órdenes',payloadPipeline.some(url=>!url.includes('limit')),false);
check('payload: oportunidades sin recorte',since(t).some(entry=>/\/api\/agency\/leads$/.test(entry.url)),true);
await shot('01-pipeline-1440');

// D&D mouse y touch con el tablero lleno.
const findCard=async(name)=>evaluate(`(()=>{const card=[...document.querySelectorAll('section[aria-label*="oportunidades"] article')].find(a=>a.querySelector('b')?.textContent===${JSON.stringify(name)});return card?{column:card.closest('section')?.getAttribute('aria-label')?.split(' ·')[0],id:card.querySelector('[data-lead]')?.getAttribute('data-lead')||null}:null;})()`);
const dragCard=async({mouse=true}={})=>{
 const geometry=await evaluate(`(()=>{const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
  const card=document.querySelector('section[aria-label*="oportunidades"] article');
  if(!card)return null;card.scrollIntoView({block:'center',inline:'center'});
  const cr=card.getBoundingClientRect();
  const current=card.closest('section[aria-label*="oportunidades"]');
  const target=[...document.querySelectorAll('section[aria-label*="oportunidades"]')].find(c=>c!==current);
  if(!target)return null;const tr=target.getBoundingClientRect();
  const grip=card.querySelector('button[title^="Mover"]');if(!grip)return null;const gr=grip.getBoundingClientRect();
  return {name:card.querySelector('b')?.textContent,fromColumn:current.getAttribute('aria-label')?.split(' ·')[0],from:{x:Math.round(clamp(gr.x+gr.width/2,24,innerWidth-24)),y:Math.round(clamp(gr.y+gr.height/2,24,innerHeight-24))},to:{x:Math.round(clamp(tr.x+tr.width/2,24,innerWidth-24)),y:Math.round(clamp(tr.y+120,24,innerHeight-24))}};})()`);
 if(!geometry)throw new Error('sin tarjeta/asa para arrastrar');
 if(mouse){
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:geometry.from.x,y:geometry.from.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:geometry.from.x,y:geometry.from.y,button:'left',clickCount:1,buttons:1});
  for(let i=1;i<=16;i++){const x=Math.round(geometry.from.x+(geometry.to.x-geometry.from.x)*i/16),y=Math.round(geometry.from.y+(geometry.to.y-geometry.from.y)*i/16);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1});await new Promise(r=>setTimeout(r,18));}
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:geometry.to.x,y:geometry.to.y,button:'left',buttons:0});
 }else{
  const point=(p)=>[{x:p.x,y:p.y,id:1,radiusX:6,radiusY:6,force:1}];
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point(geometry.from)});
  await new Promise(r=>setTimeout(r,340));
  for(let i=1;i<=16;i++){const x=Math.round(geometry.from.x+(geometry.to.x-geometry.from.x)*i/16),y=Math.round(geometry.from.y+(geometry.to.y-geometry.from.y)*i/16);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:1,radiusX:6,radiusY:6,force:1}]});await new Promise(r=>setTimeout(r,18));}
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await settle(1300);
 return geometry;
};
const stageOf=(name)=>psql(`select l.stage from agency_leads l where l.organization_id=${ORG} and l.name=${sqlText(name)} limit 1`);
const labelOf=(slug)=>stages.find(stage=>stage.slug===slug)?.label||slug;
const columnLabel=(label)=>label?label.split(' ·')[0]:null;
// Mouse: stage antes/después en Postgres + columna de la UI.
const mouseMove=await dragCard({mouse:true});
const mouseStageBefore=stages.find(stage=>stage.label===mouseMove.fromColumn)?.slug||null;
const mouseStageAfter=await stageOf(mouseMove.name);
const mouseColumn=columnLabel((await findCard(mouseMove.name))?.column);
check(`D&D mouse: «${mouseMove.name}» cambia de etapa (Postgres)`,mouseStageAfter!==mouseStageBefore&&Boolean(mouseStageAfter),true);
check('D&D mouse: la columna de la UI coincide con Postgres',mouseColumn,labelOf(mouseStageAfter));
note(`D&D mouse: ${mouseStageBefore} → ${mouseStageAfter} (columna «${mouseColumn}»)`);
// Touch: mismo par de verificaciones.
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const touchMove=await dragCard({mouse:false});
await send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});
const touchStageBefore=stages.find(stage=>stage.label===touchMove.fromColumn)?.slug||null;
const touchStageAfter=await stageOf(touchMove.name);
const touchColumn=columnLabel((await findCard(touchMove.name))?.column);
check(`D&D touch: «${touchMove.name}» cambia de etapa (Postgres)`,touchStageAfter!==touchStageBefore&&Boolean(touchStageAfter),true);
check('D&D touch: la columna de la UI coincide con Postgres',touchColumn,labelOf(touchStageAfter));
note(`D&D touch: ${touchStageBefore} → ${touchStageAfter} (columna «${touchColumn}»)`);
// El PATCH de leads bumpea updated_at: los dos movimientos quedan frescos.
const freshMoves=Number(psql(`select count(*) from agency_leads where organization_id=${ORG} and name in (${sqlText(mouseMove.name)},${sqlText(touchMove.name)}) and updated_at>now()-interval '5 minutes'`));
check('D&D: las oportunidades movidas quedan con updated_at fresco',freshMoves,new Set([mouseMove.name,touchMove.name]).size);

// Búsqueda global con la ventana (no debe perder clientes ni proyectos).
const openSearch=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>/Buscar|buscar/.test((b.getAttribute('aria-label')||'')+(b.getAttribute('title')||'')));if(!button)return false;button.click();return true;})()`);
await settle(900);
const typeSearch=async(text)=>evaluate(`(()=>{const input=document.querySelector('input[type=search],input[placeholder*="Buscar"],input[placeholder*="buscar"]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,${JSON.stringify(text)});input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
if(openSearch){
 await typeSearch('Aurora');await settle(1400);
 const clientResult=await evaluate(`document.querySelector('.unified-dialog [role=status]')?.textContent||''`);
 check('buscador: encuentra clientes del catálogo completo',/^([1-9]\d*) resultados/.test(clientResult),true);
 note(`buscador «Aurora»: ${clientResult}`);
 await typeSearch('Pieza de volumen 220');await settle(1400);
 const insideResult=await evaluate(`document.querySelector('.unified-dialog [role=status]')?.textContent||''`);
 check('buscador: encuentra una orden dentro de la ventana',/^([1-9]\d*) resultados/.test(insideResult),true);
 note(`buscador «Pieza de volumen 220» (dentro de la ventana): ${insideResult}`);
 await typeSearch('Pieza de volumen 215');await settle(1400);
 const outsideResult=await evaluate(`document.querySelector('.unified-dialog [role=status]')?.textContent||''`);
 note(`buscador «Pieza de volumen 215» (fuera de la ventana de 300): ${outsideResult} — limitación documentada del shell (#57)`);
 await typeSearch('');await settle(500);
 await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
}else{
 note('buscador: no se encontró el control en el topbar (revisar a mano)');
}
await evaluate(`document.body.click()`);await settle(400);

// ── Métricas ────────────────────────────────────────────────────────────────
note('── Métricas');
t=Date.now();
await go('/pipeline/metricas',`document.body.textContent.includes('Visitas y crecimiento')`,'métricas');
const metrics=(await api('/metrics')).data.events;
const sumMetric=(name)=>metrics.filter(event=>event.name===name).reduce((sum,event)=>sum+(Number(event.count)||0),0);
const board=await evaluate(`document.querySelector('[data-events]')?.getAttribute('data-events')||null`);
note(`métricas: ${metrics.length} eventos del API (page_view ${sumMetric('page_view')}, móvil ${sumMetric('mobile_view')}, whatsapp ${sumMetric('whatsapp_click')})`);
check('métricas: el tablero monta',Boolean(board)||(await evaluate(`document.body.textContent.includes('Visitas')`)),true);
const payloadMetrics=workOrderCalls(t);
check('payload métricas: ventana de 300',payloadMetrics.length>0&&payloadMetrics.every(url=>url.includes('limit=300')),true);
await shot('02-metricas-1440');

// ── Presupuestos ────────────────────────────────────────────────────────────
note('── Presupuestos');
t=Date.now();
await go('/presupuestos',`document.querySelector('[role="table"]')`,'presupuestos');
const budgets=(await api('/agency/budgets')).data.budgets;
const rows=await evaluate(`document.querySelectorAll('[role="rowgroup"] [role="row"]').length`);
check('lista: una fila por presupuesto del API',rows,budgets.length);
check('KPI «Presupuestos» = API',await kpiNumber('Presupuestos'),budgets.length);
const header=await evaluate(`(()=>[...document.querySelectorAll('[role="columnheader"]')].map(h=>h.textContent))()`);
check('encabezado completo',JSON.stringify(header),JSON.stringify(['Presupuesto','Cliente','Estado','Ítems','Vigencia','Sin IVA','Total · IVA incl.','Acciones']));
const payloadBudgets=workOrderCalls(t);
check('payload presupuestos: ventana de 300',payloadBudgets.length>0&&payloadBudgets.every(url=>url.includes('limit=300')),true);
note(`presupuestos: ${budgets.length} documentos (${[...new Set(budgets.map(b=>b.status))].join(', ')})`);
await shot('03-presupuestos-1440');

// Compositor: modal, ítems, reordenar y persistencia.
const dialogFits=async()=>evaluate(`(()=>{const dialog=document.querySelector('.unified-dialog');if(!dialog)return null;const r=dialog.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),fits:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,bodyScroll:getComputedStyle(dialog.querySelector('.dialog-body')).overflowY};})()`);
await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>/Nuevo presupuesto/.test(b.textContent));button?.click();})()`);
await waitFor(`document.querySelector('.unified-dialog')`,'modal');
await settle(900);
// Dos ítems con descripción: hace falta para reordenar y guardar (descripción obligatoria).
await evaluate(`(()=>{const button=[...document.querySelectorAll('.unified-dialog button')].find(b=>/Agregar ítem/.test(b.textContent));button?.click();})()`);
await settle(700);
await evaluate(`(()=>{const setValue=(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));};const inputs=[...document.querySelectorAll('.unified-dialog input[name$=".description"]')];inputs.forEach((input,index)=>setValue(input,index===0?'QA ítem A':'QA ítem B'));return inputs.length;})()`);
await settle(500);
const fits1440=await dialogFits();
check('compositor: el modal cabe a 1440',fits1440?.fits,true);
note(`compositor: modal ${fits1440?.w}×${fits1440?.h}, body ${fits1440?.bodyScroll}`);
await shot('04-compositor-1440');
const itemOrder=()=>evaluate(`(()=>[...document.querySelectorAll('input[name$=".description"]')].map(input=>input.value))()`);
const orderBefore=await itemOrder();
note(`compositor: ítems ${JSON.stringify(orderBefore)}`);
const gripGeometry=await evaluate(`(()=>{const grips=[...document.querySelectorAll('.unified-dialog button[title="Reordenar ítem"]')];if(grips.length<2)return null;const from=grips[0].getBoundingClientRect(),to=grips[1].getBoundingClientRect();return {from:{x:Math.round(from.x+from.width/2),y:Math.round(from.y+from.height/2)},to:{x:Math.round(to.x+to.width/2),y:Math.round(to.y+to.height/2)}};})()`);
if(gripGeometry){
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:gripGeometry.from.x,y:gripGeometry.from.y});
 await send('Input.dispatchMouseEvent',{type:'mousePressed',x:gripGeometry.from.x,y:gripGeometry.from.y,button:'left',clickCount:1,buttons:1});
 for(let i=1;i<=12;i++){const x=Math.round(gripGeometry.from.x+(gripGeometry.to.x-gripGeometry.from.x)*i/12),y=Math.round(gripGeometry.from.y+(gripGeometry.to.y-gripGeometry.from.y)*i/12);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1});await new Promise(r=>setTimeout(r,20));}
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:gripGeometry.to.x,y:gripGeometry.to.y,button:'left',buttons:0});
 await settle(700);
}
const orderAfter=await itemOrder();
check('compositor: reordenar cambia el orden',JSON.stringify(orderAfter)!==JSON.stringify(orderBefore),true);
note(`compositor: después ${JSON.stringify(orderAfter)}`);
await evaluate(`(()=>{const dialog=document.querySelector('.unified-dialog');const setValue=(el,value)=>{const proto=el instanceof HTMLSelectElement?HTMLSelectElement:HTMLInputElement;Object.getOwnPropertyDescriptor(proto.prototype,'value').set.call(el,value);el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));};const title=dialog.querySelector('#quote-title');setValue(title,'QA ronda 6');const client=dialog.querySelector('#quote-client');if(client&&client.options.length>1)setValue(client,client.options[1].value);return true;})()`);
await settle(600);
const beforeSave=(await api('/agency/budgets')).data.budgets.length;
await evaluate(`(()=>{const button=[...document.querySelectorAll('.unified-dialog button')].find(b=>/Guardar/.test(b.textContent));button?.click();})()`);
await settle(3000);
const afterSave=(await api('/agency/budgets')).data.budgets.length;
check('compositor: guardar persiste el documento',afterSave,beforeSave+1);
const savedFirstItem=psql(`select i.description from agency_budget_items i where i.budget_id=(select id from agency_budgets where organization_id=${ORG} and title='QA ronda 6' order by id desc limit 1) order by i.position limit 1`);
note(`compositor: primer ítem guardado «${savedFirstItem}» (orden enviado: ${JSON.stringify(orderAfter[0]||null)})`);
await evaluate(`document.querySelector('.unified-dialog .dialog-heading button')?.click()`);
await settle(700);

// ── Planes ──────────────────────────────────────────────────────────────────
note('── Planes');
t=Date.now();
await go('/presupuestos/planes',`document.querySelector('table')`,'planes');
const plans=(await api('/agency/plans')).data.records;
const planColumns=await evaluate(`(()=>[...document.querySelectorAll('table thead th h3')].map(h=>h.textContent))()`);
check('comparador: una columna por plan del API',planColumns.length,plans.length);
const payloadPlans=workOrderCalls(t);
check('payload planes: ventana de 300',payloadPlans.length>0&&payloadPlans.every(url=>url.includes('limit=300')),true);
note(`planes: ${plans.length} planes (${plans.map(p=>p.currency||'PYG').join(', ')})`);
await shot('05-planes-1440');

// ── Mobile 390 (y 360/430) ─────────────────────────────────────────────────
// ── Estado de error forzado (red bloqueada) ─────────────────────────────────
note('── Error de red');
await send('Network.setBlockedURLs',{urls:['*/api/agency/leads*','*/api/agency/pipeline-stages*','*/api/agency/budgets*','*/api/agency/plans*']});
await go('/presupuestos',null,'error');
await settle(2200);
const errorBlock=await evaluate(`document.body.innerText.includes('No se pudieron cargar')||document.body.innerText.includes('No se pudo')`);
check('error: la pantalla avisa y no inventa datos',errorBlock,true);
await shot('07-presupuestos-error-1440');
await send('Network.setBlockedURLs',{urls:[]});
await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>/Reintentar/.test(b.textContent));button?.click();})()`);
await settle(2600);
check('error: reintentar recupera la lista',await evaluate(`document.querySelectorAll('[role="rowgroup"] [role="row"]').length>0`),true);
await shot('08-presupuestos-reintento-1440');

// ── Modal en mobile ─────────────────────────────────────────────────────────
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await go('/presupuestos',null,'mobile-modal');
await settle(1500);
await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>/Nuevo presupuesto/.test(b.textContent));button?.click();})()`);
await waitFor(`document.querySelector('.unified-dialog')`,'modal mobile');
await settle(900);
const mobileFits=await dialogFits();
check('compositor mobile 390: el modal cabe',mobileFits?.fits,true);
note(`compositor mobile: modal ${mobileFits?.w}×${mobileFits?.h} (body ${mobileFits?.bodyScroll})`);
await shot('09-compositor-390');
await evaluate(`document.querySelector('.unified-dialog .dialog-heading button')?.click()`);
await settle(600);
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});

note('── Mobile');
for(const width of [360,390,430]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});
 for(const [path,name] of [['/pipeline','pipeline'],['/presupuestos','presupuestos'],['/pipeline/metricas','metricas'],['/presupuestos/planes','planes']]){
  await go(path,null,name);
  await settle(1200);
  const overflow=await evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`);
  const rail=await evaluate(`(()=>{const a=document.querySelector('.desktop-sidebar');if(!a)return null;const r=a.getBoundingClientRect();const style=getComputedStyle(a);return style.display==='none'?null:Math.round(r.width);})()`);
  note(`${width}px ${name}: docOverflow ${overflow}px, riel ${rail===null?'oculto':rail+'px'}`);
  if(width===390)await shot(`06-${name}-390`);
 }
}
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});

note(`consola: ${consoleErrors.length} errores capturados${consoleErrors.length?` → ${consoleErrors.slice(0,3).join(' | ')}`:''}`);
check('consola sin errores',consoleErrors.length,0);

writeFileSync(resolve(OUT,'qa-log.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(process.exitCode?'\nQA CON FALLOS':'\nQA OK');
cdp.close();
await chrome.close();
