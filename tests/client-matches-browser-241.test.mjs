// Real consumer DOM/keyboard with synthetic transport; backend has its independent PGlite suite.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const repo=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`
import React from'react';import{createRoot}from'react-dom/client';import{ClientEditorDialog}from'./app/client-editor';
const root=createRoot(document.getElementById('root'));window.calls=[];window.created=0;let key=0;
const existing={id:'41',name:'Existente QA',legal_name:'Existente QA S.A.',email:'same@example.invalid',phone:'',tax_id:'80168807-8',notes:'',lifecycle_status:'active',updated_at:'one',social_links:{},logo_url:null};
const match={id:'41',name:existing.name,logo_url:null,secondary:'Mismo correo',state:'active'};
window.fetch=async(input,init={})=>{
 const path=String(input).replace('/core-api',''),body=init.body?JSON.parse(init.body):null;window.calls.push({path,body});
 if(path==='/api/agency/clients/matches'){
  if(body.value==='slow@example.invalid')return new Promise(resolve=>{window.finishOld=()=>resolve(new Response(JSON.stringify({matches:[match]})));});
  return new Response(JSON.stringify({matches:body.value==='same@example.invalid'||body.kind==='tax_id'?[match]:[]}));
 }
 if(path==='/api/agency/clients/41')return new Response(JSON.stringify({record:existing}));
 if(path==='/api/agency/clients')return new Response(JSON.stringify({error:'Ya existe un cliente con este RUC en tu empresa.'}),{status:409});
 if(path==='/api/agency/ruc-lookup')return window.rucError?new Response(JSON.stringify({error:'Proveedor no disponible'}),{status:503}):new Response(JSON.stringify({record:window.rucFound?{name:'Proveedor QA S.A.',tax_id:'80168807-8',tax_state:'ACTIVO',publication_date:'2026-10-17',source:'fixture'}:null}));
 return new Response('{}');
};
window.mount=()=>root.render(<ClientEditorDialog key={++key} mode="create" role="finance" close={()=>{}} refresh={async()=>{}} onCreated={()=>{window.created++;}}/>);
window.mount();
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body><div id="root"></div></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewport({width:1440,height:900});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:bundle.outputFiles[0].text});await page.waitForSelector('[data-field="name"] input');
 const input=key=>`[data-field="${key}"] input`;
 const set=async(key,value)=>{
  await page.$eval(`[data-field="${key}"]`,node=>{const section=node.closest('details');if(section&&!section.open)section.querySelector('summary').click();});
  await page.click(input(key));await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await page.type(input(key),value,{delay:5});
 };
 const click=async(text)=>{await page.evaluate(text=>{const button=Array.from(document.querySelectorAll('button')).find(node=>node.textContent.trim()===text);if(!button)throw Error('Missing action '+text);button.focus();},text);await page.keyboard.press('Enter');};
 await set('name','Borrador QA');await set('email','same@example.invalid');
 await page.waitForSelector('section[aria-label="Fichas de clientes existentes"] button[aria-haspopup="listbox"]');
 const select='section[aria-label="Fichas de clientes existentes"] button[aria-haspopup="listbox"]';
 await page.focus(select);await page.keyboard.press('ArrowDown');await page.waitForSelector('[role="option"]');await page.keyboard.press('Enter');
 await click('Abrir ficha existente');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===2);
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-field="name"] input')).some(node=>node.value==='Existente QA'));
 assert.equal(await page.$eval(input('name'),node=>node.value),'Borrador QA','abrir ficha no sustituye el borrador');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);
 assert.equal(await page.$eval(input('email'),node=>node.value),'same@example.invalid');
 await set('tax_id','80168807-8');await page.waitForFunction(()=>window.calls.some(call=>call.path.endsWith('/matches')&&call.body.kind==='tax_id'&&call.body.value==='80168807-8'));await page.waitForSelector(select);await click('Seguir con la ficha nueva');
 await page.waitForFunction(()=>!document.querySelector('section[aria-label="Fichas de clientes existentes"]'));
 await click('Crear cliente');
 await page.waitForSelector(select);
 assert.equal(await page.evaluate(()=>window.calls.filter(call=>call.path==='/api/agency/clients').length),1,'409 reconsulta sugerencias sin reintentar alta');
 assert.equal(await page.evaluate(()=>window.created),0,'abrir existente no simula creación');
 assert.equal(await page.$eval(input('name'),node=>node.value),'Borrador QA');
 await set('tax_id','');await set('email','slow@example.invalid');await page.waitForFunction(()=>typeof window.finishOld==='function');
 await set('email','new@example.invalid');await page.waitForFunction(()=>window.calls.some(call=>call.path.endsWith('/matches')&&call.body.value==='new@example.invalid'));
 await page.evaluate(()=>window.finishOld());
 await page.waitForFunction(()=>!document.querySelector('section[aria-label="Fichas de clientes existentes"]'));
 assert.equal(await page.$eval(input('email'),node=>node.value),'new@example.invalid','resultado viejo no sobrescribe identidad');
 await set('tax_id','80.168.807-8');
 assert.equal(await page.$eval(input('tax_id'),node=>node.value),'80.168.807-8','el campo conserva texto crudo pegado');
 await page.focus('[data-field="tax_id"] button');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-field="tax_id"] [data-ui-lookup-field]')?.getAttribute('data-lookup-state')==='not-found');
 assert.equal(await page.$eval(input('tax_id'),node=>node.value),'80.168.807-8','sin resultado conserva carga manual');
 assert.equal(await page.evaluate(()=>window.calls.filter(call=>call.path.endsWith('/ruc-lookup')).at(-1).body.ruc),'80168807-8','normalización se hace en la frontera de consulta');
 await page.evaluate(()=>{window.rucFound=true;});
 await page.focus('[data-field="tax_id"] button');await page.keyboard.press('Enter');await page.waitForSelector('[data-ui-lookup-review]');
 assert.equal(await page.$eval(input('tax_id'),node=>node.value),'80.168.807-8','encontrar no aplica por sí solo');
 await click('Aplicar');await page.waitForFunction(()=>document.querySelector('[data-field="tax_id"] input').value==='80168807-8');
 assert.match(await page.$eval(input('legal_name'),node=>node.value),/Proveedor/i);
 await page.focus('[data-field="tax_id"] button');await page.keyboard.press('Enter');await page.waitForSelector('[data-ui-lookup-review]');
 await set('legal_name','Edición manual durante confirmación');await click('Aplicar');
 await page.waitForFunction(()=>document.querySelector('[data-field="tax_id"] [data-ui-lookup-field]')?.getAttribute('data-lookup-state')==='conflict');
 assert.equal(await page.$eval(input('legal_name'),node=>node.value),'Edición manual durante confirmación');
 await page.evaluate(()=>{window.rucError=true;});await page.focus('[data-field="tax_id"] button');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-field="tax_id"] [data-ui-lookup-field]')?.getAttribute('data-lookup-state')==='error');
 assert.equal(await page.$eval(input('tax_id'),node=>node.value),'80168807-8');
 assert.deepEqual(errors,[]);
 console.log('PASS Chromium real: coincidencia exacta/selector por teclado, abrir/cerrar ficha hija conserva borrador,409 reofrece existente sin falsa alta, debounce/generation ignora respuesta vieja, RUC crudo/normalizado/no encontrado/manual, confirmación teclado/conflicto manual/error proveedor.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
