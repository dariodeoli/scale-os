/*
 * Cierre campaña #154 — smoke cross-vertical de producción v1.0.172:
 * portal del cliente + SSO de PLT + versión visible, en 390/1440 claro-oscuro.
 *
 * Uso: node build-tools/visual-harness/qa-testeos-172-plt-prod.mjs [--checks]
 * Salida: docs/qa/testeos-172/prod/ (capturas acceso/portal) + smoke-plt-browser.txt
 */
import {launchChrome,openTarget} from './chrome.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const withChecks=process.argv.includes('--checks');
const out=resolve(repo,process.env.QA_OUT||'docs/qa/testeos-172/prod');
mkdirSync(out,{recursive:true});
const BASE=(process.env.BASE_URL||'https://app.scaleparaguay.com').replace(/\/$/,'');

const log=[];const checks=[];
const check=(label,value,expected=true)=>{const ok=value===expected;checks.push({label,ok,value,expected});log.push(`${ok?'✓':'✗'} ${label}: ${JSON.stringify(value)}${ok?'':` (esperado ${JSON.stringify(expected)})`}`);if(!ok)process.exitCode=1;};
const note=(text)=>log.push(`· ${text}`);
const chrome=await launchChrome();
const cdp=await openTarget(chrome.port);
const send=(m,p={})=>cdp.send(m,p);
const evaluate=async e=>{const {result,exceptionDetails}=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(e,{timeout=25000,label=''}={})=>{const t=Date.now();while(Date.now()-t<timeout){if(await evaluate(`Boolean(${e})`).catch(()=>false))return true;await sleep(250);}throw new Error(`timeout ${label||e}`);};
const capture=async(name)=>{const {data}=await send('Page.captureScreenshot',{format:'jpeg',quality:78});writeFileSync(resolve(out,`${name}.jpg`),Buffer.from(data,'base64'));note(`captura ${name}.jpg`);};
const setTheme=async(theme)=>{await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)})}catch{};if(${JSON.stringify(theme)}==='light')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);await sleep(250);};
const setViewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await sleep(300);};

await send('Page.enable');await send('Runtime.enable');
const providers=await (await fetch(BASE+'/core-api/api/auth/providers')).json();
note(`proveedores configurados: ${JSON.stringify(providers)}`);

for(const [width,height] of [[1440,900],[390,844]]){
 const W=String(width);
 for(const theme of ['light','dark']){
  await setViewport(width,height);await setTheme(theme);
  // Acceso (SSO por proveedor configurado).
  await send('Page.navigate',{url:BASE+'/'});
  await waitFor(`document.querySelector('input[type="email"],input[type="password"]')||/Ingresar|Iniciar sesión/.test(document.body.innerText)`,{label:'acceso'});
  await sleep(900);
  const access=await evaluate(`(()=>{const visibles=[...document.querySelectorAll('button,a')].filter(n=>n.getClientRects().length>0).map(n=>n.textContent.trim());return {google:visibles.some(t=>/Google/i.test(t)),microsoft:visibles.some(t=>/Microsoft/i.test(t)),apple:visibles.some(t=>/Apple/i.test(t)),login:/Correo|Contraseña/.test(document.body.innerText)};})()`);
  check(`acceso ${W} ${theme}: pantalla de acceso`,access.login,true);
  check(`acceso ${W} ${theme}: Google visible`,access.google,providers.google===true);
  check(`acceso ${W} ${theme}: Microsoft ${providers.microsoft?'visible':'oculto (no configurado)'}`,access.microsoft,providers.microsoft===true);
  check(`acceso ${W} ${theme}: Apple ${providers.apple?'visible':'oculto (no configurado)'}`,access.apple,providers.apple===true);
  await capture(`acceso-${W}-${theme}`);
  // Portal del cliente.
  await send('Page.navigate',{url:BASE+'/cliente/ingresar'});
  await waitFor(`/Correo|Ingresar|Acceso/.test(document.body.innerText)`,{label:'portal'});
  await sleep(700);
  const portal=await evaluate(`(()=>{const text=document.body.innerText;return {title:/Acceso|Portal|Ingresar/i.test(text),email:Boolean(document.querySelector('input[type="email"]')),error:/No se pudo|error/i.test(text)};})()`);
  check(`portal ${W} ${theme}: ingreso del cliente`,portal.title&&portal.email&&!portal.error,true);
  await capture(`portal-ingresar-${W}-${theme}`);
 }
}

writeFileSync(resolve(out,'smoke-plt-browser.txt'),log.join('\n')+'\n');
console.log(log.join('\n'));
console.log(withChecks?(process.exitCode?'Smoke PLT v1.0.172: FALLÓ':'Smoke PLT v1.0.172: PASS'):'Smoke PLT v1.0.172: capturas listas');
await cdp.close();await chrome.close();
process.exit(process.exitCode||0);
