// Focused real-browser regression for issue #224. Run with Chromium installed:
// PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node tests/dialog-footer-browser.test.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const repo=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Dialog,FormActions} from './app/dialog';
import {Editor} from './app/operations';
import {PersonSelect} from './app/profile-controls';
window.saved=0;window.closeCount=0;
createRoot(document.getElementById('root')).render(<Dialog title="Contrato" close={()=>{window.closeCount++;}}>
 <PersonSelect label="Custodio" value="11" choices={[{value:"",label:"Sin custodio"},{value:"11",label:"Ana",kind:"person"}]} onChange={()=>{}}/>
 <details id="editor"><summary>Editar datos y texto</summary><Editor fields={[{key:'title',label:'Título'}]} defaults={{title:'Contrato de prueba'}} save={async()=>{window.saved++;}} label="Aplicar edición a previsualización" cancelLabel={false}/></details>
 <div id="hidden-form" hidden><form><FormActions><button type="submit" onClick={event=>event.preventDefault()}>Acción oculta</button></FormActions></form></div>
</Dialog>);
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body><div id="root"></div></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();
 page.on('pageerror',error=>{console.error(error.message);});
 await page.setViewport({width:390,height:844});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.waitForSelector('[role="dialog"]');
 const footerButtons=()=>page.$$eval('.dialog-footer button',nodes=>nodes.map(node=>node.textContent));
 assert.deepEqual(await footerButtons(),[],'collapsed editor and hidden form contribute no footer actions');
 await page.click('#editor > summary');
 await page.waitForFunction(()=>document.querySelector('.dialog-footer button')?.textContent==='Aplicar edición a previsualización');
 assert.deepEqual(await footerButtons(),['Aplicar edición a previsualización']);
 assert(await page.$eval('.dialog-footer button',button=>button.form?.querySelector('input')?.value==='Contrato de prueba'),'portaled submit remains associated with its actual form');
 await page.click('.dialog-footer button');
 await page.waitForFunction(()=>window.saved===1);
 await page.click('#editor > summary');
 await page.waitForFunction(()=>document.querySelectorAll('.dialog-footer button').length===0);
 await page.click('#editor > summary');
 await page.waitForFunction(()=>document.querySelectorAll('.dialog-footer button').length===1);
 assert.deepEqual(await footerButtons(),['Aplicar edición a previsualización'],'reopening registers exactly one action');
 await page.click('#editor > summary');
 await page.waitForFunction(()=>document.querySelectorAll('.dialog-footer button').length===0);
 await page.$eval('#hidden-form',element=>{element.hidden=false;});
 await page.waitForFunction(()=>document.querySelector('.dialog-footer button')?.textContent==='Acción oculta');
 await page.$eval('#hidden-form',element=>{element.hidden=true;});
 await page.waitForFunction(()=>document.querySelectorAll('.dialog-footer button').length===0);
 await page.click('input[aria-label="Custodio"]');
 await page.waitForFunction(()=>document.querySelector('input[aria-label="Custodio"]').getAttribute('aria-expanded')==='true');
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.closeCount),0,'the first Escape closes the person menu');
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.closeCount),1,'a second Escape uses the guarded dialog dismissal');
 console.log('PASS real Chromium 390px: collapsed/hidden forms never leak portal actions; toggles register/remove once; native submit saves once.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
