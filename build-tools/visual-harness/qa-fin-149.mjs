/*
 * Evidencia #149 (Finanzas — bloqueo visual, pickers y formatos).
 *
 * Sobre el stack local de FIN (`e2e-fin-stack.mjs`, demo + datos de estrés):
 * 1) /pagos: «Crear factura» y «Registrar cobro» abren con el botón deshabilitado
 *    y pickers con buscador; el cobro no muestra correos @demo.example.invalid.
 * 2) /pagos/prevision: mes largo («Octubre 2026») y gastos planificado/real
 *    bloqueados sin obligatorios.
 * 3) /pagos/mora: «Sin mora» en lugar de «Al día».
 *
 * Uso: node build-tools/visual-harness/qa-fin-149.mjs
 *      (lee BASE/SESSION de work/visual-harness/fin-qa-session.txt)
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const session=(readFileSync(resolve(here,'../../work/visual-harness/fin-qa-session.txt'),'utf8').match(/^([A-Z]+)=(.+)$/gm)||[]).reduce((acc,line)=>{const [key,...rest]=line.split('=');acc[key]=rest.join('=');return acc;},{});
const BASE=(process.env.BASE_URL||session.BASE||'http://127.0.0.1:3021').replace(/\/$/,'');
const SESSION=(process.env.SESSION||session.SESSION||'').trim();
if(!SESSION)throw new Error('Falta SESSION (corré e2e-fin-stack.mjs)');
const LABEL=process.env.QA_LABEL||'run';
const OUT=resolve(here,`../../work/visual-harness/fin-149-${LABEL}`);
mkdirSync(OUT,{recursive:true});

const log=[];
const check=(label,value,expected=true)=>{const ok=value===expected;log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;return ok;};

const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async(e)=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(expression,{timeout=60000,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return true;}catch{}await sleep(250);}throw new Error(`timeout esperando ${label||expression}`);};
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78,captureBeyondViewport:true});writeFileSync(resolve(OUT,`${name}.jpg`),Buffer.from(data,'base64'));};
const clickText=(text)=>evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)});if(!el)return false;el.click();return true;})()`);
const buttonDisabled=(text,scope='document')=>evaluate(`(()=>{const root=${scope};if(!root)return null;const el=[...root.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)});return el?el.disabled:null;})()`);
const bodyText=()=>evaluate(`document.body.innerText`);
const sectionText=(label)=>evaluate(`(()=>{const node=document.querySelector('section[aria-label=${JSON.stringify(label)}]');return node?node.innerText:'';})()`);
const setTheme=(theme)=>evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);

await send('Page.enable');await send('Runtime.enable');
await send('Network.setCookie',{name:'scale_session',value:SESSION,url:BASE,path:'/'});

for(const [width,theme] of [[1440,'light'],[1440,'dark'],[390,'light'],[390,'dark']]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:width<768?2:1,mobile:width<768});

 // 1) Finanzas: «Crear factura» y «Registrar cobro» bloqueados con pickers.
 await send('Page.navigate',{url:BASE+'/pagos'});
 await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{label:'finanzas'});
 await setTheme(theme);await sleep(1200);
 const finanzas=await sectionText('Finanzas');
 check(`finanzas (${width} ${theme}): el titular es de Horizonte`,/Agencia Horizonte/i.test(finanzas),true);
 check(`finanzas (${width} ${theme}): sin Scale Strategy Group en la demo`,/SCALE STRATEGY GROUP/i.test(finanzas),false);
 await clickText('Factura');await waitFor(`document.body.innerText.includes('Nueva factura')`,{label:'modal factura'});
 check(`factura (${width} ${theme}): «Crear factura» deshabilitado en vacío`,await buttonDisabled('Crear factura',`document.querySelector('.unified-dialog')`),true);
 check(`factura (${width} ${theme}): muestra el buscador de clientes`,await evaluate(`Boolean(document.querySelector('.unified-dialog .entity-picker input'))`),true);
 await capture(`factura-bloqueada-${width}-${theme}`);

 await send('Page.navigate',{url:BASE+'/pagos'});
 await waitFor(`document.querySelector('section[aria-label="Finanzas"]')`,{label:'finanzas'});
 await setTheme(theme);await sleep(800);
 await clickText('Registrar cobro');await waitFor(`document.body.innerText.includes('Quién recibió el cobro')`,{label:'modal cobro'});
 check(`cobro (${width} ${theme}): «Registrar cobro» deshabilitado en vacío`,await buttonDisabled('Registrar cobro',`document.querySelector('.unified-dialog')`),true);
 const modalText=await evaluate(`document.querySelector('.unified-dialog').innerText`);
 check(`cobro (${width} ${theme}): sin correos demo`,/@demo\.example\.invalid/.test(modalText),false);
 check(`cobro (${width} ${theme}): el custodio muestra nombre`,/(Lucía|Mateo|Camila|Nicolás|Valentina)/.test(modalText),true);
 await capture(`cobro-bloqueado-${width}-${theme}`);

 // 2) Previsión: mes largo y gastos bloqueados en vacío.
 await send('Page.navigate',{url:BASE+'/pagos/prevision'});
 await waitFor(`document.querySelector('section[aria-label="Previsión financiera"]')`,{label:'previsión'});
 await setTheme(theme);await sleep(1500);
 const prevision=await bodyText();
 check(`previsión (${width} ${theme}): mes largo visible`,/(Septiembre|Octubre|Noviembre) 2026/.test(prevision),true);
 check(`previsión (${width} ${theme}): «Agregar gasto planificado» bloqueado`,await buttonDisabled('Agregar gasto planificado',`document.querySelector('section[aria-label="Previsión financiera"]')`),true);
 check(`previsión (${width} ${theme}): «Registrar gasto real» bloqueado`,await buttonDisabled('Registrar gasto real',`document.querySelector('section[aria-label="Previsión financiera"]')`),true);
 await capture(`prevision-bloqueada-${width}-${theme}`);

 // 3) Mora: «Sin mora» en lugar de «Al día».
 await send('Page.navigate',{url:BASE+'/pagos/mora'});
 await waitFor(`document.querySelector('section[aria-label="Cobranza y mora"]')`,{label:'mora'});
 await setTheme(theme);await sleep(1000);
 const mora=await evaluate(`document.querySelector('section[aria-label="Cobranza y mora"]').innerText`);
 check(`mora (${width} ${theme}): «Sin mora» visible`,/Sin mora/.test(mora),true);
 check(`mora (${width} ${theme}): «Al día» retirado`,/Al día/.test(mora),false);
 await capture(`mora-sin-mora-${width}-${theme}`);
}

writeFileSync(resolve(OUT,'verificacion.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(`Evidencia en ${OUT}`);
cdp.send('Page.close').catch(()=>undefined);
chrome.process?.kill?.('SIGKILL');
process.exit(process.exitCode||0);
