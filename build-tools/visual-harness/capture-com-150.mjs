#!/usr/bin/env node
/*
 * Evidencia de la ronda de popups #150 (Presupuestos/Oportunidades):
 *   - Presupuesto: consulta primero, edición completa con «Opciones del
 *     documento» plegable y guardado bloqueado con errores inline.
 *   - Enlace público: condiciones (alcance, vencimiento y revocación) antes de
 *     habilitarlo.
 *   - Alta de oportunidad: campos primero; aviso legal en una línea + ayuda
 *     desplegable.
 *
 * Capturas claro/oscuro en 1440×900 y 390×844 para cada fase (`antes`|`despues`)
 * + medidas crudas (`medidas-<fase>.json`).
 *
 * Requisitos: el stack local de COM (`e2e-com-stack.mjs`) levantado y `.next`
 * construido. La sesión se lee de `work/visual-harness/<QA_SESSION>`.
 * Uso: node build-tools/visual-harness/capture-com-150.mjs antes|despues
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const phase = process.argv[2] === 'antes' ? 'antes' : 'despues';
const out = resolve(repo, 'docs/qa/com-150');
mkdirSync(out, {recursive: true});
const sessionFile = process.env.QA_SESSION || 'com-qa-session.txt';
const session = Object.fromEntries(readFileSync(resolve(repo, `work/visual-harness/${sessionFile}`), 'utf8').trim().split('\n').map((line) => line.split('=')));
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
const clickButton = (label, scope = 'document') => evaluate(`(()=>{const root=${scope === 'document' ? 'document' : `document.querySelector(${JSON.stringify(scope)})`};if(!root)return false;const button=[...root.querySelectorAll('button')].find(node=>node.textContent.replace(/\\s+/g,' ').trim()===${JSON.stringify(label)});if(!button)return false;button.scrollIntoView({block:'center'});button.click();return true;})()`);
const closeDialog = async () => {
  await evaluate(`(()=>{const button=document.querySelector('[role="dialog"] .dialog-heading button[aria-label="Cerrar"]');if(button)button.click();return true;})()`);
  await waitFor(`!document.querySelector('[role="dialog"]')`, {label: 'cierre del diálogo'});
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

// Presupuesto de evidencia: uno nuevo (draft) para poder consultarlo y editarlo.
await setViewport(1440, 900);
await go('/presupuestos', `document.querySelector('section[aria-label="Presupuestos"]')`);
const clients = await evaluate(`fetch('/core-api/api/agency/clients?limit=5&fields=id,name',{credentials:'same-origin'}).then(r=>r.json())`);
const clientId = clients?.clients?.[0]?.id;
let number = '';
if (clientId) {
  const created = await evaluate(`fetch('/core-api/api/agency/budgets',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify({
    title: 'Propuesta de evidencia #150',
    clientId: String(clientId),
    currency: 'PYG',
    tax_rate: '.1',
    notes: 'Incluye una ronda de cambios.',
    validUntil: '2026-11-30',
    sections: ['meta', 'items', 'totals', 'notes'].map((type) => ({type, title: '', body: '', enabled: true})),
    items: [{description: 'Producción audiovisual', quantity: '2', unitPrice: '1250000'}, {description: 'Fotografía de producto', quantity: '1', unitPrice: '750000'}],
  })})}).then(async r=>({status:r.status,data:await r.json().catch(()=>null)}))`);
  number = created?.data?.budget?.number || '';
  console.log(`presupuesto de evidencia: ${number || created.status}`);
}

const budgetMeasure = () => evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');if(!dialog)return{dialog:false};const actions=[...dialog.querySelectorAll('.dialog-actions button')].map(button=>({text:button.textContent.trim(),disabled:button.disabled}));const save=actions.find(action=>/^Guardando…|Guardar$/.test(action.text));return{dialog:true,composer:Boolean(dialog.querySelector('input[name="title"]')),saveDisabled:save?save.disabled:null,saveLabel:save?save.text:null,details:[...dialog.querySelectorAll('details')].map(node=>({summary:node.querySelector('summary')?.textContent.replace(/\\s+/g,' ').trim().slice(0,60)||'',open:node.open})),terms:Boolean(dialog.querySelector('[aria-label="Condiciones del enlace público"]')),text:dialog.innerText.replace(/\\s+/g,' ').trim().slice(0,260)};})()`);
const opportunityMeasure = () => evaluate(`(()=>{const dialog=document.querySelector('[role="dialog"]');if(!dialog)return{dialog:false};const text=dialog.innerText.replace(/\\s+/g,' ').trim();return{dialog:true,nameField:Boolean(dialog.querySelector('input[name="name"]')),fieldsIndex:text.indexOf('Empresa o prospecto'),privacyLineIndex:text.indexOf('Datos para gestionar la oportunidad'),legalDetailIndex:text.indexOf('Usamos estos datos para gestionar la oportunidad'),details:[...dialog.querySelectorAll('details')].map(node=>({summary:node.querySelector('summary')?.textContent.replace(/\\s+/g,' ').trim().slice(0,60)||'',open:node.open})),first160:text.slice(0,160)};})()`);

// Las medidas se persisten por combinación: una corrida interrumpida se puede
// retomar con `WIDTHS=390` sin perder lo ya capturado.
const measuresPath = resolve(out, `medidas-${phase}.json`);
const measures = existsSync(measuresPath) ? JSON.parse(readFileSync(measuresPath, 'utf8')) : [];
const pushMeasure = (entry) => {
  const key = (item) => `${item.screen}|${item.theme}|${item.width}`;
  const index = measures.findIndex((item) => key(item) === key(entry));
  if (index >= 0) measures[index] = entry;
  else measures.push(entry);
  writeFileSync(measuresPath, JSON.stringify(measures, null, 1));
};
const widthFilter = process.env.WIDTHS ? new Set(process.env.WIDTHS.split(',').map(Number)) : null;
const combos = [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]].filter(([, width]) => !widthFilter || widthFilter.has(width));
for (const [theme, width, height] of combos) {
  await setViewport(width, height);

  // ── Presupuesto existente: consulta, enlace y edición ──────────────────
  // La acción cambia entre lista (icono con aria-label) y cuadrícula (texto):
  // el selector cubre ambas vistas sin depender de la densidad.
  await go('/presupuestos', `document.querySelector('section[aria-label="Presupuestos"]')`);
  await waitFor(`[...document.querySelectorAll('button')].some(node=>node.getAttribute('aria-label')?.startsWith('Abrir presupuesto')||node.textContent.trim()==='Abrir presupuesto')`, {label: 'acciones de presupuesto'});
  await setTheme(theme); await sleep(600);
  const opened = await evaluate(`(()=>{const candidates=[...document.querySelectorAll('button')].filter(node=>node.getAttribute('aria-label')?.startsWith('Abrir presupuesto')||node.textContent.trim()==='Abrir presupuesto');const number=${JSON.stringify(number)};const button=number?(candidates.find(node=>node.getAttribute('aria-label')?.includes(number)||node.closest('article')?.textContent.includes(number))||candidates[0]):candidates[0];if(!button)return false;button.scrollIntoView({block:'center'});button.click();return true;})()`);
  if (!opened) throw new Error('no se encontró la fila del presupuesto');
  await waitFor(`document.querySelector('[role="dialog"]')`, {label: 'diálogo de presupuesto'});
  await sleep(500);
  if (await evaluate(`Boolean(document.querySelector('[role="dialog"] input[name="title"]'))`)) {
    // Fase `antes`: el diálogo abre directo en el editor completo.
    await evaluate(`(()=>{const details=document.querySelector('[role="dialog"] details.ops-profile-section');if(details)details.open=true;return true;})()`);
    await sleep(300);
  }
  await shot(`presupuesto-detalle-${width}-${theme}`);
  pushMeasure({screen: 'presupuesto-detalle', phase, theme, width, height, ...await budgetMeasure()});

  if (phase === 'despues') {
    await clickButton('Habilitar enlace público');
    await waitFor(`document.querySelector('[aria-label="Condiciones del enlace público"]')`, {label: 'condiciones del enlace'});
    await sleep(300);
    await shot(`presupuesto-enlace-${width}-${theme}`);
    pushMeasure({screen: 'presupuesto-enlace', phase, theme, width, height, ...await budgetMeasure()});
    await clickButton('Cancelar', '[aria-label="Condiciones del enlace público"]');
    await clickButton('Editar presupuesto');
    await waitFor(`document.querySelector('[role="dialog"] input[name="title"]')`, {label: 'compositor de presupuesto'});
    await sleep(400);
    await shot(`presupuesto-editor-${width}-${theme}`);
    await evaluate(`(()=>{const details=document.querySelector('[role="dialog"] details.quote-document-options');if(!details)return false;details.open=true;details.scrollIntoView({block:'center'});return true;})()`);
    await sleep(400);
    await shot(`presupuesto-opciones-${width}-${theme}`);
  }
  await closeDialog();

  // ── Alta de presupuesto vacío: bloqueo y señales ───────────────────────
  await go('/presupuestos', `document.querySelector('section[aria-label="Presupuestos"]')`);
  await setTheme(theme); await sleep(500);
  await clickButton('Nuevo presupuesto');
  await waitFor(`document.querySelector('[role="dialog"] input[name="title"]')`, {label: 'alta de presupuesto'});
  await sleep(400);
  await shot(`presupuesto-vacio-${width}-${theme}`);
  pushMeasure({screen: 'presupuesto-vacio', phase, theme, width, height, ...await budgetMeasure()});
  await closeDialog();

  // ── Alta de oportunidad: campos primero y aviso legal ──────────────────
  await go('/pipeline', `document.querySelector('section[aria-label="Pipeline"]')`);
  await setTheme(theme); await sleep(600);
  await clickButton('Nueva oportunidad');
  await waitFor(`document.querySelector('[role="dialog"] input[name="name"]')`, {label: 'alta de oportunidad'});
  await sleep(400);
  await shot(`oportunidad-alta-${width}-${theme}`);
  pushMeasure({screen: 'oportunidad-alta', phase, theme, width, height, ...await opportunityMeasure()});
  const detail = await evaluate(`(()=>{const details=document.querySelector('[role="dialog"] details');if(!details)return false;details.open=true;details.scrollIntoView({block:'center'});return true;})()`);
  if (detail) {
    await sleep(400);
    await shot(`oportunidad-privacidad-${width}-${theme}`);
    pushMeasure({screen: 'oportunidad-privacidad', phase, theme, width, height, ...await opportunityMeasure()});
  }
  await closeDialog();
}

writeFileSync(resolve(out, `medidas-${phase}.json`), JSON.stringify(measures, null, 1));
cdp.close();
chrome.close();
console.log(`Evidencia COM #150 (${phase}) en ${out}`);
