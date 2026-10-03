/* Contraste AA en vivo (#154, DSN): contenido de páginas del demo y landing. */
import {writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';
import {CONTRAST_JS} from './contrast.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const BASE = 'https://sistema.scaleparaguay.com';
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const report = [];

const chrome = await launchChrome({chromePath: process.env.CHROME_PATH || defaultChromePath});
const cdp = await openTarget(chrome.port);
await cdp.send('Page.enable');
async function waitFor(fn, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { try { if (await cdp.evaluate(`(${fn})()`)) return true; } catch {} await sleep(350); }
  return false;
}
async function theme(next) {
  await cdp.evaluate(`(()=>{try{localStorage.setItem('scale-theme',${JSON.stringify(next)});}catch{}${next === 'light' ? "document.documentElement.removeAttribute('data-theme')" : `document.documentElement.dataset.theme=${JSON.stringify(next)}`};})()`);
  await sleep(250);
}
async function goto(url) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', {url});
  await Promise.race([loaded, sleep(30000)]);
  await sleep(900);
}
try {
  // Demo.
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await goto(`${BASE}/demo`);
  await waitFor(() => location.pathname.startsWith('/produccion'), 30000);
  await waitFor(() => document.body.innerText.length > 400, 25000);
  if (await waitFor(() => document.body.innerText.includes('Tu Demo está lista'), 8000)) {
    await cdp.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith('Explorar el Demo'));b?.click();})()`);
    await sleep(500);
  }
  for (const path of ['/produccion', '/clientes', '/presupuestos']) {
    await goto(`${BASE}${path}`);
    await waitFor(() => document.body.innerText.length > 400, 20000);
    for (const t of ['light', 'dark']) {
      await theme(t);
      const result = await cdp.evaluate(CONTRAST_JS);
      report.push({surface: path, theme: t, ...result});
      console.log(path, t, JSON.stringify({failureCount: result.failureCount, chipFailures: result.chipFailures, uiFailureCount: result.uiFailureCount, checked: result.checked}));
      if (result.failureCount) console.log('  fallas:', JSON.stringify(result.failures.slice(0, 4)));
      if (result.uiFailureCount) console.log('  ui:', JSON.stringify(result.uiFailures.slice(0, 3)));
    }
  }
  // Landing.
  for (const width of [1440, 390]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: width < 768 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 768});
    await theme('light');
    await goto(`${BASE}/`);
    await waitFor(() => document.body.innerText.includes('Precio'), 20000);
    const result = await cdp.evaluate(CONTRAST_JS);
    report.push({surface: `landing-${width}`, theme: 'light', ...result});
    console.log(`landing-${width}`, JSON.stringify({failureCount: result.failureCount, uiFailureCount: result.uiFailureCount, checked: result.checked}));
    if (result.failureCount) console.log('  fallas:', JSON.stringify(result.failures.slice(0, 4)));
  }
  writeFileSync(resolve(repo, 'work/visual-harness/al4/contrast-169.json'), JSON.stringify(report, null, 2));
  console.log('RESUMEN contraste:', report.reduce((acc, item) => acc + item.failureCount, 0), 'fallas de texto,', report.reduce((acc, item) => acc + item.uiFailureCount, 0), 'de límites UI');
} finally {
  cdp.close();
  await chrome.close();
}
