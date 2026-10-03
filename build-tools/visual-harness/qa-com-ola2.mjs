#!/usr/bin/env node
/*
 * QA ola 2 — Comercial (Refs #122): barrido móvil/tablet, oscuro, modales y
 * formularios en Clientes, Pipeline, Presupuestos, Planes y Resumen.
 *
 * Mide en la app real (stack e2e-com-stack.mjs) a 390×844 y 768×1024, claro y
 * oscuro:
 *   - desborde horizontal del documento y piezas que se salen del viewport;
 *   - targets táctiles <44 px en móvil (heurística; excluye `.toque-44`);
 *   - modales: foco al abrir, scroll interno, Escape, retorno de foco y
 *     validación visible en los formularios;
 *   - caret del campo de montos (tipeo, borrado y pegado);
 *   - búsqueda sin resultados (estado vacío del directorio).
 *
 * Salida: docs/qa/ola2-com/ (capturas + informe JSON).
 * Uso: node build-tools/visual-harness/qa-com-ola2.mjs
 */
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = resolve(repo, 'docs/qa/ola2-com');
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
  const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 70});
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(data, 'base64'));
};
const go = async (path, ready) => {await send('Page.navigate', {url: BASE + path}); await sleep(3000); if (ready) await waitFor(ready, {label: ready});};
const escapeKey = async () => {
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27});
};
const clickText = (label) => evaluate(`(()=>{const target=[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim().includes(${JSON.stringify(label)}));if(!target)return false;target.click();return true;})()`);
const clickSelector = (selector) => evaluate(`(()=>{const target=document.querySelector(${JSON.stringify(selector)});if(!target)return false;target.click();return true;})()`);
const dialogCount = () => evaluate(`document.querySelectorAll('[role="dialog"]').length`);

const consoleErrors = [];
cdp.on('Runtime.consoleAPICalled', ({type, args}) => {if (type === 'error') consoleErrors.push(args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));});

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});

const SECTIONS = [
  // En móvil el riel se oculta (chrome §141): «Resumen» no está en el DOM.
  // El shell listo se verifica por el topbar; el contenido, por sus KPIs.
  ['resumen', '/resumen', `document.querySelector('.workspace-topbar')`],
  ['pipeline', '/pipeline', `document.body.textContent.includes('Oportunidades abiertas')`],
  ['clientes', '/clientes', `document.body.textContent.includes('Clientes')`],
  ['presupuestos', '/presupuestos', `document.body.textContent.includes('Borradores')`],
  ['planes', '/presupuestos/planes', `document.body.textContent.includes('Planes')`],
];

const MEASURE = `(()=>{
 const vw=window.innerWidth;
 const rect=(el)=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};};
 const visible=(el)=>{const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&el.getClientRects().length>0;};
 const inScroller=(el)=>{let p=el.parentElement;while(p&&p!==document.body){const cs=getComputedStyle(p);if(/auto|scroll/.test(cs.overflowX))return true;p=p.parentElement;}return false;};
 const wide=[...document.querySelectorAll('main *, footer *')].filter(el=>visible(el)&&!inScroller(el)).filter(el=>{const r=el.getBoundingClientRect();return r.width>2&&(r.right>vw+1||r.left<-1);}).slice(0,12).map(el=>({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,90),text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,60),rect:rect(el)}));
 const targets=vw<768?[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role="button"],[role="option"]')].filter(el=>visible(el)&&!el.classList.contains('toque-44')&&!el.closest('.toque-44')).map(el=>({tag:el.tagName.toLowerCase(),cls:String(el.className).slice(0,70),text:(el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,50),rect:rect(el)})).filter(t=>t.rect.h<44||t.rect.w<44).slice(0,60):[];
 return {overflowX:document.documentElement.scrollWidth-vw,wide,targets,docH:document.documentElement.scrollHeight,title:document.title,searchPadding:(()=>{const s=document.querySelector('input[aria-label="Buscar clientes"]');return s?getComputedStyle(s).paddingLeft:null;})()};
})()`;

const report = {sweep: {}, modals: [], forms: [], search: {}, consoleErrors};

