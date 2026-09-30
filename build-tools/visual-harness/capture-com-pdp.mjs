#!/usr/bin/env node
/*
 * Evidencia PDP de Comercial (Ley 7593/2025, Refs #114).
 *
 * Capturas claro/oscuro en 1440×900 y 390×844 de lo tocado por el issue:
 *   - Pipeline: tarjeta con la oposición al contacto y diálogo de oportunidad
 *     con el aviso de finalidad compartido + casilla «No contactar» (sin
 *     premarcar en las altas nuevas).
 *   - Clientes: directorio minimizado para un rol que no gestiona clientes
 *     (contacto reservado) y aviso de finalidad en el editor de la ficha.
 *
 * Requisitos: el stack local de COM (`e2e-com-stack.mjs`) levantado — deja la
 * sesión en work/visual-harness/com-qa-session.txt — y `.next` construido.
 * Uso: node build-tools/visual-harness/capture-com-pdp.mjs
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(repo, 'docs/qa/pdp-com');
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
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`captura ${name}.jpg`);
};
const setViewport = (width, height) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
const go = async (path, ready) => {await send('Page.navigate', {url: BASE + path}); await sleep(3200); if (ready) await waitFor(ready, {label: ready});};
const api = async (path, method = 'GET', payload) => evaluate(`fetch('/core-api/api${path}',{method:${JSON.stringify(method)},credentials:'same-origin',${payload ? `headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify(payload)}),` : ''}}).then(async r=>({status:r.status,data:await r.json().catch(()=>null)}))`);
const clickByText = (label) => evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent.includes(${JSON.stringify(label)}));if(!button)return false;button.click();return true;})()`);

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

// Datos mínimos de la evidencia: una oportunidad con oposición y un cliente
// con contacto real (el seed del demo puede no traerlos).
await go('/pipeline', `document.body.textContent.includes('Oportunidades abiertas')`);
const leads = await api('/agency/leads');
if (!(leads.data?.records || []).some((row) => row.do_not_contact === true)) {
  await api('/agency/leads', 'POST', {name: 'Prospecto con oposición', do_not_contact: true, amount: 1500000, currency: 'PYG', probability: 30, notes: 'Pidió no ser contactado: conservamos el registro sin iniciar contacto.'});
}
const clients = await api('/agency/clients?limit=1');
const firstClient = clients.data?.clients?.[0];
if (firstClient && !firstClient.contact_restricted && !firstClient.email) {
  await api(`/agency/clients/${firstClient.id}`, 'PATCH', {name: firstClient.name, email: 'contacto@cliente-demo.example', phone: '+595 981 234 567', tax_id: '80012345-6'});
}

for (const [theme, width, height] of [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
  await setViewport(width, height);

  // Pipeline: tablero con la tarjeta en oposición y diálogo de alta.
  await go('/pipeline', `document.body.textContent.includes('Oportunidades abiertas')`);
  await setTheme(theme); await sleep(900);
  await shot(`pipeline-tablero-${width}-${theme}`);
  await clickByText('Nueva oportunidad');
  await waitFor(`document.querySelector('[data-testid="aviso-privacidad"]')`, {label: 'aviso en el diálogo de oportunidad'});
  await sleep(500);
  await shot(`pipeline-dialogo-${width}-${theme}`);

  // Clientes (owner): editor con aviso de finalidad y alta con el mismo aviso.
  await go('/clientes', `document.body.textContent.includes('Clientes')`);
  await setTheme(theme); await sleep(900);
  await evaluate(`(()=>{const button=document.querySelector('button[aria-label^="Editar "]');if(!button)return false;button.click();return true;})()`);
  await waitFor(`document.querySelector('[role="dialog"] [data-testid="aviso-privacidad"]')`, {label: 'aviso del editor de cliente'});
  await sleep(500);
  await shot(`clientes-editor-${width}-${theme}`);
  await go('/clientes', `document.body.textContent.includes('Clientes')`);
  await setTheme(theme); await sleep(500);
  await clickByText('Nuevo cliente');
  await waitFor(`document.querySelector('[role="dialog"] [data-testid="aviso-privacidad"]')`, {label: 'aviso del alta de cliente'});
  await sleep(500);
  await shot(`clientes-alta-${width}-${theme}`);
}

// Clientes (rol editor): el API minimiza el contacto y la UI lo declara en el
// directorio y en la ficha lateral.
await api('/demo/role', 'POST', {role: 'editor'});
for (const [theme, width, height] of [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
  await setViewport(width, height);
  await go('/clientes', `document.body.textContent.includes('Clientes')`);
  await setTheme(theme); await sleep(900);
  await shot(`clientes-reservado-${width}-${theme}`);
  await evaluate(`(()=>{const button=document.querySelector('button[aria-label^="Abrir ficha"]');if(!button)return false;button.click();return true;})()`);
  await waitFor(`document.querySelector('[role="dialog"]')`, {label: 'ficha del cliente'});
  await sleep(900);
  await shot(`clientes-ficha-${width}-${theme}`);
}
await api('/demo/role', 'POST', {role: 'owner'});

cdp.close();
chrome.close();
console.log(`Evidencia PDP de Comercial en ${out}`);
