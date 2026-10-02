/*
 * Capturas de la landing antes/después (#134), sobre las páginas instrumentadas
 * que deja `run.mjs` para los fixtures `external`:
 *
 *   node build-tools/visual-harness/run.mjs --only landing-134-antes,landing-134-despues \
 *     --widths 1440,390 --out work/visual-harness/landing-134
 *   node build-tools/visual-harness/capture-landing-134.mjs
 *
 * El «antes» se genera copiando la landing previa al cambio
 * (`git show <base>:public/scale-os.html > public/scale-os-antes-134.html`) y un
 * fixture temporal `external` que apunte a ese archivo; ambos se retiran al
 * terminar. Sirve el directorio del run con los assets de `public/` y guarda
 * página completa en `docs/qa/landing-134/` (la landing es un documento claro).
 */
import {createServer} from 'node:http';
import {existsSync, readFileSync, mkdirSync, statSync, writeFileSync} from 'node:fs';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const inputDir = resolve(repo, process.env.RUN_DIR || 'work/visual-harness/landing-134');
const outDir = resolve(repo, process.env.OUT_DIR || 'docs/qa/landing-134');
const widths = String(process.env.WIDTHS || '1440,390').split(',').map(Number);
const paginas = ['landing-134-antes', 'landing-134-despues'];
const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json'};

function serve() {
 return new Promise(done => {
  const server = createServer((request, response) => {
   const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
   const candidates = [join(inputDir, pathname), join(repo, 'public', pathname)];
   for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
     response.writeHead(200, {'Content-Type': mime[extname(candidate)] || 'application/octet-stream'});
     response.end(readFileSync(candidate));
     return;
    }
   }
   response.writeHead(404).end('not found');
  });
  server.listen(0, '127.0.0.1', () => done(server));
 });
}

const chrome = await launchChrome({chromePath: process.env.CHROME_PATH || defaultChromePath});
const server = await serve();
const port = server.address().port;
const cdp = await openTarget(chrome.port);
const evaluate = async (expression) => (await cdp.send('Runtime.evaluate', {expression, returnByValue: true})).result.value;

try {
 mkdirSync(outDir, {recursive: true});
 await cdp.send('Page.enable');
 await cdp.send('Runtime.enable');
 for (const width of widths) {
  const mobile = width < 768;
  await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile});
  for (const pagina of paginas) {
   const loaded = cdp.once('Page.loadEventFired');
   await cdp.send('Page.navigate', {url: `http://127.0.0.1:${port}/page-${pagina}.html`});
   await loaded;
   await new Promise(resolveWait => setTimeout(resolveWait, 200));
   const height = Math.ceil(await evaluate('document.documentElement.scrollHeight'));
   const shot = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true, clip: {x: 0, y: 0, width, height, scale: 1}});
   const file = join(outDir, `${pagina}-${width}-light.png`);
   writeFileSync(file, Buffer.from(shot.data, 'base64'));
   console.log(`${pagina} ${width}px -> ${file} (${height}px de alto)`);
  }
 }
 console.log(`Capturas en ${outDir}`);
} finally {
 cdp.close();
 server.close();
 await chrome.close();
}
