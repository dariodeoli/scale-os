// Real DOM/RHF lifecycle: no API provider, real clients or financial requests.
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
import{ProjectForm,OrderForm,AccountForm,InvoiceForm,PaymentForm}from'./app/workspace-forms';
import{FXTransferForm}from'./app/daily-controls';import{ProfilePhoto}from'./app/profile-photo';
import{ClientAppearance}from'./app/client-identity';import{Dialog}from'./app/dialog';import{ApiFieldError}from'./app/operations';
const root=createRoot(document.getElementById('root'));window.writes=[];window.completed=0;window.didClose=false;
const clients=[{id:'1',name:'Cliente sintético'}];const projects=[{id:'1',name:'Proyecto sintético',client_name:'Cliente sintético'}];
const accounts=[{id:'1',name:'Cuenta A',currency:'PYG',active:true},{id:'2',name:'Cuenta B',currency:'PYG',active:true}];
const invoices=[{id:'1',number:'QA-1',client_name:'Cliente sintético',client_id:'1',status:'issued',currency:'PYG',total:'1000',paid_amount:'0',due_on:'2026-10-17'}];
window.request=async(path,init)=>{window.writes.push({path,body:typeof init?.body==='string'?JSON.parse(init.body):init});return await new Promise((resolve,reject)=>{window.finish=()=>resolve({project:{id:'99'},workOrder:{id:'99'},account:{id:'99'},invoice:{id:'99'}});window.fail=()=>reject(new ApiFieldError('Revisá el dato',{name:'Nombre rechazado por la API'}));});};
window.fetch=async(path,init)=>{await window.request(path,init);return{ok:true,json:async()=>({})};};
window.mount=mode=>{window.writes=[];window.completed=0;window.didClose=false;root.render(<Dialog key={mode} title={'Formulario QA '+mode} close={()=>{window.didClose=true;}}>{
 mode==='project'?<ProjectForm clients={clients} request={window.request} done={()=>window.completed++}/>:
 mode==='order'?<OrderForm projects={projects} request={window.request} done={()=>window.completed++}/>:
 mode==='account'?<AccountForm custodians={[]} request={window.request} done={()=>window.completed++}/>:
 mode==='invoice'?<InvoiceForm clients={clients} request={window.request} done={()=>window.completed++}/>:
 mode==='payment'?<PaymentForm accounts={accounts} invoices={invoices} custodians={[]} request={window.request} done={()=>window.completed++}/>:
 mode==='transfer'?<FXTransferForm accounts={accounts} done={()=>{window.completed++;}}/>:
 mode==='photo'?<ProfilePhoto name="Persona sintética" photo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iHZkAAAAASUVORK5CYII=" save={value=>window.request('photo',{photo:value})}/>:
 <ClientAppearance id="1" name="Cliente sintético" color="blue" logo={null} refresh={async()=>{throw Error('Refresh fallido sintético');}}/>
}</Dialog>);};
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body><div id="root"></div></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:bundle.outputFiles[0].text});
 const mount=async mode=>{await page.evaluate(mode=>window.mount(mode),mode);await page.waitForFunction(mode=>document.querySelector('.dialog-heading h2')?.textContent===`Formulario QA ${mode}`&&!!document.querySelector('form'),{},mode);};
 const submit=()=>page.evaluate(()=>{const form=document.querySelector('form');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 const assertLocked=async()=>{await page.waitForFunction(()=>document.querySelector('form')?.getAttribute('aria-busy')==='true');assert.equal(await page.$$eval('form input,form textarea,form select,form button',nodes=>nodes.every(node=>node.matches(':disabled'))),true,'all native and compound form controls lock');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.didClose),false,'pending dialog cannot close');};
 const finish=async()=>{await page.evaluate(()=>window.finish());await page.waitForFunction(()=>document.querySelector('form')?.getAttribute('aria-busy')!=='true');};
 // Native first invalid, then compound picker: neither focus is lost to the pending fieldset.
 await mount('project');await submit();await page.waitForFunction(()=>document.activeElement?.name==='name');
 await page.type('[name="name"]','Proyecto original');await submit();await page.waitForFunction(()=>document.activeElement?.closest('[data-form-field]')?.getAttribute('data-form-field')==='clientId');
 await page.click('[data-form-field="clientId"] button');await page.waitForSelector('[role="option"]');await page.click('[role="option"]');
 await submit();await page.waitForFunction(()=>window.writes.length===1);await assertLocked();
 await page.focus('[name="name"]');await page.keyboard.type('NO CAMBIAR');
 assert.equal(await page.$eval('[name="name"]',node=>node.value),'Proyecto original','typing during pending cannot mutate the draft');
 await page.evaluate(()=>window.fail());await page.waitForFunction(()=>document.activeElement?.name==='name'&&document.querySelector('form')?.getAttribute('aria-busy')!=='true');
 assert.equal(await page.$eval('[name="name"]',node=>node.value),'Proyecto original');
 assert.match(await page.$eval('form',node=>node.textContent),/Nombre rechazado por la API/);
 await submit();await page.waitForFunction(()=>window.writes.length===2);await finish();assert.equal(await page.evaluate(()=>window.completed),1);
 assert.equal(await page.evaluate(()=>window.writes[1].body.name),'Proyecto original');
 // Every native/compound control, including the bank combobox, is locked without losing RHF values.
 await mount('account');await page.type('[name="name"]','Cuenta de prueba');await submit();await page.waitForFunction(()=>window.writes.length===1);await assertLocked();
 assert.equal(await page.evaluate(()=>window.writes[0].body.name),'Cuenta de prueba');assert.equal(await page.evaluate(()=>window.writes[0].body.currency),'PYG');await finish();
 // The remaining RHF forms reuse the same actual lock and deferred compound focus.
 await mount('order');await submit();await page.waitForFunction(()=>document.activeElement?.closest('[data-form-field]')?.getAttribute('data-form-field')==='projectId');
 await page.click('[data-form-field="projectId"] button');await page.waitForSelector('[role="option"]');await page.click('[role="option"]');
 await page.type('[name="title"]','Orden sintética');await submit();await page.waitForFunction(()=>window.writes.length===1);await assertLocked();await finish();
 assert.equal(await page.evaluate(()=>window.writes[0].body.title),'Orden sintética');
 await mount('invoice');await page.click('[data-form-field="clientId"] button');await page.type('[name="total"]','1000');
 await submit();await page.waitForFunction(()=>window.writes.length===1);await assertLocked();await finish();assert.equal(await page.evaluate(()=>window.writes[0].body.total),1000);
 await mount('payment');await page.click('[data-form-field="invoiceId"] button');await page.click('[data-form-field="accountId"] button');await page.type('[name="amount"]','1000');
 await submit();await page.waitForFunction(()=>window.writes.length===1);await assertLocked();const paymentKey=await page.evaluate(()=>window.writes[0].body.requestId);await finish();assert.ok(paymentKey);
 await mount('transfer');await submit();await page.waitForFunction(()=>document.activeElement?.closest('[data-form-field]')?.getAttribute('data-form-field')==='fromAccountId');
 await page.click('[data-form-field="fromAccountId"] button');await page.waitForSelector('[role="option"]');await page.click('[role="option"]');
 await page.click('[data-form-field="toAccountId"] button');await page.waitForSelector('[role="option"]');await page.click('[role="option"]');
 await page.type('[name="amount"]','1000');await page.type('[name="receivedAmount"]','1000');await submit();await page.waitForFunction(()=>window.writes.length===1);await assertLocked();await finish();
 assert.equal(await page.evaluate(()=>window.writes[0].body.amount),'1000');assert.equal(await page.evaluate(()=>window.writes[0].body.receivedAmount),'1000');
 await mount('photo');await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('Quitar foto')).click());
 await submit();await page.waitForFunction(()=>window.writes.length===1);await assertLocked();assert.equal(await page.evaluate(()=>window.writes[0].body.photo),'');await finish();
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.didClose),true,'successful photo save clears dirty state');
 // Dirty drafts still protect dialog dismissal after an unsuccessful validation.
 await mount('project');await page.type('[name="name"]','Borrador propio');await page.keyboard.press('Escape');await page.waitForSelector('form.confirm-dialog');assert.equal(await page.evaluate(()=>window.didClose),false);
 // Colour autosave and photo controls share the pending boundary; refresh failure is not a failed save.
 await mount('appearance');const radio=await page.$('input[type="radio"]:not(:checked)');await radio.click();await page.waitForFunction(()=>window.writes.length===1);assert.equal(await page.$eval('input[type="file"]',node=>node.disabled),true);
 assert.equal(await page.$$eval('input[type="radio"]',nodes=>nodes.every(node=>node.disabled)),true);await page.evaluate(()=>window.finish());await page.waitForFunction(()=>!document.querySelector('input[type="file"]').disabled);
 assert.equal(await page.evaluate(()=>window.writes.length),1);assert.match(await page.$eval('body',node=>node.textContent),/Color guardado/);
 assert.deepEqual(errors,[]);
 console.log('PASS Chromium: RHF native/compound invalid focus, double-submit exclusion, pending input/bank lock and unchanged payload, explicit server-error retry, dirty Dialog guard, photo/color lock and refresh-failure separation.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