try {
  // ── Barrido de secciones ──────────────────────────────────────────────────
  for (const theme of ['light', 'dark']) {
    for (const [width, height] of [[390, 844], [768, 1024]]) {
      await setViewport(width, height);
      for (const [slug, path, ready] of SECTIONS) {
        await go(path, ready);
        await setTheme(theme);
        await sleep(600);
        const data = await evaluate(MEASURE);
        report.sweep[`${slug}-${width}-${theme}`] = data;
        await shot(`${slug}-${width}-${theme}`);
      }
    }
  }

  // ── Cuadrícula de Clientes (390/768, claro/oscuro) ───────────────────────
  for (const theme of ['light', 'dark']) {
    for (const [width, height] of [[390, 844], [768, 1024]]) {
      try {
        await setViewport(width, height);
        await go('/clientes', `document.body.textContent.includes('Clientes')`);
        await setTheme(theme); await sleep(400);
        await clickSelector('button[aria-label="Ver como cuadrícula"]');
        await sleep(700);
        const grid = await evaluate(`({overflowX:document.documentElement.scrollWidth-window.innerWidth,cards:document.querySelectorAll('.client-hub-card').length})`);
        report.sweep[`clientes-cuadricula-${width}-${theme}`] = {overflowX: grid.overflowX, wide: [], targets: [], cards: grid.cards};
        await shot(`clientes-cuadricula-${width}-${theme}`);
        await clickSelector('button[aria-label="Ver como lista"]');
        await sleep(300);
      } catch (cause) {
        report.notes = [...(report.notes || []), `cuadricula ${width} ${theme}: ${cause instanceof Error ? cause.message : cause}`];
      }
    }
  }

  // ── Modales y formularios ────────────────────────────────────────────────
  const MODALS = [
    {id: 'pipeline-alta', path: '/pipeline', ready: `document.body.textContent.includes('Oportunidades abiertas')`, open: () => clickText('Nueva oportunidad'), form: true},
    {id: 'cliente-nuevo', path: '/clientes', ready: `document.body.textContent.includes('Clientes')`, open: () => clickText('Nuevo cliente'), form: true},
    {id: 'cliente-editor', path: '/clientes', ready: `document.body.textContent.includes('Clientes')`, open: () => clickSelector('button[aria-label^="Editar "]'), form: true},
    {id: 'cliente-ficha', path: '/clientes', ready: `document.body.textContent.includes('Clientes')`, open: () => clickSelector('button[aria-label^="Abrir ficha"]')},
    {id: 'presupuesto-abrir', path: '/presupuestos', ready: `document.body.textContent.includes('Borradores')`, open: async () => (await clickSelector('button[aria-label^="Abrir presupuesto"]')) || clickText('Abrir presupuesto')},
    {id: 'presupuesto-nuevo', path: '/presupuestos', ready: `document.body.textContent.includes('Borradores')`, open: () => clickText('Nuevo presupuesto'), form: true},
    {id: 'plan-nuevo', path: '/presupuestos/planes', ready: `document.body.textContent.includes('Planes')`, open: () => clickText('Nuevo plan'), form: true},
  ];

  for (const [width, height] of [[390, 844], [768, 1024]]) {
    await setViewport(width, height);
    for (const modal of MODALS) {
      for (const theme of ['light', 'dark']) {
        const entry = {id: `${modal.id}-${width}-${theme}`, ok: false};
        try {
          await go(modal.path, modal.ready);
          await setTheme(theme);
          await sleep(400);
          if (!(await modal.open())) throw new Error('no se encontró el disparador');
          await waitFor(`document.querySelector('[role="dialog"]')`, {label: 'el diálogo', timeout: 12000});
          await sleep(800);
          entry.open = true;
          entry.scrollLocked = await evaluate(`document.body.style.overflow==='hidden'`);
          entry.focusInside = await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');return Boolean(d)&&d.contains(document.activeElement);})()`);
          entry.dialog = await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const body=d?.querySelector('.unified-dialog-body, .dialog-body')||d;const r=d.getBoundingClientRect();return {rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},fit:r.height<=window.innerHeight+1&&r.width<=window.innerWidth+1,scrollHeight:body?.scrollHeight||0,clientHeight:body?.clientHeight||0,scrollable:(body?.scrollHeight||0)>(body?.clientHeight||0)};})()`);
          entry.targets = width < 768 ? await evaluate(`(()=>{const v=el=>{const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&el.getClientRects().length>0};return [...document.querySelectorAll('[role="dialog"] button,[role="dialog"] a[href],[role="dialog"] input:not([type=hidden]),[role="dialog"] select,[role="dialog"] textarea')].filter(v).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName.toLowerCase(),text:(el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,40),w:Math.round(r.width),h:Math.round(r.height)};}).filter(t=>t.h<44||t.w<44).slice(0,40);})()`) : [];
          if (entry.dialog.scrollable) {
            entry.scrollWorks = await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const body=d?.querySelector('.unified-dialog-body, .dialog-body')||d;const before=body.scrollTop;body.scrollTop=before+120;return body.scrollTop>before;})()`);
          }
          await shot(`${modal.id}-${width}-${theme}`);
          // Escape: cierra y devuelve el foco al disparador.
          await escapeKey();
          await sleep(500);
          entry.escaped = (await dialogCount()) === 0;
          entry.focusReturned = await evaluate(`(()=>{const a=document.activeElement;return Boolean(a)&&a!==document.body&&a.getClientRects().length>0;})()`);
          entry.ok = entry.open && entry.focusInside && entry.escaped;
        } catch (cause) {
          entry.error = cause instanceof Error ? cause.message : String(cause);
        }
        report.modals.push(entry);
      }
    }
  }

  // ── Validación visible y caret del monto (390 claro) ─────────────────────
  try {
  await setViewport(390, 844);
  await go('/pipeline', `document.body.textContent.includes('Oportunidades abiertas')`);
  await setTheme('light'); await sleep(400);
  await clickText('Nueva oportunidad');
  await waitFor(`document.querySelector('[role="dialog"]')`, {label: 'alta de oportunidad'});
  await sleep(600);
  // Caret: tipear dígitos en el monto y verificar el valor agrupado y el caret.
  const amountState = await evaluate(`(async()=>{
   const amounts=[...document.querySelectorAll('[role="dialog"] input')].filter(el=>el.inputMode==='numeric'||/amount|valor/i.test(el.getAttribute('aria-label')||''));
   const input=amounts[0];if(!input)return {error:'sin campo de monto'};
   input.focus();input.select();
   return {focused:document.activeElement===input,value:input.value,selectionStart:input.selectionStart};
  })()`);
  await send('Input.insertText', {text: '1234567'});
  await sleep(300);
  const amountTyped = await evaluate(`(()=>{const input=document.activeElement;return {value:input?.value,selectionStart:input?.selectionStart,selectionEnd:input?.selectionEnd};})()`);
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8});
  await sleep(250);
  const amountBackspace = await evaluate(`(()=>{const input=document.activeElement;return {value:input?.value,selectionStart:input?.selectionStart};})()`);
  report.forms.push({id: 'caret-monto', amountState, amountTyped, amountBackspace});
  // Select por teclado: abrir la etapa y elegir con las flechas.
  const selectBefore = await evaluate(`(()=>{const t=document.querySelector('[role="dialog"] .ops-select-trigger');return t?.textContent.trim()||null;})()`);
  await clickSelector('[role="dialog"] .ops-select-trigger');
  await sleep(350);
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40});
  await send('Input.dispatchKeyEvent', {type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13});
  await send('Input.dispatchKeyEvent', {type: 'char', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13});
  await sleep(350);
  report.forms.push({id: 'select-teclado', selectBefore, selectAfter: await evaluate(`(()=>{const t=document.querySelector('[role="dialog"] .ops-select-trigger');return {label:t?.textContent.trim()||null,open:Boolean(document.querySelector('[role="listbox"]'))};})()`)});
  // Validación: guardar sin nombre.
  const saveClicked = await evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const button=[...d.querySelectorAll('button')].find(b=>/Guardar/.test(b.textContent.trim()));if(!button)return false;button.click();return true;})()`);
  await sleep(700);
  report.forms.push({id: 'validacion-oportunidad', saveClicked, errors: await evaluate(`[...document.querySelectorAll('[role="dialog"] [role="alert"], [role="dialog"] .error')].map(el=>el.textContent.trim().slice(0,80)).slice(0,6)`)});
  await escapeKey(); await sleep(400);
  } catch (cause) {
    report.forms.push({id: 'formularios-390', error: cause instanceof Error ? cause.message : String(cause)});
  }

  // Búsqueda sin resultados en el directorio (estado vacío) y scroll interno
  // de la tabla de planes en mobile.
  try {
    await go('/clientes', `document.body.textContent.includes('Clientes')`);
    await setTheme('light'); await sleep(400);
    await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Buscar clientes"]');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(input,'zzz-no-existe');input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
    await sleep(700);
    report.search.noResults = await evaluate(`({text:document.body.textContent.includes('No hay clientes que coincidan'),reset:Boolean([...document.querySelectorAll('button')].find(b=>/Limpiar filtros/.test(b.textContent))),overflowX:document.documentElement.scrollWidth-window.innerWidth,iconPadding:(()=>{const input=document.querySelector('input[aria-label="Buscar clientes"]');return input?getComputedStyle(input).paddingLeft:null;})()})`);
    await shot('clientes-sin-resultados-390-light');
  } catch (cause) {
    report.search.error = cause instanceof Error ? cause.message : String(cause);
  }
  try {
    await go('/presupuestos/planes', `document.body.textContent.includes('Planes')`);
    await setTheme('light'); await sleep(400);
    report.planes = await evaluate(`(()=>{const region=document.querySelector('section[aria-label="Planes reutilizables"] [role="region"]');if(!region)return {error:'sin comparador'};return {scrollWidth:region.scrollWidth,clientWidth:region.clientWidth,scrollable:region.scrollWidth>region.clientWidth,docOverflow:document.documentElement.scrollWidth-window.innerWidth};})()`);
  } catch (cause) {
    report.planes = {error: cause instanceof Error ? cause.message : String(cause)};
  }
} catch (cause) {
  report.fatal = cause instanceof Error ? cause.stack : String(cause);
}

writeFileSync(resolve(out, 'informe.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({sweepOverflow: Object.fromEntries(Object.entries(report.sweep).map(([k, v]) => [k, v.overflowX])), modals: report.modals.map((m) => ({id: m.id, ok: m.ok, error: m.error, escaped: m.escaped, focusInside: m.focusInside, fit: m.dialog?.fit, scrollable: m.dialog?.scrollable, scrollWorks: m.scrollWorks, small: m.targets?.length})), forms: report.forms, search: report.search, planes: report.planes, fatal: report.fatal, consoleErrors: report.consoleErrors.slice(0, 10)}, null, 1));
cdp.close();
chrome.close();
