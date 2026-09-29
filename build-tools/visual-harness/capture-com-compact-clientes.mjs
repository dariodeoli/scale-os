#!/usr/bin/env node
/*
 * Evidencia del pase «Clientes compacto» (#91): capturas antes/después en
 * 1440×900 y 390×844 (claro/oscuro) + medición del header y de los KPIs.
 *
 * Requisitos: el stack local de COM (`e2e-com-stack.mjs`) levantado (deja la
 * sesión en work/visual-harness/com-qa-session.txt) y `.next` construido.
 *
 * Uso: node build-tools/visual-harness/capture-com-compact-clientes.mjs antes|despues
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const phase = process.argv[2] === 'despues' ? 'despues' : 'antes';
const out = resolve(repo, 'docs/qa/compact-clientes');
mkdirSync(out, {recursive: true});
const session = Object.fromEntries(readFileSync(resolve(repo, 'work/visual-harness/com-qa-session.txt'), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = session.BASE;

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
const shot = async (name) => {
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 72});
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`captura ${name}.jpg`);
};
// Medidas del pase: fila del header (toolbar), franja de KPIs y contenido
// visible arriba del pliegue (filas de clientes).
const MEDIR = `(()=>{
 const rect=(node)=>{const r=node.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height),width:Math.round(r.width)};};
 const section=document.querySelector('section[aria-label="Directorio de clientes"]');
 const strip=section?section.firstElementChild:null;
 const cards=strip?[...strip.children].map(node=>rect(node)):[];
 const toolbar=document.querySelector('.client-directory-toolbar');
 const header=document.querySelector('.workspace-page-header');
 const rows=[...document.querySelectorAll('.client-directory-table [role="row"], .client-hub-card')];
 const fold=window.innerHeight;
 return {
  header: header?rect(header):null,
  toolbar: toolbar?rect(toolbar):null,
  kpiStrip: strip?rect(strip):null,
  kpiCards: cards,
  firstRowTop: rows.length?Math.round(rows[0].getBoundingClientRect().top):null,
  rowsAboveFold: rows.filter(node=>node.getBoundingClientRect().bottom<=fold).length,
  rowsTotal: rows.length,
 };
})()`;

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

const metrics = {};
for (const [theme, width, height] of [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
  await send('Page.navigate', {url: `${BASE}/clientes`});
  await sleep(3400);
  await setTheme(theme);
  await sleep(900);
  metrics[`${width}-${theme}`] = await evaluate(MEDIR);
  await shot(`${phase}-clientes-${width}-${theme}`);
}
console.log(JSON.stringify(metrics, null, 1));
writeFileSync(resolve(out, `${phase}-medidas.json`), JSON.stringify(metrics, null, 1));

cdp.close();
chrome.close();
console.log(`Evidencia ${phase} en ${out}`);
