// Real ConfirmDialog, registry, native submit and canonical buttons in Chromium.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const repo=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{ReportProblemDialog}from'./app/report-problem';import{Dialog,FormActions}from'./app/dialog';import{Button,IconButton}from'./app/ui/button';
const root=createRoot(document.getElementById('root'));window.calls=[];window.qaClosed=0;window.saved=0;
function Unknown(props){return <button {...props} id="unknown">Unknown wrapper</button>;}
function Host({mode}){const[open,setOpen]=useState(true);return !open?<p>Closed</p>:mode==='actions'?<Dialog title="Actions QA" close={()=>setOpen(false)}><form id="actions-form" onSubmit={event=>{event.preventDefault();window.saved++;}}><input id="entry" defaultValue="Text"/><FormActions><Button id="implicit">Implicit</Button><IconButton id="icon" label="Implicit icon" icon={<span>+</span>}/><><Button id="fragment">Fragment</Button></><Button id="secondary" type="button">Secondary</Button><Button id="explicit" form="external-form">Explicit</Button><Unknown type="submit"/></FormActions></form><form id="external-form" onSubmit={event=>event.preventDefault()}/></Dialog>:<ReportProblemDialog route="/clientes?secret=redacted" onClose={()=>{window.qaClosed++;setOpen(false);}} send={payload=>{window.calls.push(payload);return new Promise((resolve,reject)=>{window.release=(failure)=>failure?reject(new Error('No se pudo enviar. Reintentá.')):resolve({});});}}/>;}
window.mount=mode=>{window.calls=[];window.qaClosed=0;window.saved=0;root.render(<Host key={mode} mode={mode}/>);};
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',platform:'browser',format:'iife',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><head><style>.ops-overlay{position:fixed;inset:0;display:grid;place-items:center;background:#8884}.ops-dialog{width:min(500px,95vw);background:white;padding:16px;max-height:90vh;overflow:auto}.dialog-heading{display:flex;justify-content:space-between}.ui-form-fields{display:contents}textarea{width:90%}button,input{margin:4px}</style></head><body><div id="root"></div></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewport({width:1366,height:768});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:bundle.outputFiles[0].text});
 const mount=async mode=>{await page.evaluate(mode=>window.mount(mode),mode);await page.waitForSelector(mode==='actions'?'#implicit':'textarea');await page.waitForFunction(()=>Array.from(document.querySelectorAll('.dialog-footer button')).some(node=>node.form));};
 const clickText=label=>page.evaluate(label=>Array.from(document.querySelectorAll('button')).find(node=>node.textContent===label).click(),label);
 const dismiss=async method=>{if(method==='X')await page.click('.dialog-heading button');else if(method==='Escape')await page.keyboard.press('Escape');else if(method==='backdrop')await page.click('.ops-overlay',{offset:{x:2,y:2}});else await clickText('Cancelar');};
 for(const method of ['X','Escape','backdrop','Cancelar']){
  await mount('draft-'+method);await page.type('textarea','Borrador sintético sin enviar');await dismiss(method);
  await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===2);assert.equal(await page.evaluate(()=>window.qaClosed),0,method+' protects draft');
  await clickText('Seguir editando');await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);assert.equal(await page.$eval('textarea',node=>node.value),'Borrador sintético sin enviar');
  await dismiss(method);await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===2);await clickText('Descartar cambios');await page.waitForFunction(()=>window.qaClosed===1);assert.equal(await page.evaluate(()=>window.calls.length),0);
 }
 await mount('send');await clickText('Enviar reporte');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-haspopup')==='listbox');
 assert.match(await page.$eval('[role=alert]',node=>node.textContent),/Elegí una categoría/);
 await page.keyboard.press('ArrowDown');await page.waitForSelector('[role=option]');await page.keyboard.press('Enter');
 await clickText('Enviar reporte');await page.waitForFunction(()=>document.activeElement?.tagName==='TEXTAREA');assert.match(await page.$eval('[role=alert]',node=>node.textContent),/Contanos un poco más/);
 await page.type('textarea','No guarda el presupuesto sintético.');assert.equal(await page.$$eval('[role=alert]',nodes=>nodes.length),0,'correcting the invalid field clears its validation error');
 await page.evaluate(()=>{const form=document.querySelector('form');form.requestSubmit();form.requestSubmit();});await page.waitForFunction(()=>window.calls.length===1);
 assert.equal(await page.$eval('textarea',node=>node.disabled),true);assert.equal(await page.$$eval('.dialog-footer button',nodes=>nodes.every(node=>node.disabled)),true);
 await page.keyboard.press('Escape');await page.click('.ops-overlay',{offset:{x:2,y:2}});assert.equal(await page.evaluate(()=>window.qaClosed),0);assert.equal(await page.$$('[role=dialog]').then(nodes=>nodes.length),1,'pending cannot open discard');
 await page.evaluate(()=>window.release(true));await page.waitForFunction(()=>document.activeElement?.classList.contains('form-error-summary'));
 assert.equal(await page.$eval('textarea',node=>node.value),'No guarda el presupuesto sintético.');assert.match(await page.$eval('[role=alert]',node=>node.textContent),/No se pudo enviar/);
 await page.click('textarea');await page.keyboard.type(' Detalle.');assert.match(await page.$eval('[role=alert]',node=>node.textContent),/No se pudo enviar/,'unmapped API error is preserved');
 await clickText('Enviar reporte');await page.waitForFunction(()=>window.calls.length===2);await page.evaluate(()=>window.release(false));await page.waitForFunction(()=>window.qaClosed===1);
 assert.equal(await page.evaluate(()=>window.calls.length),2);assert.equal(await page.evaluate(()=>window.calls[1].route),'/clientes');assert.match(await page.evaluate(()=>window.calls[1].message),/Detalle/);
 await mount('actions');
 assert.deepEqual(await page.$$eval('#implicit,#icon,#fragment',nodes=>nodes.map(node=>({form:node.form?.id,type:node.getAttribute('type')}))),[{form:'actions-form',type:null},{form:'actions-form',type:null},{form:'actions-form',type:null}]);
 assert.equal(await page.$eval('#explicit',node=>node.form.id),'external-form');assert.equal(await page.$eval('#secondary',node=>node.getAttribute('form')),null);assert.equal(await page.$eval('#unknown',node=>node.form),null,'arbitrary wrapper receives no guessed association');
 await page.click('#implicit');await page.waitForFunction(()=>window.saved===1);await page.click('#entry');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.saved===2);
 await page.click('#icon');await page.waitForFunction(()=>window.saved===3);await page.click('#fragment');await page.waitForFunction(()=>window.saved===4);
 assert.deepEqual(errors,[]);console.log('PASS Chromium: Report draft X/Escape/backdrop/Cancel guards, keep/discard, validation/error focus, retained draft, single-flight one request, pending locks, retry; implicit canonical Button/IconButton footer click/keyboard/form association, Fragment and explicit target preserved, unknown wrapper untouched.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
