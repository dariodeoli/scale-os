#!/usr/bin/env node
// Sonda de búsqueda global (campaña #154, COM): estado real de la paleta ⌘K.
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
const route = process.env.ROUTE || '/';
await send('Page.navigate', {url: BASE + route});
for (let i = 0; i < 60; i += 1) {
  if (await evaluate(`Boolean(document.querySelector('.desktop-sidebar'))`)) break;
  await sleep(300);
}
await sleep(800);

// 1) ¿Existe el control del topbar?
const triggers = await evaluate(`[...document.querySelectorAll('button,[role=button],input,[role=search],a')].map(node=>({tag:node.tagName,label:node.getAttribute('aria-label'),title:node.getAttribute('title'),placeholder:node.getAttribute('placeholder'),role:node.getAttribute('role'),cls:String(node.className).slice(0,80),text:(node.textContent||'').trim().slice(0,80)})).filter(item=>/buscar/i.test([item.label,item.title,item.placeholder,item.text].filter(Boolean).join(' ')))`);
console.log('controles de búsqueda:', JSON.stringify(triggers, null, 1));
const owner = await evaluate(`(()=>{const nodes=[...document.querySelectorAll('*')].filter(node=>/Buscar cliente, proyecto u orden/i.test(node.textContent||'')&&node.querySelectorAll('*').length<=4);const node=nodes[nodes.length-1];if(!node)return null;return{tag:node.tagName,cls:String(node.className).slice(0,100),outer:node.outerHTML.slice(0,320),parentTag:node.parentElement?.tagName,parentCls:String(node.parentElement?.className).slice(0,100)};})()`);
console.log('nodo del topbar:', JSON.stringify(owner, null, 1));

// 2) Abrir con clic en el control y con ⌘K; dump del estado.
const openByClick = await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>/Buscar|buscar/.test((b.getAttribute('aria-label')||'')+(b.getAttribute('title')||'')));if(!button)return false;button.click();return true;})()`);
await sleep(900);
const dump = async (label) => {
  const state = await evaluate(`(()=>{
   const dialog=document.querySelector('.unified-dialog,[role=dialog]');
   const inputs=[...document.querySelectorAll('.unified-dialog input,[role=dialog] input')].map(node=>({type:node.type,placeholder:node.placeholder,value:node.value,cls:String(node.className).slice(0,60)}));
   return {hasDialog:Boolean(dialog),dialogLabel:dialog?.getAttribute('aria-label')||dialog?.className||'',inputs,status:[...document.querySelectorAll('[role=status]')].map(n=>n.textContent.trim().slice(0,80)).filter(Boolean).slice(0,6),text:(dialog?.innerText||'').replace(/\\s+/g,' ').slice(0,220)};
  })()`);
  console.log(label, JSON.stringify(state, null, 1));
  return state;
};
console.log('openByClick:', openByClick);
await dump('estado tras clic:');
const typed = await evaluate(`(()=>{const input=document.querySelector('.unified-dialog input,[role=dialog] input');if(!input)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'Aurora');input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
console.log('typed:', typed);
await sleep(1500);
await dump('estado tras «Aurora»:');
cdp.close();
chrome.close();
