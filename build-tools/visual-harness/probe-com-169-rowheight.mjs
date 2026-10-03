#!/usr/bin/env node
// Sonda instrumentada: qué mide useFilasVisibles como alto de fila (#154 COM).
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
await send('Page.addScriptToEvaluateOnNewDocument', {source: `
(()=>{const orig=Element.prototype.getBoundingClientRect;window.__rowMeasures=[];Element.prototype.getBoundingClientRect=function(){const rect=orig.call(this);try{if(this.getAttribute&&this.getAttribute('role')==='row'){window.__rowMeasures.push({cls:String(this.className||'').slice(0,50),aria:this.getAttribute('aria-hidden'),h:Math.round(rect.height),w:Math.round(rect.width),style:String(this.getAttribute('style')||'').slice(0,60)});if(window.__rowMeasures.length>200)window.__rowMeasures.shift();}}catch{}return rect;};})();
`});
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});
await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 950, deviceScaleFactor: 1, mobile: false});
await send('Page.navigate', {url: BASE + '/presupuestos'});
await sleep(5000);
const rows = await evaluate(`window.__rowMeasures||[]`);
const suspected = rows.filter((row) => row.h > 200);
console.log('mediciones de fila >200px:', JSON.stringify(suspected.slice(-10), null, 1));
console.log('últimas 8 mediciones:', JSON.stringify(rows.slice(-8)));
const state = await evaluate(`(()=>{const grupo=document.querySelector('[role="rowgroup"]');const rowsIn=[...grupo.querySelectorAll('[role="row"]')];const visibles=rowsIn.filter(r=>r.getAttribute('aria-hidden')!=='true');const spacer=rowsIn.find(r=>r.getAttribute('aria-hidden')==='true');return{visibles:visibles.length,spacer:spacer?Math.round(spacer.getBoundingClientRect().height):0,scrollH:document.documentElement.scrollHeight,altoVisible:visibles[0]?Math.round(visibles[0].getBoundingClientRect().height):null};})()`);
console.log('estado final:', JSON.stringify(state));
cdp.close();
chrome.close();
