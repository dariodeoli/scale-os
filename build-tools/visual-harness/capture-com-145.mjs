#!/usr/bin/env node
/*
 * Evidencia de la ficha de cliente (#145):
 *   - «Cliente desde» con una sola fuente (alta real) y «Inicio de relación»
 *     etiquetada aparte cuando la fecha declarada difiere.
 *   - Montos formateados (sin `PYG 3000000.00` crudo).
 *   - KPIs de Pipeline compactos en móvil.
 *
 * Prepara una fecha de relación distinta del alta en la demo (Aurora Café)
 * para que la inconsistencia sea visible en `antes` y quede resuelta en
 * `despues`. Capturas claro/oscuro en 1440×900 y 390×844 + medidas crudas.
 *
 * Requisitos: el stack local de COM (`e2e-com-stack.mjs`) levantado (deja la
 * sesión en work/visual-harness/com-qa-session.txt) y `.next` construido.
 * Uso: node build-tools/visual-harness/capture-com-145.mjs antes|despues
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const phase = process.argv[2] === 'antes' ? 'antes' : 'despues';
const out = resolve(repo, 'docs/qa/com-145');
mkdirSync(out, {recursive: true});
const session = Object.fromEntries(readFileSync(resolve(repo, 'work/visual-harness/com-qa-session.txt'), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = session.BASE;

const chrome = await launchChrome();
const cdp = await openTarget(chrome.port);
const send = (method, params = {}) => cdp.send(method, params);
const evaluate = async (expression) => {
  const {result, exceptionDetails} = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description || ''));
  return result.value;
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const waitFor = async (expression, {timeout = 25000, label = ''} = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(200);
  }
  throw new Error(`timeout esperando ${label || expression}`);
};
const setTheme = (theme) => evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)});}catch{}document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
const shot = async (name) => {
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 72});
  writeFileSync(resolve(out, `${phase}-${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`captura ${phase}-${name}.jpg`);
};
const setViewport = (width, height) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
const go = async (path, ready) => {await send('Page.navigate', {url: BASE + path}); await sleep(3200); if (ready) await waitFor(ready, {label: ready});};
const api = async (path, method = 'GET', payload) => evaluate(`fetch('/core-api/api${path}',{method:${JSON.stringify(method)},credentials:'same-origin',${payload ? `headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify(payload)}),` : ''}}).then(async r=>({status:r.status,data:await r.json().catch(()=>null)}))`);

const measureFicha = () => evaluate(`(()=>{
 const dialog=document.querySelector('[role="dialog"]');
 if(!dialog)return {ficha:false};
 const text=dialog.textContent;
 const cards=[...dialog.querySelectorAll('.client-summary-grid article')].map(node=>node.textContent.replace(/\\s+/g,' ').trim());
 return {ficha:true,sinceCard:cards.find(card=>card.startsWith('Cliente desde'))||null,relationshipCard:cards.find(card=>card.startsWith('Inicio de relación'))||null,rawAmounts:(text.match(/PYG \\d+(?:\\.\\d+)?/g)||[]).concat(text.match(/\\b\\d{4,}\\.\\d{2}\\b/g)||[]).slice(0,4)};
})()`);
const measureKpis = () => evaluate(`(()=>{const strip=document.querySelector('[aria-label="Resumen del pipeline"]');if(!strip)return{kpis:false};return{kpis:true,grid:getComputedStyle(strip).gridTemplateColumns,height:Math.round(strip.getBoundingClientRect().height),cards:[...strip.children].map(card=>Math.round(card.getBoundingClientRect().height))};})()`);
const openFicha = () => evaluate(`(()=>{const button=[...document.querySelectorAll('button[aria-label^="Abrir ficha"]')].find(node=>node.getAttribute('aria-label').includes('Aurora Café'));if(!button)return false;button.click();return true;})()`);

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});
await setViewport(1440, 900);
// La API relativa necesita una página del origen cargada primero.
await go('/clientes', `document.body.textContent.includes('Clientes')`);

// Aurora Café: una fecha de relación declarada distinta del alta real.
const clients = await api('/agency/clients?limit=30&fields=id,name');
const aurora = (clients.data?.clients || []).find((client) => client.name === 'Aurora Café');
if (!aurora) throw new Error('La demo no tiene a Aurora Café');
const reporting = await api(`/agency/clients/${aurora.id}/reporting`);
const patched = await api(`/agency/clients/${aurora.id}/reporting`, 'PATCH', {expectedVersion: reporting.data?.reporting?.version, relationshipStartedOn: '2026-02-10'});
console.log(`reporting Aurora: ${patched.status}`);

const measures = [];
for (const [theme, width, height] of [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
  await setViewport(width, height);

  // Directorio: la fecha del listado (alta real).
  await go('/clientes', `document.body.textContent.includes('Clientes')`);
  await setTheme(theme); await sleep(900);
  const directory = await evaluate(`(()=>{const row=[...document.querySelectorAll('[role="table"] [role="row"], article')].find(node=>node.textContent.includes('Aurora Café'));return row?row.textContent.replace(/\\s+/g,' ').trim().slice(0,220):null;})()`);
  await shot(`clientes-directorio-${width}-${theme}`);

  // Ficha: fecha única/etiquetada y montos.
  if (!await openFicha()) throw new Error('No se pudo abrir la ficha de Aurora Café');
  await waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('Cliente desde')`, {label: 'resumen de la ficha'});
  await sleep(700);
  await evaluate(`(()=>{const summary=document.querySelector('[role="dialog"] .client-summary');summary?.scrollIntoView({block:'start'});return true;})()`);
  await sleep(500);
  await shot(`clientes-ficha-${width}-${theme}`);
  measures.push({screen: 'clientes', phase, theme, width, height, directory, ...await measureFicha()});
  // Las notas del cliente: el importe crudo (o formateado) vive ahí.
  await evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');const note=[...(dialog?.querySelectorAll('p')||[])].find(node=>node.textContent.includes('Plan de referencia'));note?.scrollIntoView({block:'start'});return true;})()`);
  await sleep(500);
  await shot(`clientes-notas-${width}-${theme}`);

  // Pipeline: KPIs compactos.
  await go('/pipeline', `document.body.textContent.includes('Oportunidades abiertas')`);
  await setTheme(theme); await sleep(700);
  await evaluate(`(()=>{const strip=document.querySelector('[aria-label="Resumen del pipeline"]');const topbar=document.querySelector('.workspace-topbar');if(strip)window.scrollTo({top:window.scrollY+strip.getBoundingClientRect().top-(topbar?topbar.getBoundingClientRect().height:0)-12});return true;})()`);
  await sleep(400);
  await shot(`pipeline-kpis-${width}-${theme}`);
  measures.push({screen: 'pipeline', phase, theme, width, height, ...await measureKpis()});
}

writeFileSync(resolve(out, `medidas-${phase}.json`), JSON.stringify(measures, null, 1));
cdp.close();
chrome.close();
console.log(`Evidencia COM #145 (${phase}) en ${out}`);
