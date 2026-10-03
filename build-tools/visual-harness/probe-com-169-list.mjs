#!/usr/bin/env node
// Sonda de la ventana de montaje de Presupuestos (#135 P4) — campaña #154 COM.
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const sessionFile = process.env.QA_SESSION || 'com-qa-session-169.txt';
const session = Object.fromEntries(readFileSync(resolve(repo, `work/visual-harness/${sessionFile}`), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = process.env.BASE || session.BASE;

const chrome = await launchChrome();
const cdp = await openTarget(chrome.port);
const send = (method, params = {}) => cdp.send(method, params);
const evaluate = async (expression) => {
  const {result, exceptionDetails} = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description || ''));
  return result.value;
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});
await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 950, deviceScaleFactor: 1, mobile: false});
await send('Page.navigate', {url: BASE + '/presupuestos'});
for (let i = 0; i < 80; i += 1) {
  if (await evaluate(`Boolean(document.querySelector('[role="rowgroup"] [role="row"]'))`)) break;
  await sleep(300);
}
// Evolución del espaciador durante los primeros segundos de la lista.
for (let i = 0; i < 12; i += 1) {
  const step = await evaluate(`(()=>{const grupo=document.querySelector('[role="rowgroup"]');if(!grupo)return null;const rows=[...grupo.querySelectorAll('[role="row"]')];const visibles=rows.filter(r=>r.getAttribute('aria-hidden')!=='true');const spacer=rows.find(r=>r.getAttribute('aria-hidden')==='true');return{t:${i},vis:visibles.length,spacer:spacer?Math.round(spacer.getBoundingClientRect().height):0,alto:visibles[0]?Math.round(visibles[0].getBoundingClientRect().height):null,scrollH:document.documentElement.scrollHeight};})()`);
  console.log('t'+i, JSON.stringify(step));
  await sleep(250);
}

const dump = async (label) => {
  const state = await evaluate(`(()=>{
   const grupo=document.querySelector('[role="rowgroup"]');
   if(!grupo)return{dialog:false};
   const rows=[...grupo.querySelectorAll('[role="row"]')];
   const visibles=rows.filter(r=>r.getAttribute('aria-hidden')!=='true');
   const spacers=rows.filter(r=>r.getAttribute('aria-hidden')==='true');
   return {
    visibles:visibles.length,
    visiblesNombres:visibles.map(r=>r.textContent.replace(/\\s+/g,' ').trim().slice(0,24)),
    altoVisible:visibles[0]?Math.round(visibles[0].getBoundingClientRect().height):null,
    spacers:spacers.map(s=>({alto:Math.round(s.getBoundingClientRect().height),style:s.getAttribute('style')})),
    pageScrollY:Math.round(window.scrollY),
    scrollHeight:document.documentElement.scrollHeight,
    viewport:window.innerHeight
   };
  })()`);
  console.log(label, JSON.stringify(state, null, 1));
  return state;
};
await dump('arriba:');
await evaluate(`window.scrollTo(0,document.documentElement.scrollHeight)`);
await sleep(1000);
await dump('abajo:');
await evaluate(`window.scrollTo(0,0)`);
await sleep(600);
// Contrato del hook: suma de filas montadas + ocultas por espaciador.
const total = await evaluate(`document.querySelectorAll('[role="rowgroup"] [role="row"]').length`);
console.log('total nodos fila (visibles+spacers):', total);
cdp.close();
chrome.close();
