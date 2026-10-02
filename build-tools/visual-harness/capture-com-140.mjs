#!/usr/bin/env node
/*
 * Evidencia de la auditoría de Comercial (#140):
 *   - Clientes: acciones por fila consolidadas en el menú ⋯ y estado
 *     «Sin contratos» chico y accionable.
 *   - Pipeline: indicador fuerte de columnas ocultas (conteo + flechas) y
 *     tarjeta corta (sin descripción, acción rápida en icono).
 *
 * Capturas claro/oscuro en 1440×900 y 390×844 para cada fase (`antes`|`despues`)
 * + medidas crudas (`medidas-<fase>.json`).
 *
 * Requisitos: el stack local de COM (`e2e-com-stack.mjs`) levantado — deja la
 * sesión en work/visual-harness/com-qa-session.txt — y `.next` construido.
 * Uso: node build-tools/visual-harness/capture-com-140.mjs antes|despues
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const phase = process.argv[2] === 'antes' ? 'antes' : 'despues';
const out = resolve(repo, 'docs/qa/com-140');
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

// Pipeline: tarjeta corta + indicador de etapas fuera de vista.
const measurePipeline = () => evaluate(`(()=>{
 const section=document.querySelector('section[aria-label="Pipeline"]');
 const card=section?section.querySelector('article'):null;
 const board=section?[...section.querySelectorAll('div')].find(node=>String(node.className||'').includes('overflow-x-auto')):null;
 const indicator=section?[...section.querySelectorAll('[role="status"]')].map(node=>node.textContent.trim()).find(text=>text.includes('fuera de vista'))||null:null;
 return {cardHeight:card?Math.round(card.getBoundingClientRect().height):null,cardText:card?card.textContent.replace(/\\s+/g,' ').trim().slice(0,140):null,indicator,board:board?{scrollWidth:board.scrollWidth,clientWidth:board.clientWidth}:null};
})()`);

// Clientes: acciones de la primera fila/tarjeta, menú ⋯ y atajo del estado.
const measureClientes = () => evaluate(`(()=>{
 const section=document.querySelector('section[aria-label="Directorio de clientes"]');
 if(!section)return {section:false};
 const row=section.querySelector('[role="table"] [role="row"]:not(:first-child)');
 const card=section.querySelector('article');
 const actions=(node)=>node?[...node.querySelectorAll('button')].map(button=>(button.getAttribute('title')||button.textContent||'⋯').replace(/\\s+/g,' ').trim()).filter(Boolean):[];
 const empty=[...section.querySelectorAll('button')].map(button=>button.textContent.replace(/\\s+/g,' ').trim()).find(text=>/^Ver (el|los) .*sin plan$/.test(text))||null;
 return {section:true,rowActions:actions(row),cardActions:actions(card),menuTrigger:Boolean(section.querySelector('button[aria-haspopup="menu"]')),emptyState:empty};
})()`);

const openRowMenu = () => evaluate(`(()=>{const section=document.querySelector('section[aria-label="Directorio de clientes"]');const trigger=section&&section.querySelector('button[aria-haspopup="menu"]');if(!trigger)return false;trigger.scrollIntoView({block:'center'});trigger.click();return true;})()`);

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

const measures = [];
for (const [theme, width, height] of [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
  await setViewport(width, height);

  await go('/pipeline', `document.body.textContent.includes('Oportunidades abiertas')`);
  await setTheme(theme); await sleep(900);
  // El tablero se monta recién cuando llegan las filas: esperarlo (con sus
  // columnas) antes de encuadrar la captura.
  await waitFor(`[...document.querySelectorAll('section[aria-label="Pipeline"] div')].some(node=>String(node.className||'').includes('overflow-x-auto'))`, {label: 'tablero de pipeline'});
  // En pantallas chicas el tablero queda debajo del pliegue y el topbar sticky
  // lo tapa: se encuadra desde el indicador (o el tablero) descontando su alto.
  if (width < 768) {
    await evaluate(`(()=>{const section=document.querySelector('section[aria-label="Pipeline"]');const indicator=[...section.querySelectorAll('[role="status"]')].find(node=>node.textContent.includes('fuera de vista'));const board=[...section.querySelectorAll('div')].find(node=>String(node.className||'').includes('overflow-x-auto'));const anchor=indicator||board;const topbar=document.querySelector('.workspace-topbar');if(anchor)window.scrollTo({top:window.scrollY+anchor.getBoundingClientRect().top-(topbar?topbar.getBoundingClientRect().height:0)-12});return true;})()`);
    await sleep(400);
  }
  await shot(`pipeline-tablero-${width}-${theme}`);
  measures.push({screen: 'pipeline', phase, theme, width, height, ...await measurePipeline()});

  await go('/clientes', `document.body.textContent.includes('Clientes')`);
  await setTheme(theme); await sleep(900);
  await shot(`clientes-directorio-${width}-${theme}`);
  measures.push({screen: 'clientes', phase, theme, width, height, ...await measureClientes()});
  if (await openRowMenu()) {
    await sleep(400);
    await shot(`clientes-menu-${width}-${theme}`);
    await evaluate(`document.body.click()`);
  }
}

writeFileSync(resolve(out, `medidas-${phase}.json`), JSON.stringify(measures, null, 1));
cdp.close();
chrome.close();
console.log(`Evidencia COM #140 (${phase}) en ${out}`);
