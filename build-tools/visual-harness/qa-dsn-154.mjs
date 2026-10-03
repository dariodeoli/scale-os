/*
 * Testeos #154 — vertical DSN sobre producción v1.0.169.
 * Shell/nav (riel, drawer, activos), paleta ⌘K, ayuda por módulo, landing,
 * a11y, responsive 390/430/1440, claro/oscuro. Capturas en docs/qa/testeos-169.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const BASE = 'https://sistema.scaleparaguay.com';
const OUT = resolve(repo, 'docs/qa/testeos-169');
mkdirSync(OUT, {recursive: true});

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const results = [];
const log = (step, data) => { results.push({step, ok: data?.ok !== false, data}); console.log(step, JSON.stringify(data)); return data; };

const chrome = await launchChrome({chromePath: process.env.CHROME_PATH || defaultChromePath});
const cdp = await openTarget(chrome.port);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');

let width = 1440;
let theme = 'light';
async function setWidth(next) {
  width = next;
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: next, height: next < 768 ? 844 : 900, deviceScaleFactor: 1, mobile: next < 768});
  await sleep(300);
}
async function setTheme(next) {
  theme = next;
  await cdp.evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(next)});}catch{}${next === 'light' ? "document.documentElement.removeAttribute('data-theme')" : `document.documentElement.dataset.theme=${JSON.stringify(next)}`};})()`);
  await sleep(250);
}
async function goto(url, timeout = 30000) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', {url});
  await Promise.race([loaded, sleep(timeout)]);
  await sleep(900);
}
async function waitFor(fn, timeout = 15000, interval = 350) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { try { if (await cdp.evaluate(`(${fn})()`)) return true; } catch {} await sleep(interval); }
  return false;
}
const js = (expression) => cdp.evaluate(expression);
async function clickSelector(selector) {
  const ok = await cdp.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.scrollIntoView({block:'center'});el.click();return true;})()`);
  if (!ok) throw new Error(`no existe ${selector}`);
  await sleep(600);
}
async function escape() {
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await sleep(400);
}
async function shoot(name, {fullPage = false} = {}) {
  const height = fullPage ? Math.ceil(await js('document.documentElement.scrollHeight')) : (width < 768 ? 844 : 900);
  const shot = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: fullPage, clip: {x: 0, y: 0, width, height, scale: 1}});
  const file = join(OUT, `${name}-${width}-${theme}.png`);
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(`shot -> ${file}`);
  return file;
}
async function evidence(name, {fullPage = false} = {}) {
  for (const [w, t] of [[1440, 'light'], [1440, 'dark'], [430, 'light'], [430, 'dark'], [390, 'light'], [390, 'dark']]) {
    await setWidth(w); await setTheme(t); await shoot(name, {fullPage});
  }
  await setWidth(1440); await setTheme('light');
}
const overflow = () => js('({doc:document.documentElement.scrollWidth>document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})');

async function bootDemo() {
  await setWidth(1440); await setTheme('light');
  await goto(`${BASE}/demo`);
  const redirected = await waitFor(() => location.pathname.startsWith('/produccion'), 30000);
  await waitFor(() => document.body.innerText.length > 400, 25000);
  if (await waitFor(() => document.body.innerText.includes('Tu Demo está lista'), 8000)) {
    await cdp.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith('Explorar el Demo'));b?.click();})()`);
    await sleep(500);
  }
  log('demo', {ok: redirected, url: await js('location.href')});
}

async function shellChecks() {
  // Riel desktop + activo + mostrar/ocultar barra.
  await setWidth(1440); await setTheme('light');
  await goto(`${BASE}/produccion`);
  await waitFor(() => document.body.innerText.length > 400, 20000);
  const rail = await js(`(()=>{const link=[...document.querySelectorAll('nav a')].find(a=>/Producción/.test(a.textContent));return {activo:link?.getAttribute('aria-current')||null,visible:!!document.querySelector('button[aria-label="Colapsar barra lateral"]')};})()`);
  log('shell-riel', {ok: rail.visible, ...rail});
  for (const t of ['light', 'dark']) { await setWidth(1440); await setTheme(t); await shoot('shell-produccion-activo'); }

  try {
    await setWidth(1440); await setTheme('light');
    await clickSelector('button[aria-label="Colapsar barra lateral"]');
    const collapsed = await js(`(()=>{const btn=document.querySelector('button[aria-label="Expandir barra lateral"]');const bar=document.querySelector('.desktop-sidebar,.sidebar');return {boton:!!btn,ancho:bar?Math.round(bar.getBoundingClientRect().width):null,labels:document.querySelectorAll('.nav-label').length};})()`);
    log('shell-riel-colapsado', {ok: collapsed.boton && collapsed.labels === 0, ...collapsed});
    for (const t of ['light', 'dark']) { await setTheme(t); await shoot('shell-riel-colapsado'); }
    await setTheme('light');
    await clickSelector('button[aria-label="Expandir barra lateral"]');
  } catch (error) { log('shell-riel-colapsado', {ok: false, error: String(error.message || error)}); }

  // Drawer móvil 390/430: abrir, activo, targets, grupo, cerrar.
  for (const w of [390, 430]) {
    await setWidth(w); await setTheme('light');
    await clickSelector('button[aria-label="Abrir menú"]');
    const drawer = await waitFor(() => !!document.querySelector('[role="dialog"][aria-label="Menú de Scale OS"]'), 8000);
    const med = await js(`(()=>{const panel=document.querySelector('[role="dialog"][aria-label="Menú de Scale OS"]');if(!panel)return null;const targets=[...panel.querySelectorAll('a,button')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({h:Math.round(e.getBoundingClientRect().height),w:Math.round(e.getBoundingClientRect().width),label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,28)}));const activo=[...panel.querySelectorAll('[aria-current]')].map(e=>e.textContent.trim().slice(0,20));return {targets:targets.length,minH:Math.min(...targets.map(t=>t.h)),activo,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};})()`);
    log(`shell-drawer-${w}`, {ok: drawer && med && med.minH >= 44 && !med.overflow, ...med});
    for (const t of ['light', 'dark']) { await setTheme(t); await shoot(`shell-drawer-${w}`); }
    await setTheme('light');
    // Grupo dentro del drawer.
    const group = await js(`(()=>{const panel=document.querySelector('[role="dialog"][aria-label="Menú de Scale OS"]');const b=[...panel.querySelectorAll('button')].find(e=>/Flujo|Recursos|Finanzas/.test(e.textContent));b?.click();return b?b.textContent.trim().slice(0,20):null;})()`);
    await sleep(500);
    log(`shell-drawer-grupo-${w}`, {ok: !!group, grupo: group, leaves: await js(`document.querySelectorAll('[role="dialog"][aria-label="Menú de Scale OS"] a').length`)});
    for (const t of ['light', 'dark']) { await setTheme(t); await shoot(`shell-drawer-grupo-${w}`); }
    await setTheme('light');
    await escape();
  }
  await setWidth(1440);
}

async function paletteChecks() {
  await setWidth(1440); await setTheme('light');
  await goto(`${BASE}/produccion`);
  await waitFor(() => document.body.innerText.length > 400, 20000);
  // Atajo ⌘K real por teclado (Meta y, si no abre, Control).
  let opened = false;
  for (const modifiers of [4, 2]) {
    await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, modifiers});
    await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, modifiers});
    opened = await waitFor(() => !!document.querySelector('[role="dialog"] input'), 3000, 200);
    if (opened) break;
  }
  log('paleta-atajo', {ok: opened});
  if (!opened) { await clickSelector('button[aria-label="Buscar clientes, proyectos y órdenes"]').catch(() => {}); await waitFor(() => !!document.querySelector('[role="dialog"] input'), 5000); }
  await js(`document.querySelector('[role="dialog"] input')?.focus()`);
  await cdp.send('Input.insertText', {text: 'cli'});
  await waitFor(() => document.querySelectorAll('[role="dialog"] button,[role="dialog"] a').length >= 2, 12000);
  const palette = await js(`({dialogos:document.querySelectorAll('[role="dialog"]').length,resultados:document.querySelectorAll('[role="dialog"] button,[role="dialog"] a').length,grupo:document.body.innerText.includes('IR A')})`);
  log('paleta-resultados', {ok: palette.dialogos > 0 && palette.resultados >= 2, ...palette});
  await evidence('paleta-resultados');
  // Navegación real: bajar y abrir.
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40});
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40});
  await sleep(300);
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
  await sleep(1500);
  const nav = await js(`({url:location.pathname,dialogos:document.querySelectorAll('[role="dialog"]').length,activo:[...document.querySelectorAll('[aria-current]')].map(e=>e.textContent.trim().slice(0,20))})`);
  log('paleta-navegacion', {ok: nav.dialogos === 0 && (nav.url !== '/produccion' || nav.activo.length > 0), ...nav});
  await evidence('paleta-navegacion');
}

async function helpChecks() {
  await setWidth(1440); await setTheme('light');
  await goto(`${BASE}/clientes`);
  await waitFor(() => document.body.innerText.length > 400, 20000);
  await clickSelector('button[aria-label^="Guía del panel"]');
  const help = await waitFor(() => document.body.innerText.includes('Estado del sistema'), 8000);
  const enlaces = await js(`({status:!!document.querySelector('a[href="/status"]'),privacidad:!!document.querySelector('a[href="/privacidad"]'),resumen:document.body.innerText.includes('Directorio completo')})`);
  log('ayuda-modulo', {ok: help && enlaces.status && enlaces.privacidad, ...enlaces});
  await evidence('ayuda-modulo');
  await escape();
}

async function a11yChecks() {
  await setWidth(1440); await setTheme('light');
  await goto(`${BASE}/produccion`);
  await waitFor(() => document.body.innerText.length > 400, 20000);
  const a11y = await js(`(()=>{
    const imgs=[...document.querySelectorAll('img')].filter(i=>i.getBoundingClientRect().width>0);
    const sinAlt=imgs.filter(i=>!i.hasAttribute('alt')).length;
    const controles=[...document.querySelectorAll('button,a[href]')].filter(e=>e.getBoundingClientRect().width>0);
    const sinNombre=controles.filter(e=>!(e.getAttribute('aria-label')||e.textContent.trim()||e.getAttribute('title'))).length;
    return {imgs:imgs.length,sinAlt,controles:controles.length,sinNombre};
  })()`);
  log('a11y-nombres', {ok: a11y.sinAlt === 0 && a11y.sinNombre === 0, ...a11y});
  // Foco visible: Tab y captura del primer anillo.
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
  await sleep(300);
  const focus = await js(`(()=>{const el=document.activeElement;if(!el)return null;const s=getComputedStyle(el);return {tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,30),outline:s.outlineStyle,width:s.outlineWidth};})()`);
  log('a11y-foco', {ok: !!focus && focus.outline !== 'none', ...focus});
  await shoot('a11y-foco-tab');
  const overflow1440 = await overflow();
  log('responsive-1440', {ok: !overflow1440.doc, ...overflow1440});
  await setWidth(430);
  const overflow430 = await overflow();
  log('responsive-430', {ok: !overflow430.doc, ...overflow430});
  await shoot('responsive-430-shell');
  await setWidth(390);
  const overflow390 = await overflow();
  log('responsive-390', {ok: !overflow390.doc, ...overflow390});
  await shoot('responsive-390-shell');
}

async function landingChecks() {
  await setWidth(1440); await setTheme('light');
  await goto(`${BASE}/`);
  await waitFor(() => document.body.innerText.includes('Scale OS') && document.body.innerText.includes('Precio'), 20000);
  const overflow1440 = await overflow();
  log('landing-1440', {ok: !overflow1440.doc, ...overflow1440});
  await shoot('landing-1440', {fullPage: true});
  await setWidth(430);
  const overflow430 = await overflow();
  log('landing-430', {ok: !overflow430.doc, ...overflow430});
  await shoot('landing-430', {fullPage: true});
  await setWidth(390);
  const overflow390 = await overflow();
  const a11y = await js(`(()=>{const imgs=[...document.querySelectorAll('img')].filter(i=>i.getBoundingClientRect().width>0);return {sinAlt:imgs.filter(i=>!i.hasAttribute('alt')).length,imgs:imgs.length};})()`);
  log('landing-390', {ok: !overflow390.doc && a11y.sinAlt === 0, ...overflow390, ...a11y});
  await shoot('landing-390', {fullPage: true});
  await setWidth(1440);
}

try {
  await bootDemo();
  await shellChecks();
  await paletteChecks();
  await helpChecks();
  await a11yChecks();
  await landingChecks();
} catch (error) {
  log('fatal', {ok: false, error: String(error?.stack || error)});
} finally {
  const failed = results.filter((item) => !item.ok);
  console.log(`\nRESUMEN DSN #154: ${results.length - failed.length}/${results.length} OK`);
  for (const item of failed) console.log(`FALLÓ: ${item.step} ${JSON.stringify(item.data)}`);
  writeFileSync(resolve(repo, 'work/visual-harness/al4/testeos-169.json'), JSON.stringify(results, null, 2));
  cdp.close();
  await chrome.close();
}
