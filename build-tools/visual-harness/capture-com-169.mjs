#!/usr/bin/env node
/*
 * Recorrido de la campaña de testeos #154 (vertical COM) en PRODUCCIÓN
 * (v1.0.169): clientes, pipeline (columnas y dnd), presupuestos (consulta,
 * compositor y enlace público), planes, métricas y búsqueda global.
 *
 * Capturas 1440×900 y 390×844 en claro y oscuro + medidas crudas.
 * La sesión se crea con la demo de producción:
 *   work/visual-harness/prod-169-session.txt (BASE + SESSION)
 *
 * Uso: node build-tools/visual-harness/capture-com-169.mjs
 *      (WIDTHS=390 para retomar un ancho; SCREENS=clientes,presupuestos para acotar)
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(repo, 'docs/qa/testeos-169/prod');
mkdirSync(out, {recursive: true});
const sessionFile = process.env.QA_SESSION || 'prod-169-session.txt';
const session = Object.fromEntries(readFileSync(resolve(repo, `work/visual-harness/${sessionFile}`), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = session.BASE;

const chrome = await launchChrome();
const cdp = await openTarget(chrome.port);
const send = (method, params = {}) => Promise.race([
  cdp.send(method, params),
  new Promise((_, reject) => setTimeout(() => reject(new Error(`CDP ${method} sin respuesta`)), 20000)),
]);
const evaluate = async (expression) => {
  const {result, exceptionDetails} = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description || ''));
  return result.value;
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const waitFor = async (expression, {timeout = 25000, label = ''} = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return true;
    await sleep(200);
  }
  throw new Error(`timeout esperando ${label || expression}`);
};
const setTheme = (theme) => evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(theme)});}catch{}document.documentElement.dataset.theme=${JSON.stringify(theme)};return true;})()`);
const setViewport = (width, height) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768});
const shot = async (name) => {
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 70});
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`captura ${name}.jpg`);
};
const go = async (path, ready) => {await send('Page.navigate', {url: BASE + path}); await sleep(3000); if (ready) await waitFor(ready, {label: ready});};
const clickButton = (label, scope = 'document') => evaluate(`(()=>{const root=${scope === 'document' ? 'document' : `document.querySelector(${JSON.stringify(scope)})`};if(!root)return false;const button=[...root.querySelectorAll('button')].find(node=>node.textContent.replace(/\\s+/g,' ').trim()===${JSON.stringify(label)});if(!button)return false;button.scrollIntoView({block:'center'});button.click();return true;})()`);
const closeDialog = async () => {
  await evaluate(`(()=>{const button=document.querySelector('[role=dialog] .dialog-heading button[aria-label="Cerrar"],.unified-dialog .dialog-heading button[aria-label="Cerrar"]');if(button)button.click();return true;})()`);
  await waitFor(`!document.querySelector('[role=dialog]')`, {label: 'cierre del diálogo'}).catch(() => {});
};
const overflow = () => evaluate(`Math.max(0,document.documentElement.scrollWidth-window.innerWidth)`);

const measuresPath = resolve(repo, 'docs/qa/testeos-169/medidas-prod.json');
const measures = existsSync(measuresPath) ? JSON.parse(readFileSync(measuresPath, 'utf8')) : [];
const pushMeasure = (entry) => {
  const key = (item) => `${item.screen}|${item.theme}|${item.width}`;
  const index = measures.findIndex((item) => key(item) === key(entry));
  if (index >= 0) measures[index] = entry;
  else measures.push(entry);
  writeFileSync(measuresPath, JSON.stringify(measures, null, 1));
};
const widthFilter = process.env.WIDTHS ? new Set(process.env.WIDTHS.split(',').map(Number)) : null;
const screenFilter = process.env.SCREENS ? new Set(process.env.SCREENS.split(',')) : null;
const combos = [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844], ['dark', 390, 844]].filter(([, width]) => !widthFilter || widthFilter.has(width));
const want = (screen) => !screenFilter || screenFilter.has(screen);
const safely = async (screen, theme, width, height, task) => {
  try {
    const data = await task();
    pushMeasure({screen, theme, width, height, ok: true, ...data});
  } catch (error) {
    console.error(`✗ ${screen} ${width} ${theme}: ${error.message}`);
    pushMeasure({screen, theme, width, height, ok: false, error: error.message});
  }
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true, secure: true});

const dragCard = async () => {
  const geometry = await evaluate(`(()=>{const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
   const card=document.querySelector('section[aria-label*="oportunidades"] article');
   if(!card)return null;card.scrollIntoView({block:'center',inline:'center'});
   const current=card.closest('section[aria-label*="oportunidades"]');
   const target=[...document.querySelectorAll('section[aria-label*="oportunidades"]')].find(node=>node!==current);
   if(!target)return null;
   const grip=card.querySelector('button[title^="Mover"]');if(!grip)return null;
   const gr=grip.getBoundingClientRect(),tr=target.getBoundingClientRect();
   return {name:card.querySelector('b')?.textContent||'',fromColumn:current.getAttribute('aria-label')?.split(' ·')[0]||'',from:{x:Math.round(clamp(gr.x+gr.width/2,24,innerWidth-24)),y:Math.round(clamp(gr.y+gr.height/2,24,innerHeight-24))},to:{x:Math.round(clamp(tr.x+tr.width/2,24,innerWidth-24)),y:Math.round(clamp(tr.y+120,24,innerHeight-24))}};})()`);
  if (!geometry) throw new Error('sin tarjeta o asa para arrastrar');
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: geometry.from.x, y: geometry.from.y});
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: geometry.from.x, y: geometry.from.y, button: 'left', clickCount: 1, buttons: 1});
  for (let i = 1; i <= 16; i += 1) {
    const x = Math.round(geometry.from.x + (geometry.to.x - geometry.from.x) * i / 16);
    const y = Math.round(geometry.from.y + (geometry.to.y - geometry.from.y) * i / 16);
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y, button: 'left', buttons: 1});
    await sleep(18);
  }
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: geometry.to.x, y: geometry.to.y, button: 'left', buttons: 0});
  await sleep(1400);
  const moved = await evaluate(`(()=>{const card=[...document.querySelectorAll('section[aria-label*="oportunidades"] article')].find(node=>node.querySelector('b')?.textContent===${JSON.stringify(geometry.name)});return card?card.closest('section')?.getAttribute('aria-label')?.split(' ·')[0]:null;})()`);
  return {...geometry, toColumn: moved};
};

for (const [theme, width, height] of combos) {
  await setViewport(width, height);
  const tag = `${width}-${theme}`;

  if (want('clientes')) {
    await safely('clientes-directorio', theme, width, height, async () => {
      await go('/clientes', `document.querySelector('section[aria-label="Directorio de clientes"]')`);
      await setTheme(theme); await sleep(800);
      const total = await evaluate(`document.querySelectorAll('section[aria-label="Directorio de clientes"] [role="row"],section[aria-label="Directorio de clientes"] article').length`);
      const cards = await evaluate(`document.querySelectorAll('section[aria-label="Directorio de clientes"] article').length`);
      await shot(`clientes-directorio-${tag}`);
      return {total, cards, overflow: await overflow()};
    });
    await safely('clientes-vacio', theme, width, height, async () => {
      const typed = await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Buscar clientes"]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'zzz-sin-resultados-169');input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
      await sleep(1200);
      const empty = await evaluate(`/sin resultados|no se encontr|no hay clientes|nada para mostrar/i.test(document.body.innerText)`);
      await shot(`clientes-vacio-${tag}`);
      await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Buscar clientes"]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
      await sleep(900);
      return {typed, empty, overflow: await overflow()};
    });
    await safely('clientes-alta', theme, width, height, async () => {
      await setTheme(theme); await sleep(300);
      const opened = await clickButton('Nuevo cliente');
      if (opened) await waitFor(`document.querySelector('[role=dialog]')`, {label: 'alta de cliente'});
      // El alta abre con «Carga con IA / Carga manual» (#129): el formulario
      // manual es el que muestra los campos requeridos.
      await clickButton('Carga manual', '[role=dialog]');
      await waitFor(`document.querySelector('[role=dialog] input[name="name"]')`, {label: 'carga manual de cliente'});
      await sleep(500);
      const required = await evaluate(`document.querySelectorAll('[role=dialog] [aria-invalid="true"]').length`);
      await shot(`clientes-alta-${tag}`);
      await closeDialog();
      return {opened, required};
    });
    await safely('clientes-ficha', theme, width, height, async () => {
      await setTheme(theme); await sleep(300);
      await waitFor(`document.querySelectorAll('section[aria-label="Directorio de clientes"] article,section[aria-label="Directorio de clientes"] [role="row"]').length>0`, {label: 'filas de clientes'});
      let opened = await evaluate(`(()=>{const button=[...document.querySelectorAll('button[aria-label^="Abrir ficha"],button[aria-label*="ficha"]')][0];if(!button)return false;button.scrollIntoView({block:'center'});button.click();return true;})()`);
      if (!opened) {
        // En la vista de tarjetas la ficha puede vivir en el menú ⋯ (#140).
        await evaluate(`(()=>{const menu=document.querySelector('section[aria-label="Directorio de clientes"] button[aria-haspopup="menu"]');if(!menu)return false;menu.click();return true;})()`);
        await sleep(500);
        opened = await clickButton('Editar cliente') || await clickButton('Abrir ficha') || await clickButton('Ver ficha');
      }
      if (!opened) throw new Error('sin acción de ficha visible');
      await waitFor(`document.querySelector('[role=dialog]')`, {label: 'ficha de cliente'});
      await sleep(900);
      const hasAmounts = await evaluate(`/Gs\\.|USD|EUR/.test(document.querySelector('[role=dialog]')?.innerText||'')`);
      await shot(`clientes-ficha-${tag}`);
      await closeDialog();
      return {opened, hasAmounts};
    });
  }

  if (want('pipeline')) {
    await safely('pipeline-tablero', theme, width, height, async () => {
      await go('/pipeline', `document.querySelector('section[aria-label="Pipeline"] div[class*="overflow-x-auto"]')`);
      await setTheme(theme); await sleep(800);
      const columns = await evaluate(`document.querySelectorAll('section[aria-label*="oportunidades"]').length`);
      const board = await evaluate(`(()=>{const node=document.querySelector('section[aria-label="Pipeline"] div[class*="overflow-x-auto"]');return node?{scrollWidth:node.scrollWidth,clientWidth:node.clientWidth}:null;})()`);
      await shot(`pipeline-tablero-${tag}`);
      return {columns, board, overflow: await overflow()};
    });
    await safely('pipeline-dnd', theme, width, height, async () => {
      await setTheme(theme); await sleep(400);
      const move = await dragCard();
      const moved = move.fromColumn && move.toColumn && move.fromColumn !== move.toColumn;
      await shot(`pipeline-dnd-${tag}`);
      return {...move, moved};
    });
  }

  if (want('presupuestos')) {
    let sharedUrl = '';
    await safely('presupuestos-lista', theme, width, height, async () => {
      await go('/presupuestos', `document.querySelector('section[aria-label="Presupuestos"]')`);
      await setTheme(theme); await sleep(900);
      await waitFor(`[...document.querySelectorAll('button')].some(node=>node.getAttribute('aria-label')?.startsWith('Abrir presupuesto')||node.textContent.trim()==='Abrir presupuesto')`, {label: 'acciones de presupuesto'});
      const total = await evaluate(`document.querySelectorAll('section[aria-label="Presupuestos"] [role="row"],section[aria-label="Presupuestos"] article').length`);
      await shot(`presupuestos-lista-${tag}`);
      return {total, overflow: await overflow()};
    });
    await safely('presupuestos-consulta', theme, width, height, async () => {
      await setTheme(theme); await sleep(300);
      const opened = await evaluate(`(()=>{const candidates=[...document.querySelectorAll('button')].filter(node=>node.getAttribute('aria-label')?.startsWith('Abrir presupuesto')||node.textContent.trim()==='Abrir presupuesto');const button=candidates[0];if(!button)return false;button.scrollIntoView({block:'center'});button.click();return true;})()`);
      if (!opened) throw new Error('sin presupuesto para abrir');
      await waitFor(`document.querySelector('[role=dialog]')`, {label: 'diálogo de presupuesto'});
      await sleep(700);
      const consult = await evaluate(`!document.querySelector('[role=dialog] input[name="title"]')`);
      const terms = await evaluate(`Boolean(document.querySelector('[aria-label="Condiciones del enlace público"]'))`);
      await shot(`presupuestos-consulta-${tag}`);
      return {consult, terms};
    });
    await safely('presupuestos-enlace', theme, width, height, async () => {
      await clickButton('Habilitar enlace público', '[role=dialog]');
      await waitFor(`document.querySelector('[aria-label="Condiciones del enlace público"]')`, {label: 'condiciones del enlace'});
      await sleep(400);
      const conditions = await evaluate(`document.querySelector('[aria-label="Condiciones del enlace público"]').innerText.replace(/\\s+/g,' ').trim()`);
      await shot(`presupuestos-enlace-condiciones-${tag}`);
      await clickButton('Habilitar enlace', '[aria-label="Condiciones del enlace público"]');
      // En la demo el API bloquea compartir («El Demo no comparte datos
      // públicamente»): se captura el estado real en vez de esperar la URL.
      await Promise.race([
        waitFor(`[...document.querySelectorAll('[role=dialog] a')].some(node=>/\\/p\\//.test(node.getAttribute('href')||''))`, {label: 'URL pública', timeout: 8000}),
        waitFor(`Boolean(document.querySelector('[role=dialog] [role=alert]'))`, {label: 'aviso del demo', timeout: 8000}),
      ]).catch(() => {});
      await sleep(500);
      sharedUrl = await evaluate(`[...document.querySelectorAll('[role=dialog] a')].map(node=>node.getAttribute('href')).find(href=>/\\/p\\//.test(href||''))||''`);
      const demoBlocked = await evaluate(`/Demo no comparte|Demo no permite/.test(document.querySelector('[role=dialog] [role=alert]')?.innerText||'')`);
      await shot(`presupuestos-enlace-resultado-${tag}`);
      return {conditions: conditions.slice(0, 220), sharedUrl, demoBlocked};
    });
    await safely('presupuestos-compositor', theme, width, height, async () => {
      await clickButton('Editar presupuesto', '[role=dialog]');
      await waitFor(`document.querySelector('[role=dialog] input[name="title"]')`, {label: 'compositor'});
      await sleep(700);
      const options = await evaluate(`Boolean(document.querySelector('[role=dialog] details.quote-document-options'))`);
      const collapsed = await evaluate(`!document.querySelector('[role=dialog] details.quote-document-options')?.open`);
      await shot(`presupuestos-compositor-${tag}`);
      await evaluate(`(()=>{const details=document.querySelector('[role=dialog] details.quote-document-options');if(!details)return false;details.open=true;details.scrollIntoView({block:'center'});return true;})()`);
      await sleep(500);
      await shot(`presupuestos-opciones-${tag}`);
      await closeDialog();
      return {options, collapsed};
    });
    if (sharedUrl && want('presupuesto-publico')) {
      await safely('presupuesto-publico', theme, width, height, async () => {
        await send('Page.navigate', {url: sharedUrl});
        await sleep(2500);
        await setTheme(theme); await sleep(500);
        const status = await evaluate(`document.querySelector('main')?'ok':'sin main'`);
        const accept = await evaluate(`/Aceptar presupuesto|Aceptado|Vigencia finalizada|Vencido/.test(document.body.innerText)`);
        await shot(`presupuesto-publico-${tag}`);
        return {status, accept, overflow: await overflow()};
      });
      await safely('presupuestos-revocar', theme, width, height, async () => {
        await go('/presupuestos', `document.querySelector('section[aria-label="Presupuestos"]')`);
        await setTheme(theme); await sleep(600);
        await waitFor(`[...document.querySelectorAll('button')].some(node=>node.getAttribute('aria-label')?.startsWith('Abrir presupuesto')||node.textContent.trim()==='Abrir presupuesto')`, {label: 'acciones de presupuesto'});
        await evaluate(`(()=>{const candidates=[...document.querySelectorAll('button')].filter(node=>node.getAttribute('aria-label')?.startsWith('Abrir presupuesto')||node.textContent.trim()==='Abrir presupuesto');const button=candidates.find(node=>node.closest('article')?.textContent.includes(${JSON.stringify(session.BUDGET||'')}))||candidates[0];if(!button)return false;button.click();return true;})()`);
        await waitFor(`document.querySelector('[role=dialog]')`, {label: 'diálogo de presupuesto'});
        await sleep(600);
        const revoking = await clickButton('Desactivar enlace', '[role=dialog]');
        if (!revoking) throw new Error('el presupuesto abierto no es el compartido');
        await clickButton('Confirmar', '[role=dialog]');
        await sleep(900);
        const closed = await evaluate(`!/Desactivar enlace/.test(document.querySelector('[role=dialog]')?.innerText||'')&&/Habilitar enlace público/.test(document.querySelector('[role=dialog]')?.innerText||'')`);
        await closeDialog();
        return {revoked: closed};
      });
    }
  }

  if (want('planes')) {
    await safely('planes', theme, width, height, async () => {
      await go('/presupuestos/planes', `document.querySelector('section[aria-label="Planes reutilizables"]')`);
      await setTheme(theme); await sleep(800);
      const plans = await evaluate(`document.querySelectorAll('section[aria-label="Planes reutilizables"] table tbody tr,section[aria-label="Planes reutilizables"] article').length`);
      await shot(`planes-${tag}`);
      return {plans, overflow: await overflow()};
    });
  }

  if (want('metricas')) {
    await safely('metricas', theme, width, height, async () => {
      await go('/pipeline/metricas', `document.body.innerText.includes('Visitas y crecimiento')`);
      await setTheme(theme); await sleep(800);
      const events = await evaluate(`document.querySelector('[data-events]')?.getAttribute('data-events')||null`);
      await shot(`metricas-${tag}`);
      return {events, overflow: await overflow()};
    });
  }

  if (want('busqueda')) {
    await safely('busqueda-global', theme, width, height, async () => {
      await go('/pipeline', `document.querySelector('section[aria-label="Pipeline"]')`);
      await setTheme(theme); await sleep(500);
      const opened = await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>/Buscar en esta empresa/.test(node.getAttribute('aria-label')||''));if(!button)return false;button.click();return true;})()`);
      if (!opened) throw new Error('sin control de búsqueda');
      await waitFor(`document.querySelector('[role=dialog] input')`, {label: 'paleta'});
      await sleep(500);
      await shot(`busqueda-global-${tag}`);
      const typed = await evaluate(`(()=>{const input=document.querySelector('[role=dialog] input');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'Aurora');input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
      await sleep(1400);
      const text = await evaluate(`document.querySelector('[role=dialog]')?.innerText.replace(/\\s+/g,' ').trim()||''`);
      await shot(`busqueda-resultados-${tag}`);
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
      await sleep(400);
      return {typed, results: text.slice(0, 200)};
    });
  }
}

console.log(`Evidencia COM #154 (producción) en ${out}`);
cdp.close();
chrome.close();
