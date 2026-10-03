#!/usr/bin/env node
// Sonda de diagnóstico para la campaña #154 (COM): estado del shell y el nav.
import {launchChrome, openTarget} from './chrome.mjs';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const sessionFile = process.env.QA_SESSION || 'com-qa-session-169.txt';
const session = Object.fromEntries(readFileSync(resolve(repo, `work/visual-harness/${sessionFile}`), 'utf8').trim().split('\n').map((line) => line.split('=')));
const BASE = process.env.BASE || session.BASE;

const chrome = await launchChrome();
const cdp = await openTarget(chrome.port);
const send = (method, params = {}) => cdp.send(method, params);
const evaluate = async (expression) => {
  const {result, exceptionDetails} = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description || ''));
  return result.value;
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', {name: 'scale_session', value: session.SESSION, url: BASE, httpOnly: true});
await send('Page.navigate', {url: BASE + '/'});
await sleep(4000);
const state = await evaluate(`(()=>{
 const groups=[...document.querySelectorAll('.nav-group-toggle')].map(node=>node.textContent.replace(/\\s+/g,' ').trim());
 const navLinks=[...document.querySelectorAll('nav a, aside a')].map(node=>node.textContent.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,30);
 return {url:location.href,title:document.title,hasSidebar:Boolean(document.querySelector('.desktop-sidebar')),hasLogin:document.body.innerText.includes('Ingresar'),hasPipeline:document.body.innerText.includes('Pipeline'),groups,navLinks,text:document.body.innerText.replace(/\\s+/g,' ').slice(0,260)};
})()`);
console.log(JSON.stringify(state, null, 1));
cdp.close();
chrome.close();
