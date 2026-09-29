#!/usr/bin/env node
/*
 * Evidencia del pase «Compactación del resto de Comercial» (#93): capturas
 * antes/después en 1440×900 y 390×844 (claro/oscuro) + medición de la cabecera,
 * las franjas y el inicio del contenido real de Resumen, Pipeline, Métricas,
 * Presupuestos y Planes.
 *
 * Requisitos: el stack local de COM (`e2e-com-stack.mjs`) levantado (deja la
 * sesión en work/visual-harness/com-qa-session.txt) y `.next` construido.
 *
 * Uso: node build-tools/visual-harness/capture-com-compact-com.mjs antes|despues
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const phase = process.argv[2] === 'antes' ? 'antes' : 'despues';
const out = resolve(repo, 'docs/qa/compact-com');
mkdirSync(out, {recursive: true});
const session = Object.fromEntries(readFileSync(resolve(repo, 'work/visual-harness/com-qa-session.txt'), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = session.BASE;

// Cada pantalla: ruta + los bloques que el pase mide (selector → etiqueta).
const screens = [
  ['resumen', '/resumen', [
    ['.workspace-page-header', 'header'],
    ['.control-signals', 'signals'],
    ['.commercial-summary', 'comercial'],
    ['.financial-summary:not(.commercial-summary)', 'finanzas'],
    ['.financial-summary:not(.commercial-summary) .finance-compare', 'finanzas·comparativa'],
    ['.due-alert', 'vencimientos'],
    ['section[aria-label="Piezas por etapa"]', 'piezas'],
    ['.metrics.operational-metrics', 'metricas operativas'],
  ]],
  ['pipeline', '/pipeline', [
    ['.workspace-page-header', 'header'],
    ['nav.section-tabs', 'tabs'],
    ['[aria-label="Resumen del pipeline"]', 'kpis'],
    ['[aria-label="Totales por etapa"]', 'totales'],
    ['[aria-label="Pipeline"] [aria-label$="oportunidades"]', 'tablero'],
  ]],
  ['metricas', '/pipeline/metricas', [
    ['.workspace-page-header', 'header'],
    ['nav.section-tabs', 'tabs'],
    ['section[aria-label="Métricas y crecimiento"] > *', 'tablero'],
    ['[role="img"]', 'grafico'],
    ['section[aria-label="Métricas y crecimiento"] [role="region"], section[aria-label="Métricas y crecimiento"] details', 'datos diarios'],
  ]],
  ['presupuestos', '/presupuestos', [
    ['.workspace-page-header', 'header'],
    ['nav.section-tabs', 'tabs'],
    ['[aria-label="Métricas de presupuestos"]', 'kpis'],
    ['.bulk-bar', 'lote'],
    ['[role="table"] [role="row"]', 'fila'],
  ]],
  ['planes', '/presupuestos/planes', [
    ['.workspace-page-header', 'header'],
    ['nav.section-tabs', 'tabs'],
    ['[aria-label="Métricas de planes"]', 'kpis'],
    ['section[aria-label="Planes reutilizables"] [role="region"]', 'comparador'],
  ]],
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
const shot = async (name) => {
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 72});
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`captura ${name}.jpg`);
};
const MEDIR = (blocks) => `(()=>{
 const rect=(node)=>{const r=node.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height),width:Math.round(r.width)};};
 const nodes=${JSON.stringify(blocks)}.map(([selector,label])=>{const node=document.querySelector(selector);return {label,selector,rect:node?rect(node):null};});
 const fold=window.innerHeight;
 const rowSelectors=['[role="table"] [role="row"]','.client-hub-card','[aria-label$="oportunidades"]>article','[aria-label="Totales por etapa"]>article','tbody tr'];
 const rows=rowSelectors.flatMap(selector=>[...document.querySelectorAll(selector)]).filter((node,index,list)=>list.indexOf(node)===index);
 return {blocks:nodes,rowsAboveFold:rows.filter(node=>node.getBoundingClientRect().bottom<=fold).length,rowsTotal:rows.length};
})()`;

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

const metrics = {};
for (const [theme, width, height] of [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
  for (const [slug, path, blocks] of screens) {
    await send('Page.navigate', {url: BASE + path});
    await sleep(3400);
    await setTheme(theme);
    await sleep(800);
    metrics[`${slug}-${width}-${theme}`] = await evaluate(MEDIR(blocks));
    await shot(`${phase}-${slug}-${width}-${theme}`);
  }
}
writeFileSync(resolve(out, `${phase}-medidas.json`), JSON.stringify(metrics, null, 1));

cdp.close();
chrome.close();
console.log(`Evidencia ${phase} en ${out}`);
