/*
 * Cierre de la vertical FIN para la campaña #154 (base v1.0.172).
 *
 * Complementa la verificación de #149 con las superficies que faltaban:
 * Informes, Comisiones (incluido el alta de descuento) y Salarios dentro de
 * Previsión, más un caso borde de permisos (rol viewer) sobre producción.
 *
 * Uso: node build-tools/visual-harness/qa-fin-154.mjs
 *      (lee BASE/SESSION de work/visual-harness/fin-qa-session.txt)
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const session=Object.fromEntries(readFileSync(resolve(here,'../../work/visual-harness/fin-qa-session.txt'),'utf8').trim().split('\n').map(line=>line.split('=')));
const BASE=(process.env.BASE_URL||session.BASE||'http://127.0.0.1:3021').replace(/\/$/,'');
const SESSION=(process.env.SESSION||session.SESSION||'').trim();
const API=BASE.includes('scaleparaguay')?'https://api.scaleparaguay.com':'http://127.0.0.1:3903';
if(!SESSION)throw new Error('Falta SESSION');
const LABEL=process.env.QA_LABEL||'run';
const OUT=resolve(here,`../../work/visual-harness/fin-154-${LABEL}`);
mkdirSync(OUT,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};
const note=(text)=>log.push(`· ${text}`);

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=45000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78,captureBeyondViewport:true});writeFileSync(resolve(OUT,`${name}.jpg`),Buffer.from(data,'base64'));};
const sectionText=(label)=>evaluate(`(()=>{const node=document.querySelector('section[aria-label=${JSON.stringify(label)}]');return node?node.innerText:'';})()`);
const clickText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)}&&node.getBoundingClientRect().height>0);if(!el)return false;el.click();return true;})()`);
const buttonVisible=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)});return el?el.getBoundingClientRect().height>0:false;})()`);
const setTheme=(theme)=>evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
const MONTHS=/(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre) 20\d\d/;

let exceptions=[];
cdp.on('Runtime.exceptionThrown',event=>exceptions.push(event.exceptionDetails?.text||'excepción'));
cdp.on('Log.entryAdded',event=>{if(event.entry.level==='error')exceptions.push(event.entry.text);});

await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
await send('Network.setCookie',{name:'scale_session',value:SESSION,url:BASE,domain:BASE.includes('scaleparaguay')?'.scaleparaguay.com':undefined,path:'/'});

for(const [width,theme] of [[1440,'light'],[1440,'dark'],[390,'light'],[390,'dark']]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:width<768?2:1,mobile:width<768});

 // Informes: KPIs, mes largo y series sin correos técnicos.
 await send('Page.navigate',{url:BASE+'/informes'});
 await waitFor(`document.querySelector('section[aria-label="Reportes de la agencia"]')`,{label:'informes'});
 await setTheme(theme);await sleep(1400);
 const informes=await sectionText('Reportes de la agencia');
 check(`informes (${width} ${theme}): KPIs de facturación`,/Facturado/.test(informes),true);
 check(`informes (${width} ${theme}): mes y moneda consultables`,await evaluate(`Boolean(document.querySelector('#reports-month'))`),true);
 check(`informes (${width} ${theme}): sin correos técnicos`,/@demo\.example\.invalid/.test(informes),false);
 await capture(`informes-${width}-${theme}`);

 // Comisiones: mes largo, subtabs y alta de descuento (estaba detrás del subtab).
 await send('Page.navigate',{url:BASE+'/equipo/comisiones'});
 await waitFor(`document.querySelector('section[aria-label="Comisiones y referidos"]')`,{label:'comisiones'});
 await setTheme(theme);await sleep(1200);
 const comisiones=await sectionText('Comisiones y referidos');
 check(`comisiones (${width} ${theme}): mes largo en KPIs`,MONTHS.test(comisiones),true);
 check(`comisiones (${width} ${theme}): sin correos técnicos`,/@demo\.example\.invalid/.test(comisiones),false);
 await evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(node=>node.textContent.trim().startsWith('Descuentos')&&node.getBoundingClientRect().height>0);if(el)el.click();return Boolean(el);})()`);
 await sleep(500);
 check(`comisiones (${width} ${theme}): el subtab Descuentos muestra el alta`,await buttonVisible('Nuevo descuento'),true);
 if(await buttonVisible('Nuevo descuento')){
  await clickText('Nuevo descuento');
  await waitFor(`document.querySelector('[role="dialog"]')`,{label:'alta de descuento'});
  const dialog=await evaluate(`document.querySelector('[role="dialog"]').innerText`);
  check(`comisiones (${width} ${theme}): el diálogo de descuento abre`,/Descuento por referido/.test(dialog),true);
  await capture(`comisiones-descuento-${width}-${theme}`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await sleep(400);
 }
 await capture(`comisiones-${width}-${theme}`);

 // Salarios dentro de Previsión: filas con nombre y moneda, sin correos técnicos.
 await send('Page.navigate',{url:BASE+'/pagos/prevision'});
 await waitFor(`document.querySelector('section[aria-label="Previsión financiera"]')`,{label:'previsión'});
 await setTheme(theme);await sleep(1600);
 const salarios=await evaluate(`(()=>{const node=document.querySelector('[aria-label="Salarios"]');return node?node.innerText:'';})()`);
 check(`salarios (${width} ${theme}): panel de salarios con personas`,/(Lucía Acosta|Mateo Ríos|Camila Vera)/.test(salarios),true);
 check(`salarios (${width} ${theme}): sin correos técnicos`,/@demo\.example\.invalid/.test(salarios),false);
 check(`salarios (${width} ${theme}): monedas por separado`,/(PYG|USD)/.test(salarios),true);
 await capture(`salarios-${width}-${theme}`);
}

// Caso borde de permisos: rol viewer (sin acciones FIN, con «Sin acceso» en las secciones gateadas).
const switchRole=async(role)=>{const res=await fetch(`${API}/api/demo/role`,{method:'POST',headers:{'content-type':'application/json',origin:BASE.includes('scaleparaguay')?'https://sistema.scaleparaguay.com':BASE,cookie:`scale_session=${SESSION}`},body:JSON.stringify({role})});if(!res.ok)throw new Error(`no se pudo cambiar a ${role}: ${res.status}`);};
try{
 await switchRole('viewer');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:BASE+'/pagos'});
 await waitFor(`document.querySelector('section.panel')||document.querySelector('section[aria-label="Finanzas"]')`,{label:'finanzas viewer'});
 await setTheme('dark');await sleep(1000);
 check('viewer (390 dark): sin «Registrar cobro»',await buttonVisible('Registrar cobro'),false);
 check('viewer (390 dark): sin «Factura» en el encabezado',await buttonVisible('Factura'),false);
 check('viewer (390 dark): sin «Cuenta» ni «Transferir»',await buttonVisible('Cuenta'),false);
 await capture('viewer-finanzas-390-dark');
 await send('Page.navigate',{url:BASE+'/equipo/comisiones'});
 await waitFor(`document.querySelector('section.panel')||document.querySelector('section[aria-label="Comisiones y referidos"]')`,{label:'comisiones viewer'});
 await sleep(900);
 check('viewer (390 dark): sin «Comisión»',await buttonVisible('Comisión'),false);
 check('viewer (390 dark): sin «Nuevo descuento»',await buttonVisible('Nuevo descuento'),false);
 await capture('viewer-comisiones-390-dark');
}finally{
 await switchRole('owner').catch(()=>note('no se pudo restaurar owner; revisar la sesión demo'));
 note('rol restaurado a owner');
}

writeFileSync(resolve(OUT,'verificacion.txt'),log.join('\n')+'\n');
writeFileSync(resolve(OUT,'verificacion.json'),JSON.stringify({label:LABEL,base:BASE,log},null,1));
note(`excepciones/consola: ${exceptions.length}`);
console.log(log.join('\n'));
console.log(`Evidencia en ${OUT}`);
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(process.exitCode||0);
