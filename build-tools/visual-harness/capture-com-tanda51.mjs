#!/usr/bin/env node
/*
 * Evidencia visual de la tanda §15 (owncoding-ui v0.51.0) en la vertical COM
 * (#85): Clientes, Pipeline, Presupuestos, Planes y Métricas en claro/oscuro
 * (1440) y mobile (390), más el estado de error con reintento de Clientes.
 *
 * Requisitos: el stack local de COM (`e2e-com-stack.mjs`) levantado (deja la
 * sesión en work/visual-harness/com-qa-session.txt) y `.next` construido.
 *
 * Uso: node build-tools/visual-harness/capture-com-tanda51.mjs [salida]
 *      (por defecto docs/qa/tanda51-com)
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(repo, process.argv[2] || 'docs/qa/tanda51-com');
mkdirSync(out, {recursive: true});
const session = Object.fromEntries(readFileSync(resolve(repo, 'work/visual-harness/com-qa-session.txt'), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = session.BASE;

const screens = [
  ['clientes', '/clientes'],
  ['pipeline', '/pipeline'],
  ['presupuestos', '/presupuestos'],
  ['planes', '/presupuestos/planes'],
  ['metricas', '/pipeline/metricas'],
];

const chrome = await launchChrome();
const cdp = await openTarget(chrome.port);
const send = (method, params = {}) => cdp.send(method, params);
const evaluate = async (expression) => {
  const {result, exceptionDetails} = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const setTheme = (theme) => evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)});}catch{}document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
// JPEG de viewport: evidencia legible sin inflar el repo (precedente de QA).
const shot = async (name) => {
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 72});
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`captura ${name}.jpg`);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
    for (const [slug, path] of screens) {
      await send('Page.navigate', {url: BASE + path});
      await sleep(3200);
      await setTheme(theme);
      await sleep(900);
      await shot(`${slug}-${width}-${theme}`);
    }
  }
}

// Estado de error con reintento (regla §15.3): el directorio de clientes no
// puede leer su lista y muestra el estado honesto con «Reintentar».
await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
await send('Network.setBlockedURLs', {urls: ['*/api/agency/clients*']});
await send('Page.navigate', {url: `${BASE}/clientes`});
await sleep(3600);
await setTheme('light');
await sleep(600);
await shot('clientes-error-light');
await send('Network.setBlockedURLs', {urls: []});

// Error de métricas con reintento (regla §15.3): la lectura falla y la pantalla
// lo dice con su mensaje real, sin inventar totales.
await send('Network.setBlockedURLs', {urls: ['*/api/metrics*']});
await send('Page.navigate', {url: `${BASE}/pipeline/metricas`});
await sleep(3600);
await setTheme('light');
await sleep(600);
await shot('metricas-error-light');
await send('Network.setBlockedURLs', {urls: []});

// Etapas del pipeline caídas (regla §15.1): el tablero sigue y avisa con reintento.
await send('Network.setBlockedURLs', {urls: ['*/api/agency/pipeline-stages*']});
await send('Page.navigate', {url: `${BASE}/pipeline`});
await sleep(3600);
await setTheme('light');
await sleep(600);
await shot('pipeline-etapas-warning-light');
await send('Network.setBlockedURLs', {urls: []});

cdp.close();
chrome.close();
console.log(`Evidencia en ${out}`);
