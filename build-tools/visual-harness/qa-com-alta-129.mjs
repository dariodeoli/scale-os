#!/usr/bin/env node
/*
 * Evidencia y QA del alta manual de clientes (Refs #129): «Guardar y crear
 * otro» con reenfoque, RUC/razón social manuales con las reglas del modo RUC,
 * validación visible, responsive 390/768 claro-oscuro y PDP intacto para los
 * roles sin gestión.
 *
 * Requisitos: stack local de COM (`e2e-com-stack.mjs`) levantado y `.next`
 * construido. Salida: docs/qa/alta-129/ + informe.json.
 * Uso: node build-tools/visual-harness/qa-com-alta-129.mjs
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(repo, 'docs/qa/alta-129');
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
const waitFor = async (expression, {timeout = 20000, label = ''} = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return true;
    await sleep(180);
  }
  throw new Error(`timeout esperando ${label || expression}`);
};
const setTheme = (theme) => evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)});}catch{}document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
const setViewport = (width, height) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
const shot = async (name) => {
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 72});
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
};
const go = async (path, ready) => {await send('Page.navigate', {url: BASE + path}); await sleep(3000); if (ready) await waitFor(ready, {label: ready});};
const clickText = (label) => evaluate(`(()=>{const target=[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim().includes(${JSON.stringify(label)}));if(!target)return false;target.click();return true;})()`);
const fill = (name, value) => evaluate(`(()=>{const input=document.querySelector('input[name="'+${JSON.stringify(name)}+'"]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
const dialogText = () => evaluate(`document.querySelector('[role="dialog"]')?.innerText||''`);
const openManual = async () => {
  await clickText('Nuevo cliente');
  await waitFor(`document.querySelector('[role="dialog"]')`, {label: 'alta de cliente'});
  await sleep(500);
  await clickText('Carga manual');
  await waitFor(`document.querySelector('input[name="tax_id"]')`, {label: 'carga manual'});
  await sleep(300);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

const report = {captures: [], flows: {}, consoleErrors: []};
cdp.on('Runtime.consoleAPICalled', ({type, args}) => {if (type === 'error') report.consoleErrors.push(args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));});

try {
  // ── Capturas del formulario en 390/768, claro/oscuro ────────────────────
  for (const [theme, width, height] of [['light', 390, 844], ['dark', 390, 844], ['light', 768, 1024], ['dark', 768, 1024]]) {
    await setViewport(width, height);
    await go('/clientes', `document.body.textContent.includes('Clientes')`);
    await setTheme(theme); await sleep(400);
    await openManual();
    report.captures.push(`alta-manual-${width}-${theme}`);
    await shot(`alta-manual-${width}-${theme}`);
    const metrics = await evaluate(`(()=>{const rect=(el)=>{const r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};};return {overflowX:document.documentElement.scrollWidth-window.innerWidth,name:rect(document.querySelector('input[name="name"]')),ruc:rect(document.querySelector('input[name="tax_id"]')),legal:rect(document.querySelector('input[name="legal_name"]')),buttons:[...document.querySelectorAll('[role="dialog"] .dialog-actions button')].map(b=>({t:b.textContent.trim(),...rect(b)}))};})()`);
    report.flows[`metricas-${width}-${theme}`] = metrics;
    // Escape cierra y el foco vuelve al disparador.
    await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27});
    await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27});
    await sleep(400);
    report.flows[`escape-${width}-${theme}`] = await evaluate(`document.querySelectorAll('[role="dialog"]').length===0`);
  }

  // ── Flujo funcional a 390 claro (datos únicos por corrida) ──────────────
  const run = Date.now().toString().slice(-6);
  const runName = (suffix) => `QA Alta ${run}-${suffix}`;
  const runRuc = `80${run}`;
  await setViewport(390, 844);
  await go('/clientes', `document.body.textContent.includes('Clientes')`);
  await setTheme('light'); await sleep(400);
  await openManual();
  await fill('name', runName('Serie 1'));
  await fill('tax_id', runRuc);
  await fill('legal_name', `QA Alta ${run} S.A.`);
  await clickText('Guardar y crear otro');
  await waitFor(`document.querySelector('[role="dialog"]')?.innerText.includes('creado. Podés cargar el siguiente')`, {label: 'aviso de creación'});
  await sleep(400);
  const serial = await evaluate(`(()=>{const name=document.querySelector('input[name="name"]');return {modalOpen:Boolean(document.querySelector('[role="dialog"]')),notice:document.querySelector('[role="dialog"]')?.innerText.includes('creado. Podés cargar el siguiente'),nameValue:name?.value??null,focusOnName:document.activeElement===name,rucValue:document.querySelector('input[name="tax_id"]')?.value??null,legalValue:document.querySelector('input[name="legal_name"]')?.value??null};})()`);
  report.flows.serial = serial;
  await shot('alta-serie-aviso-390-light');
  // Segunda alta con guardado simple: cierra y queda en el directorio.
  await fill('name', runName('Serie 2'));
  await clickText('Crear cliente');
  await waitFor(`!document.querySelector('[role="dialog"]')`, {label: 'cierre del diálogo'});
  await sleep(600);
  const created = await evaluate(`fetch('/core-api/api/agency/clients?fields=id,name,email,phone,tax_id,legal_name',{credentials:'same-origin'}).then(r=>r.json()).then(d=>(d.clients||[]).filter(c=>String(c.name).startsWith('QA Alta ${run}')))`);
  report.flows.created = created;
  report.flows.createdFindings = created.map(c=>({name:c.name,tax_id:c.tax_id,legal_name:c.legal_name}));
  await setTheme('light');
  await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Buscar clientes"]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(input,${JSON.stringify(`QA Alta ${run}-Serie 2`)});input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(600);
  await shot('alta-serie-directorio-390-light');
  await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Buscar clientes"]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);

  // ── Validaciones visibles ────────────────────────────────────────────────
  await openManual();
  await clickText('Crear cliente');
  await sleep(600);
  report.flows.errorNombre = await dialogText();
  await shot('alta-error-nombre-390-light');
  await fill('name', 'QA RUC inválido');
  await fill('tax_id', 'ABC');
  await clickText('Crear cliente');
  await sleep(600);
  report.flows.errorRuc = await dialogText();
  await shot('alta-error-ruc-390-light');
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27});
  await sleep(400);

  // ── PDP intacto: un rol sin gestión no ve el alta ni el contacto ────────
  await evaluate(`fetch('/core-api/api/demo/role',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'editor'})}).then(r=>r.ok)`);
  await go('/clientes', `document.body.textContent.includes('Clientes')`);
  await setTheme('light'); await sleep(1800);
  report.flows.editor = await evaluate(`({createButton:document.body.textContent.includes('Nuevo cliente'),masked:/Reservad/.test(document.body.textContent),placeholder:document.querySelector('input[aria-label="Buscar clientes"]')?.placeholder})`);
  await shot('alta-editor-sin-alta-390-light');
  await evaluate(`fetch('/core-api/api/demo/role',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'owner'})})`);
} catch (cause) {
  report.fatal = cause instanceof Error ? cause.stack : String(cause);
}

writeFileSync(resolve(out, 'informe.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
cdp.close();
chrome.close();
