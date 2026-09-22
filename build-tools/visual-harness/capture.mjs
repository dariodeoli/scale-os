/*
 * Capturas del harness visual (SOS-DSN).
 *
 * El harness mide geometría pero no genera imágenes. Este script reutiliza su
 * cliente CDP (`chrome.mjs`) para sacar PNG de los fixtures del `audit.html`
 * en los anchos y temas pedidos: sirve el artifact por HTTP (con las fuentes
 * de `public/`), emula el ancho, aplica `data-theme` y captura la página
 * completa del fixture.
 *
 * Uso:
 *   node build-tools/visual-harness/capture.mjs \
 *     --input work/visual-harness/fase1/audit.html \
 *     --out work/visual-harness/fase1/captures \
 *     --widths 360,768,1440 --themes light,dark \
 *     --only clientes-lista,resumen-indicadores,configuracion-empresa
 */
import {createServer} from 'node:http';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');

function option(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const input = resolve(repo, option('input', 'work/visual-harness/latest/audit.html'));
const outDir = resolve(repo, option('out', join(dirname(input), 'captures')));
const widths = option('widths', '360,768,1440').split(',').map(value => Number(value.trim())).filter(Boolean);
const themes = option('themes', 'light,dark').split(',').map(value => value.trim()).filter(Boolean);
const only = option('only', '').split(',').map(value => value.trim()).filter(Boolean);
const chromePath = option('chrome', process.env.CHROME_PATH || defaultChromePath);

const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json'};

function serve() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const candidates = pathname.startsWith('/fonts/') || pathname.startsWith('/brand/')
      ? [join(repo, 'public', pathname)]
      : [join(dirname(input), pathname), join(repo, 'public', pathname)];
    for (const candidate of candidates) {
      if (existsSync(candidate) && !candidate.endsWith('/')) {
        response.writeHead(200, {'Content-Type': mime[extname(candidate)] || 'application/octet-stream'});
        response.end(readFileSync(candidate));
        return;
      }
    }
    response.writeHead(404).end('not found');
  });
  return new Promise(resolveServe => server.listen(0, '127.0.0.1', () => resolveServe(server)));
}

const chrome = await launchChrome({chromePath});
const server = await serve();
const port = server.address().port;
const cdp = await openTarget(chrome.port);

try {
  mkdirSync(outDir, {recursive: true});
  await cdp.send('Page.enable');
  for (const theme of themes) {
    for (const width of widths) {
      const mobile = width < 768;
      await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile});
      const loaded = cdp.once('Page.loadEventFired');
      await cdp.send('Page.navigate', {url: `http://127.0.0.1:${port}/audit.html`});
      await loaded;
      await cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme === 'dark' ? 'dark' : '')};document.documentElement.style.background=${JSON.stringify(theme === 'dark' ? 'rgb(var(--c-paper))' : '#ffffff')};`);
      await new Promise(resolveWait => setTimeout(resolveWait, 250));
      const fixtures = await cdp.evaluate(`[...document.querySelectorAll('[data-fixture]')].map(element=>element.getAttribute('data-fixture'))`);
      const selected = fixtures.filter(id => !only.length || only.includes(id));
      for (const id of selected) {
        await cdp.evaluate(`[...document.querySelectorAll('[data-fixture]')].forEach(element=>{element.style.display=element.getAttribute('data-fixture')===${JSON.stringify(id)}?'':'none';});`);
        const metrics = await cdp.evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(`[data-fixture="${id}"]`)});const box=element.getBoundingClientRect();return {height:Math.ceil(element.scrollHeight||box.height),width:Math.ceil(box.width)};})()`);
        const shot = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true, clip: {x: 0, y: 0, width, height: Math.max(120, metrics.height), scale: 1}});
        const file = join(outDir, `${id}-${width}-${theme}.png`);
        writeFileSync(file, Buffer.from(shot.data, 'base64'));
        console.log(`${id} ${width}px ${theme} -> ${file}`);
      }
      await cdp.evaluate(`[...document.querySelectorAll('[data-fixture]')].forEach(element=>{element.style.display='';});`);
    }
  }
  console.log(`Capturas en ${outDir}`);
} finally {
  cdp.close();
  server.close();
  await chrome.close();
}
