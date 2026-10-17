// Real canonical Editor/Dialog DOM with synthetic transport; DB authorization/CRUD has an independent PGlite suite.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const repo=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:`
import React from'react';import{createRoot}from'react-dom/client';import{ClientContacts}from'./app/client-contacts';
const root=createRoot(document.getElementById('root'));window.calls=[];window.records=[];window.conflict=false;let key=0,next=1;
window.fetch=async(input,init={})=>{
 const url=new URL(String(input),'http://fixture.invalid'),method=init.method||'GET',body=init.body?JSON.parse(init.body):{};window.calls.push({path:url.pathname,method,body});
 const id=url.pathname.split('/').at(-1),existing=window.records.find(row=>row.id===id);
 const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 if(method==='GET')return respond(existing?{contact:existing}:{contacts:window.records,page:{has_more:false}});
 if(method==='POST'){const contact={...body,id:String(next++),version:1};window.records.push(contact);return respond({contact},201)}
 if(window.conflict){window.conflict=false;existing.version++;existing.role='Cambio del servidor';return respond({error:'El contacto cambió'},409)}
 if(method==='PATCH'){Object.assign(existing,body,{version:existing.version+1});return respond({contact:existing})}
 if(method==='DELETE'){window.records=window.records.filter(row=>row.id!==id);return respond({ok:true})}
 return respond({error:'unexpected'},500);
};
window.mount=restricted=>root.render(<React.Fragment key={++key}><ClientContacts clientId="41" restricted={restricted}/><ClientContacts clientId="41" restricted={restricted}/></React.Fragment>);window.mount(false);
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html><body><div id="root"></div></body></html>')});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
 const click=async(label)=>{await page.evaluate(label=>{const scope=[...document.querySelectorAll('[role="dialog"]')].at(-1)||document;const node=[...scope.querySelectorAll('button')].find(button=>button.textContent.trim()===label||button.getAttribute('aria-label')===label);if(!node)throw Error('Missing '+label);node.focus();},label);await page.keyboard.press('Enter')};
 const set=async(key,value)=>{const selector='[data-field="'+key+'"] input';await page.click(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await page.type(selector,value)};
 let checks=0;
 for(const width of [1440,390]){
  await page.setViewport({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({content:compiled.outputFiles[0].text});
  await page.waitForFunction(()=>document.body.textContent.includes('todavía no tiene contactos adicionales'));
  await click('Agregar contacto');await page.waitForSelector('[data-field="name"] input');
  await set('name','Contacto QA');await set('role','Coordinación');await set('email','contacto@example.invalid');
  await click('Agregar contacto');await page.waitForFunction(()=>window.records.length===1&&document.querySelectorAll('[role="dialog"]').length===0);
  assert.equal(await page.evaluate(()=>window.calls.filter(call=>call.method==='POST').length),1);checks++;
  await click('Editar contacto: Contacto QA');await page.waitForSelector('[data-field="name"] input');
  assert.equal(await page.$eval('[data-field="email"] input',node=>node.value),'contacto@example.invalid');checks++;
  await set('role','Borrador conservado');await page.evaluate(()=>window.conflict=true);await click('Guardar contacto');
  await page.waitForFunction(()=>document.body.textContent.includes('Tu borrador sigue visible'));
  assert.equal(await page.$eval('[data-field="role"] input',node=>node.value),'Borrador conservado');checks++;
  await click('Recargar versión actual');await page.waitForFunction(()=>document.body.textContent.includes('Se reemplazará el borrador visible'));
  await click('Cancelar');assert.equal(await page.$eval('[data-field="role"] input',node=>node.value),'Borrador conservado');checks++;
  await click('Recargar versión actual');await click('Reemplazar borrador');await page.waitForFunction(()=>document.querySelector('[data-field="role"] input')?.value==='Cambio del servidor');
  await set('role','Compras');await click('Guardar contacto');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===0);
  assert.equal(await page.evaluate(()=>window.records[0].role),'Compras');checks++;
  await page.waitForFunction(()=>document.querySelectorAll('li').length===2&&[...document.querySelectorAll('li')].every(node=>node.textContent.includes('Compras')));checks++;
  assert.equal(await page.evaluate(()=>window.calls.filter(call=>call.method==='PATCH').at(-1).body.expected_version),2);checks++;
  await click('Eliminar contacto: Contacto QA');await page.waitForFunction(()=>document.querySelector('[role="dialog"]')?.textContent.includes('Se elimina sólo este contacto'));
  await click('Cancelar');assert.equal(await page.evaluate(()=>window.records.length),1);checks++;
  await click('Eliminar contacto: Contacto QA');await click('Eliminar contacto');await page.waitForFunction(()=>window.records.length===0&&document.querySelectorAll('[role="dialog"]').length===0);
  assert.equal(await page.evaluate(()=>window.calls.filter(call=>call.method==='DELETE').length),1);checks++;
  const calls=await page.evaluate(()=>window.calls.length);await page.evaluate(()=>window.mount(true));await page.waitForFunction(()=>document.body.textContent.includes('Contactos reservados'));
  assert.equal(await page.evaluate(()=>window.calls.length),calls);assert.equal(await page.$('button'),null);checks+=2;
 }
 assert.deepEqual(errors,[]);console.log('PASS client contacts Chromium: '+checks+' checks; canonical create/edit/CAS draft/reload confirmation/delete cancellation/versioned mutation/PII restricted no request at1440/390; synthetic transport, no full-app CSS or external provider claims');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
