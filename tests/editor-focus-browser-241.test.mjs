// Real DOM focus, hidden mobile sections and lookup-edit conflicts. No external services.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const repo=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{Editor,ApiFieldError}from'./app/operations';import{Dialog}from'./app/dialog';
const root=createRoot(document.getElementById('root'));window.writes=[];
window.mount=(mode)=>root.render(<Dialog key={mode} title={"Editor QA: "+mode} close={()=>{window.closed=true;}}><Editor collapseSections fields={mode==='phone'?[{key:'phone',label:'Teléfono',type:'phone'}]:mode==='focus'?[
 {key:'name',label:'Nombre',section:'Identidad'},
 {key:'email',label:'Correo',type:'email',optional:true,section:'Contacto'},
 {key:'role',label:'Permiso',choices:[{value:'',label:'Seleccionar'},{value:'viewer',label:'Lectura'}],section:'Acceso'}
]:mode==='server'?[
 {key:'email',label:'Correo',type:'email',section:'Contacto'},
 {key:'notes',label:'Notas',optional:true,section:'Notas'},
 {key:'other',label:'Otro',optional:true,section:'Otros'}
]:[
 {key:'tax',label:'RUC',lookup:{label:'Buscar',run:async()=>new Promise(resolve=>{window.lookupResolve=resolve;})}},
 {key:'legal',label:'Razón social'}
]} defaults={mode==='phone'?{phone:'123'}:mode==='focus'?{name:'Ana',email:'',role:''}:mode==='server'?{email:'ana@example.invalid',notes:'',other:''}:{tax:'80012345',legal:'Manual'}} save={async values=>{if(mode==='server'&&!window.writes.length){window.writes.push(values);throw new ApiFieldError('Revisá la ficha',{email:'Correo ya registrado'});}window.writes.push(values);}}/></Dialog>);
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body><div id="root"></div></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewport({width:390,height:844});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>window.mount('focus'));await page.waitForSelector('form');
 await page.click('button[type="submit"]');
 await page.waitForFunction(()=>document.activeElement?.closest('[data-field]')?.getAttribute('data-field')==='role');
 assert.equal(await page.$eval('[data-field="role"]',node=>node.closest('details').hidden),false,'mobile first invalid compound section is revealed');
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-haspopup')),'listbox');
 await page.keyboard.press('ArrowDown');await page.waitForSelector('[role="option"]');await page.keyboard.press('End');await page.keyboard.press('Enter');
 await page.click('button[type="submit"]');await page.waitForFunction(()=>window.writes.length===1);assert.equal(await page.evaluate(()=>window.writes[0].role),'viewer');
 await page.evaluate(()=>{window.writes=[];window.mount('server');});await page.waitForFunction(()=>document.querySelector('.dialog-heading h2')?.textContent==='Editor QA: server'&&!!document.querySelector('.dialog-footer button[type=submit]')?.form);
 await page.click('button[type="submit"]');await page.waitForFunction(()=>document.activeElement?.closest('[data-field]')?.getAttribute('data-field')==='email');
 assert.match(await page.$eval('[data-field="email"]',node=>node.textContent),/Correo ya registrado/);
 await page.click('button[type="submit"]');assert.equal(await page.evaluate(()=>window.writes.length),1,'unchanged server error prevents repeat write');
 await page.type('[data-field="email"] input','x');await page.click('button[type="submit"]');await page.waitForFunction(()=>window.writes.length===2);
 await page.evaluate(()=>window.mount('phone'));await page.waitForFunction(()=>document.querySelector('.dialog-heading h2')?.textContent==='Editor QA: phone'&&!!document.querySelector('.dialog-footer button[type=submit]')?.form);
 await page.click('button[type="submit"]');await page.waitForFunction(()=>document.activeElement?.type==='tel');
 await page.evaluate(()=>{window.writes=[];window.mount('lookup');});await page.waitForFunction(()=>document.querySelector('.dialog-heading h2')?.textContent==='Editor QA: lookup'&&!!document.querySelector('.dialog-footer button[type=submit]')?.form);
 await page.click('[data-field="tax"] button');await page.waitForFunction(()=>typeof window.lookupResolve==='function');
 await page.click('[data-field="legal"] input');await page.keyboard.press('End');await page.type('[data-field="legal"] input',' editado');
 await page.evaluate(()=>window.lookupResolve({tax:'80012345-6',legal:'Proveedor'}));
 await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('Se conservaron tus cambios'));
 assert.equal(await page.$eval('[data-field="legal"] input',node=>node.value),'Manual editado');
 assert.equal(await page.$eval('[data-field="tax"] input',node=>node.value),'80012345');
 await page.keyboard.press('Escape');await page.waitForSelector('form.confirm-dialog');assert.equal(await page.evaluate(()=>window.closed===true),false,'lookup edited draft is protected');
 assert.deepEqual(errors,[]);
 console.log('PASS real Chromium 390px: hidden section/compound focus, phone national input focus, keyboard selection, explicit server field error and retry, stale lookup conflict preserves draft/cancel confirmation.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
