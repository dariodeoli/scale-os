/*
 * Evidencia de la acción `registrar_cobro` de «Carga con IA» (#121) contra el
 * stack local FIN: corrida de la API real (camino por cliente con reparto FIFO,
 * idempotencia y rechazos sin efectos) + captura de la lista de cobros.
 *
 * Requiere `e2e-fin-stack.mjs` (sesión en work/visual-harness/fin-qa-session.txt)
 * y el build de Next.
 * Uso: node build-tools/visual-harness/qa-ia-cobro-121.mjs
 *      QA_ONLY_CAPTURE=1 node ...   # solo regenera las capturas
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const session=Object.fromEntries(readFileSync(resolve(here,'../../work/visual-harness/fin-qa-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=process.env.BASE_URL||session.BASE;
const OUT=resolve(here,'../../docs/qa/ia-cobro-121');
mkdirSync(OUT,{recursive:true});

const call=async(method,path,body)=>{
 const response=await fetch(`${BASE}/core-api${path}`,{method,headers:{'content-type':'application/json',cookie:`scale_session=${session.SESSION}`,origin:BASE},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json().catch(()=>null)};
};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const llamadas=async()=>((await call('GET','/api/agency/payments?limit=all')).data?.payments||[]).length;
const casos=[];

if(!process.env.QA_ONLY_CAPTURE){
 const cuentas=await call('GET','/api/agency/accounts');
 const cuenta=(cuentas.data?.accounts||[]).find(account=>account.currency==='PYG'&&account.active!==false);
 if(!cuenta)throw new Error('El stack no tiene una cuenta PYG activa');
 const cliente=await call('POST','/api/agency/clients',{name:'Cliente IA QA #121'});
 if(cliente.status!==201)throw new Error(`no se pudo crear el cliente: ${cliente.status} ${JSON.stringify(cliente.data)}`);
 const clientId=cliente.data.client.id;
 const vencida=await call('POST','/api/agency/invoices',{clientId,total:'300000',currency:'PYG',dueOn:'2026-08-01',notes:'Factura vencida de la evidencia #121'});
 const vigente=await call('POST','/api/agency/invoices',{clientId,total:'500000',currency:'PYG',dueOn:'2026-09-15',notes:'Factura vigente de la evidencia #121'});
 if(vencida.status!==201||vigente.status!==201)throw new Error(`no se pudieron crear las facturas: ${vencida.status}/${vigente.status}`);

 const registrar=async(nombre,payload,{esperado=null}={})=>{
  const antes=await llamadas();
  const respuesta=await call('POST','/api/agency/payments',payload);
  const despues=await llamadas();
  casos.push({nombre,solicitud:payload,estado:respuesta.status,filasNuevas:despues-antes,respuesta:respuesta.data});
  if(esperado!==null&&respuesta.status!==esperado)throw new Error(`${nombre}: esperaba ${esperado} y obtuve ${respuesta.status}`);
  return respuesta;
 };

 const llave='12100000-1210-4121-a121-000000000121';
 const feliz=await registrar('cobro por cliente con reparto FIFO',{clientId,accountId:String(cuenta.id),amount:600000,receivedOn:today,reference:'Cobro IA #121',requestId:llave},{esperado:201});
 await registrar('reintento con la misma llave',{clientId,accountId:String(cuenta.id),amount:600000,receivedOn:today,reference:'Cobro IA #121',requestId:llave},{esperado:200});
 await registrar('monto mayor al saldo pendiente',{clientId,accountId:String(cuenta.id),amount:999999999,receivedOn:today},{esperado:409});
 await registrar('fecha futura',{clientId,accountId:String(cuenta.id),amount:1000,receivedOn:'2999-01-01'},{esperado:400});
 await registrar('cliente inexistente',{clientId:99999999,accountId:String(cuenta.id),amount:1000,receivedOn:today},{esperado:404});
 await call('PATCH',`/api/agency/clients/${clientId}`,{lifecycle_status:'paused'});
 await registrar('cliente inactivo',{clientId,accountId:String(cuenta.id),amount:1000,receivedOn:today},{esperado:409});

 writeFileSync(resolve(OUT,'evidencia-api.json'),`${JSON.stringify({fecha:new Date().toISOString(),base:BASE,cuenta:{id:String(cuenta.id),name:cuenta.name,currency:cuenta.currency},clienteId:String(clientId),facturas:[{id:String(vencida.data.invoice.id),total:Number(vencida.data.invoice.total),dueOn:'2026-08-01'},{id:String(vigente.data.invoice.id),total:Number(vigente.data.invoice.total),dueOn:'2026-09-15'}],casos},null,2)}\n`);
 console.log(`evidencia-api.json · ${casos.length} casos · cobro FIFO ${feliz.data.payments.length} filas por ${feliz.data.total}`);
}

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(expression)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=ms=>new Promise(resolveWait=>setTimeout(resolveWait,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
try{
 await send('Page.enable');await send('Runtime.enable');
 await send('Network.setCookie',{name:'scale_session',value:session.SESSION,url:BASE,path:'/'});
 for(const [width,height,theme] of [[1440,900,'light'],[390,844,'dark']]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`${BASE}/pagos`});
  await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{timeout:60000,label:'Finanzas'});
  await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme==='dark'?'dark':'')};return true;})()`);
  await waitFor(`(()=>[...document.querySelectorAll('*')].some(node=>node.children.length===0&&(node.textContent||'').includes('Cobro IA #121')))()`,{timeout:60000,label:'cobros de la acción'});
  await evaluate(`(()=>{const leaf=[...document.querySelectorAll('*')].find(node=>node.children.length===0&&(node.textContent||'').includes('Cobro IA #121'));const row=leaf?.closest('[role="row"],li,article,tr')||leaf;if(row)row.scrollIntoView({block:'center'});return true;})()`);
  await sleep(700);
  const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:false});
  const file=`finanzas-cobros-${width}-${theme}.jpg`;
  writeFileSync(resolve(OUT,file),Buffer.from(data,'base64'));
  console.log(file);
 }
}finally{
 cdp.send('Page.close').catch(()=>undefined);
 chrome.process?.kill?.('SIGKILL');
}
process.exit(0);
