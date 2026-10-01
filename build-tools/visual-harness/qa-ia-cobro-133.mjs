/*
 * Evidencia de parcial/seña, división en partes y método visible (#133) contra
 * el stack local FIN, con el motor de IA interceptado (config + análisis).
 *
 * Requiere `e2e-fin-stack.mjs` corriendo (sesión en
 * work/visual-harness/fin-qa-session.txt) y el build de Next.
 * Uso: node build-tools/visual-harness/qa-ia-cobro-133.mjs
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const session=Object.fromEntries(readFileSync(resolve(here,'../../work/visual-harness/fin-qa-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const OUT=resolve(here,'../../docs/qa/qa-ia-cobro-133');
mkdirSync(OUT,{recursive:true});

const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const call=async(method,path,body)=>{
 const response=await fetch(`${BASE}/core-api${path}`,{method,headers:{'content-type':'application/json',cookie:`scale_session=${session.SESSION}`,origin:BASE},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json().catch(()=>null)};
};
const pagosDelCliente=async clientId=>((await call('GET','/api/agency/payments?limit=all')).data?.payments||[]).filter(pago=>String(pago.client_id)===String(clientId));

// ── 1. Datos reales del stack: cuentas con método, cliente y dos facturas ──
const cuentas=(await call('GET','/api/agency/accounts')).data?.accounts||[];
const pyg=cuentas.filter(cuenta=>cuenta.currency==='PYG'&&cuenta.active!==false);
if(pyg.length<2)throw new Error('La evidencia necesita dos cuentas PYG activas');
const banco=pyg.find(cuenta=>cuenta.account_number)||pyg[0];
const caja=pyg.find(cuenta=>cuenta.id!==banco.id);
const cliente=await call('POST','/api/agency/clients',{name:'Cliente IA #133'});
if(cliente.status!==201)throw new Error(`no se pudo crear el cliente: ${JSON.stringify(cliente.data)}`);
const clientId=cliente.data.client.id;
const facturaVencida=await call('POST','/api/agency/invoices',{clientId,total:'300000',currency:'PYG',dueOn:'2026-08-01',notes:'Factura de la evidencia #133'});
const facturaVigente=await call('POST','/api/agency/invoices',{clientId,total:'500000',currency:'PYG',dueOn:'2026-09-15',notes:'Factura de la evidencia #133'});
if(facturaVencida.status!==201||facturaVigente.status!==201)throw new Error('no se pudieron crear las facturas');
console.log(`cliente ${clientId} · cuentas ${banco.name} / ${caja.name}`);

// ── 2. Intercepción del motor de IA y del listado de cuentas ──────────────
let actionAmount=200000;
let actionDetalle='Seña';
let sinCuentas=false;
const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
cdp.on('Fetch.requestPaused',async event=>{
 const url=event.request.url;
 try{
  if(url.includes('/api/ia/carga')){
   console.log(`stub IA ${event.request.method} ${url.split('/api/ia')[1]}`);
   if(event.request.method==='GET'){
    await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/json'}],body:Buffer.from(JSON.stringify({configurada:true,modelo:'qa-133',tipos:['clientes']})).toString('base64')});
   }else{
    const analisis={registros:{clientes:[],equipos:[],avisos:[]},acciones:[{tipo:'registrar_cobro',cliente:{id:String(clientId),nombre:'Cliente IA #133'},monto:actionAmount,fecha:today,detalle:actionDetalle,avisos:[]}],avisos:[]};
    await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/json'}],body:Buffer.from(JSON.stringify(analisis)).toString('base64')});
   }
   return;
  }
  if(sinCuentas&&url.includes('/api/agency/accounts')){
   await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/json'}],body:Buffer.from(JSON.stringify({accounts:[]})).toString('base64')});
   return;
  }
 }catch{/* si falla la intercepción se continúa con la red real */}
 await send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>undefined);
});
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async name=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82});writeFileSync(resolve(OUT,`${name}.jpg`),Buffer.from(data,'base64'));console.log(name);};
const setTheme=theme=>evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
const clickByText=(scope,text)=>evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(scope)});const button=[...root.querySelectorAll('button')].find(el=>(el.textContent||'').trim()===${JSON.stringify(text)}&&el.getBoundingClientRect().height>0&&!el.disabled);if(!button)return false;button.click();return true;})()`);
const setInput=(selector,value)=>evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
const pickSelect=async(scope,needle,index=0)=>{
 const opened=await evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(scope)});const triggers=[...root.querySelectorAll('.ops-select-trigger')].filter(trigger=>trigger.getBoundingClientRect().height>0);const trigger=triggers[${index}];if(!trigger)return false;trigger.click();return true;})()`);
 if(!opened)return false;
 await sleep(350);
 return evaluate(`(()=>{const option=[...document.querySelectorAll('[role="option"]')].find(el=>(el.textContent||'').includes(${JSON.stringify(needle)}));if(!option)return false;option.click();return true;})()`);
};
const abrirDialogo=async()=>{
 await send('Page.navigate',{url:BASE+'/pagos'});
 await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{label:'Finanzas'});
 await sleep(700);
 await evaluate(`document.querySelector('button[aria-label="Carga con IA"]')?.click()`);
 await waitFor(`document.querySelector('section[role="dialog"]')`,{label:'diálogo IA'});
 await sleep(400);
};
const analizar=async()=>{
 await evaluate(`(()=>{const area=document.querySelector('section[role="dialog"] textarea');if(!area)return false;const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(area,'Cliente IA #133 me pagó y dejó seña');area.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
 await sleep(200);
 if(!await clickByText('section[role="dialog"]','Analizar con IA'))throw new Error('no se pudo analizar');
 try{
  await waitFor(`[...document.querySelectorAll('section[role="dialog"] article')].some(article=>article.textContent.includes('Registrar cobro'))`,{timeout:15000,label:'tarjeta de acción'});
 }catch(error){
  const texto=await evaluate(`document.querySelector('section[role="dialog"]')?.textContent.slice(0,500)||''`);
  throw new Error(`${error.message} · diálogo: ${texto}`);
 }
 await sleep(500);
};
const CARD='section[role="dialog"] article';
const evidencia={fecha:new Date().toISOString(),base:BASE,clienteId:String(clientId),cuentas:{banco:{id:String(banco.id),metodo:`${banco.institution||banco.name} · ${banco.account_number||''}`.trim()},caja:{id:String(caja.id),metodo:`${caja.institution||caja.name} · ${caja.account_number||''}`.trim()}},casos:[]};

await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE,path:'/'});
await send('Fetch.enable',{patterns:[{urlPattern:'*/api/ia/carga*',requestStage:'Request'},{urlPattern:'*/api/agency/accounts*',requestStage:'Request'}]});
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

// ── 3. Parcial/seña: monto menor al saldo, método visible y estado parcial ─
await abrirDialogo();
await analizar();
await setInput(`${CARD} input[id$="-monto"]`,'200000');
const metodoElegido=await pickSelect(CARD,'310056630007');
await sleep(400);
const metodoVisible=await evaluate(`document.body.textContent.includes('Método: ${(banco.institution||banco.name).replace(/'/g,"\\'")}')`);
if(!await clickByText(CARD,'Confirmar acción'))throw new Error('no se pudo confirmar la seña');
await waitFor(`document.body.textContent.includes('Pago parcial')`,{label:'mensaje parcial'});
const parcialUI=await evaluate(`(()=>{const card=document.querySelector(${JSON.stringify(CARD)});return {estado:card?.dataset?.estado,chip:[...card.querySelectorAll('*')].some(el=>el.children.length===0&&el.textContent==='Parcial'),mensaje:(card.textContent.match(/Pago parcial:[\\s\\S]*?pendientes/)||[''])[0]};})()`);
const pagosSeña=await pagosDelCliente(clientId);
evidencia.casos.push({caso:'parcial/seña',metodoElegido,metodoVisible,ui:parcialUI,pagos:pagosSeña.map(pago=>({id:String(pago.id),monto:Number(pago.amount),factura:pago.invoice_number,cuenta:String(pago.account_id),referencia:pago.reference}))});
await capture('parcial-1440-light');
await setTheme('dark');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
await sleep(600);
await capture('parcial-390-dark');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await setTheme('light');
await evaluate(`document.querySelector('section[role="dialog"] button[aria-label="Cerrar"]')?.click()`);
await sleep(400);

// ── 4. División: suma exacta, cuenta por parte y completar el saldo ───────
actionAmount=600000;
actionDetalle='Mitad transferencia, mitad efectivo';
await abrirDialogo();
await analizar();
if(!await clickByText(CARD,'Dividir en partes'))throw new Error('no se pudo dividir en partes');
await sleep(400);
const partesSelector='[aria-label^="División del cobro"]';
const partesCount=await evaluate(`document.querySelectorAll('${partesSelector} input[id$="-monto"]').length`);
await evaluate(`(()=>{const inputs=[...document.querySelectorAll('${partesSelector} input[id$="-monto"]')];const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(inputs[0],'350000');inputs[0].dispatchEvent(new Event('input',{bubbles:true}));setter.call(inputs[1],'240000');inputs[1].dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
const cuentaParte1=await pickSelect(partesSelector,'310056630007',0);
const cuentaParte2=await pickSelect(partesSelector,'Caja de oficina',1);
await sleep(400);
if(!await clickByText(CARD,'Confirmar acción'))throw new Error('no se pudo confirmar la división inválida');
await waitFor(`document.body.textContent.includes('La suma de las partes')`,{label:'error de suma'});
const sumaError=await evaluate(`(()=>{const card=document.querySelector(${JSON.stringify(CARD)});return {mensaje:(card.textContent.match(/La suma de las partes[\\s\\S]*?\\)\\./)||[''])[0],estado:card?.dataset?.estado};})()`);
const filasAntes=(await pagosDelCliente(clientId)).length;
await capture('division-suma-error-1440-light');
// Corregir la suma y confirmar.
await evaluate(`(()=>{const inputs=[...document.querySelectorAll('${partesSelector} input[id$="-monto"]')];const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(inputs[1],'250000');inputs[1].dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
await sleep(400);
const sumaIndicador=await evaluate(`(()=>{const bloque=document.querySelector('${partesSelector}');return (bloque.textContent.match(/Suma: Gs [\\d.]+ de Gs [\\d.]+/)||[''])[0];})()`);
if(!await clickByText(CARD,'Confirmar acción'))throw new Error('no se pudo confirmar la división');
await waitFor(`document.body.textContent.includes('Saldo del cliente al día')`,{label:'resultado de la división'});
const pagosDivision=await pagosDelCliente(clientId);
evidencia.casos.push({caso:'división',partesCount,cuentaParte1,cuentaParte2,sumaIndicador,sumaError,filasAntes,ui:await evaluate(`(()=>{const card=document.querySelector(${JSON.stringify(CARD)});return {estado:card?.dataset?.estado,mensaje:(card.textContent.match(/Cobro registrado[\\s\\S]*?día\\./)||[''])[0]};})()`),pagos:pagosDivision.filter(pago=>pago.reference==='Mitad transferencia, mitad efectivo').map(pago=>({id:String(pago.id),monto:Number(pago.amount),factura:pago.invoice_number,cuenta:String(pago.account_id),referencia:pago.reference}))});
await capture('division-1440-light');
await setTheme('dark');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
await sleep(600);
await capture('division-390-dark');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await setTheme('light');
await evaluate(`document.querySelector('section[role="dialog"] button[aria-label="Cerrar"]')?.click()`);
await sleep(400);

// ── 5. Sin cuentas activas: se dice y no se puede confirmar ───────────────
sinCuentas=true;
actionAmount=100000;
actionDetalle='Sin cuentas';
await abrirDialogo();
await analizar();
const sinCuentasUI=await evaluate(`(()=>{const card=document.querySelector(${JSON.stringify(CARD)});const button=[...card.querySelectorAll('button')].find(el=>(el.textContent||'').trim()==='Confirmar acción');return {aviso:card.textContent.includes('No hay una cuenta de ingreso'),confirmDisabled:Boolean(button?.disabled)};})()`);
evidencia.casos.push({caso:'sin cuentas activas',...sinCuentasUI});
await capture('sin-cuentas-1440-light');
sinCuentas=false;

writeFileSync(resolve(OUT,'evidencia-api.json'),`${JSON.stringify(evidencia,null,2)}\n`);
console.log('evidencia lista');
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(0);
