#!/usr/bin/env node
/*
 * Debug helper: opens the latest harness artifact at a given width and
 * evaluates an expression inside the page (CDP, same emulation as run.mjs).
 *
 *   node build-tools/visual-harness/probe.mjs 390 "document.documentElement.scrollWidth"
 *   node build-tools/visual-harness/probe.mjs 1440 "JSON.stringify([...document.querySelectorAll('.client-hub-card')].slice(0,1).map(el=>({w:el.getBoundingClientRect().width})))"
 */
import {createServer} from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {extname, join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const width = Number(process.argv[2] || 390);
const expression = process.argv[3] || 'document.documentElement.scrollWidth';
const pageName = process.argv[4] || 'audit';
const htmlPath = resolve(repo, 'work', 'visual-harness', 'latest', `${pageName === 'audit' ? 'audit' : `page-${pageName}`}.html`);
if (!existsSync(htmlPath)) {
  console.error('Run `node build-tools/visual-harness/run.mjs` first (needs work/visual-harness/latest/audit.html).');
  process.exit(1);
}
const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'};
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const local = path === '/' ? htmlPath : resolve(repo, 'public', path.replace(/^\//, ''));
  if (local === htmlPath) {
    response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    response.end(readFileSync(local));
    return;
  }
  if (local.startsWith(resolve(repo, 'public')) && existsSync(local) && statSync(local).isFile()) {
    response.writeHead(200, {'content-type': mime[extname(local)] || 'application/octet-stream'});
    response.end(readFileSync(local));
    return;
  }
  response.writeHead(404);
  response.end('not found');
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const chrome = await launchChrome({chromePath: process.env.CHROME_PATH || defaultChromePath});
const cdp = await openTarget(chrome.port);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
const loaded = cdp.once('Page.loadEventFired');
await cdp.send('Page.navigate', {url: `http://127.0.0.1:${server.address().port}/`});
await loaded;
await cdp.evaluate('document.fonts.ready.then(() => true)');
await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: 900});
await new Promise((done) => setTimeout(done, 120));
const result = await cdp.evaluate(`(() => { const value = (${expression}); return JSON.stringify(value, null, 2); })()`);
console.log(result);
cdp.close();
await chrome.close();
server.close();
