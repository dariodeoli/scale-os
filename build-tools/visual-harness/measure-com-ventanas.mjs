#!/usr/bin/env node
/*
 * Medición del pase de ventanas (#105, alcance SOS-COM): peso del payload por
 * lista (con y sin `?limit`) y filas montadas en pantalla, más capturas de la
 * barra de ventana.
 *
 * Requisitos: stack local de COM (`e2e-com-stack.mjs`) con datos de volumen y
 * `.next` construido.
 *
 * Uso: node build-tools/visual-harness/measure-com-ventanas.mjs
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(repo, 'docs/qa/ventanas-com');
mkdirSync(out, {recursive: true});
const session = Object.fromEntries(readFileSync(resolve(repo, 'work/visual-harness/com-qa-session.txt'), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = session.BASE;

// Listas medidas: ruta del endpoint (sin y con ventana) + campos del contrato.
const lists = [
  ['leads', '/core-api/api/agency/leads', 'fields=id,name,email,phone,stage,amount,currency,probability,notes,client_id', '&limit=300', null],
  ['budgets', '/core-api/api/agency/budgets', 'fields=id,number,title,status,currency,subtotal,total,valid_until,item_count,client_name', '&limit=60', null],
  ['clients', '/core-api/api/agency/clients', 'fields=id,name,email,phone,tax_id,created_at,logo_url,color_key,active,lifecycle_status,has_recurring_price', '&limit=120', ''],
  ['plans', '/core-api/api/agency/plans', 'fields=id,name,currency,items,notes,active', '&limit=60', null],
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
const shot = async (name) => {
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 72});
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`captura ${name}.jpg`);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

// Peso del payload: mismo endpoint con y sin ventana (bytes de la respuesta).
const pesos = [];
for (const [label, path, fields, window, sinProyeccion] of lists) {
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: `${BASE}/resumen`});
  await sleep(2600);
  const medir = async (url) => {
    const {data} = await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});
    void data;
    return evaluate(`fetch(${JSON.stringify(url)},{credentials:'include'}).then(async r=>{const text=await r.text();const body=JSON.parse(text);const key=Object.keys(body).find(k=>Array.isArray(body[k]));return {bytes:new Blob([text]).size,filas:Array.isArray(body[key])?body[key].length:0,total:body.page?.total??null,hasMore:body.page?.hasMore??null};})`);
  };
  const completo = await medir(`${path}?${fields}`);
  const ventana = await medir(`${path}?${fields}${window}`);
  // Sin proyección: cuánto pesaba la ficha completa (solo donde aplica).
  const crudo = sinProyeccion === null ? null : await medir(`${path}?limit=1`.replace('limit=1', ''));
  pesos.push({lista: label, sinProyeccion: crudo, sinVentana: completo, conVentana: ventana});
  console.log(`${label}: sin ventana ${completo.bytes} B (${completo.filas} filas) → con ventana ${ventana.bytes} B (${ventana.filas} filas, total ${ventana.total})${crudo ? ` · sin proyección ${crudo.bytes} B (${crudo.filas} filas)` : ''}`);
}
writeFileSync(resolve(out, 'pesos.json'), JSON.stringify(pesos, null, 1));

// Filas montadas por pantalla (con ventana) + capturas de la barra.
const pantallas = [['clientes', '/clientes'], ['presupuestos', '/presupuestos'], ['pipeline', '/pipeline'], ['planes', '/presupuestos/planes']];
const montadas = {};
for (const [theme, width, height] of [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
  for (const [slug, path] of pantallas) {
    await send('Page.navigate', {url: BASE + path});
    await sleep(4600);
    await evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)});}catch{}document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
    await sleep(700);
    if (width === 1440 && theme === 'light') {
      montadas[slug] = await evaluate(`(()=>{
        const rows=[...document.querySelectorAll('[role="table"] [role="row"], .client-hub-card, .budget-hub-card, [aria-label$="oportunidades"]>article')];
        const enTabla=[...document.querySelectorAll('[role="table"] [role="row"]')].length;
        const tarjetas=[...document.querySelectorAll('.client-hub-card, .budget-hub-card')].length;
        const oportunidades=[...document.querySelectorAll('[aria-label$="oportunidades"]>article')].length;
        return {filas:rows.length,enTabla,tarjetas,oportunidades,barra:document.body.textContent.includes('Ver más')};
      })()`);
    }
    await shot(`ventana-${slug}-${width}-${theme}`);
  }
}
writeFileSync(resolve(out, 'montadas.json'), JSON.stringify(montadas, null, 1));
console.log(JSON.stringify(montadas, null, 1));

cdp.close();
chrome.close();
console.log(`Evidencia en ${out}`);
