import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const repo=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{DateInput,TimeInput,DateTimeInput,MonthInput}from'./app/ui/temporal';import{Editor}from'./app/operations';import{Dialog}from'./app/dialog';
const root=createRoot(document.getElementById('root'));const kinds={date:DateInput,time:TimeInput,datetime:DateTimeInput,month:MonthInput};
window.mount=(kind,initial,opts={})=>{window.changes=[];window.saved=[];function App(){const[value,setValue]=useState(initial),[other,setOther]=useState('');window.background=setValue;const C=kinds[kind];return <form onSubmit={event=>{event.preventDefault();window.saved.push(value);}}><C id="subject" name="temporal" value={value} min={opts.min} max={opts.max} required={opts.required} onChange={event=>{window.changes.push({value:event.target.value,event:event.nativeEvent.type,dom:event.target instanceof HTMLInputElement});setValue(event.target.value);}}/><input id="other" value={other} onChange={event=>setOther(event.target.value)}/><button type="submit">Guardar principal</button></form>;}root.render(<App key={kind+initial+JSON.stringify(opts)}/>);};
window.mountEditor=()=>{window.saved=[];root.render(<Dialog title="Editor temporal" close={()=>{}}><Editor fields={[{key:'date',label:'Fecha',type:'date',optional:true},{key:'other',label:'Otro'}]} defaults={{date:'2026-10-17',other:'Inicial'}} save={async value=>{window.saved.push(value);}}/></Dialog>);};
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<div id="root"></div>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LANG:'en_US.UTF-8'}});
try{
 const page=await browser.newPage();page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:bundle.outputFiles[0].text});
 const mount=async(kind,initial,opts={})=>{await page.evaluate(([kind,initial,opts])=>window.mount(kind,initial,opts),[kind,initial,opts]);await page.waitForFunction(initial=>document.querySelector('#subject')?.value===initial,{},initial);};
 const type=async(selector,value)=>{await page.focus(selector);await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.type(value);};
 const open=async()=>{await page.click('[data-ui-temporal]>button');await page.waitForSelector('.ui-temporal-dialog');};
 const click=async label=>{await page.evaluate(label=>Array.from(document.querySelectorAll('.ui-temporal-dialog button, .dialog-footer button')).find(button=>button.textContent===label)?.click(),label);};
 const closeWait=()=>page.waitForFunction(()=>!document.querySelector('.ui-temporal-dialog'));
 for(const [kind,initial,partial] of [['date','2026-10-17','2026-02-'],['time','13:45','13:'],['datetime','2026-10-17T13:45','2026-02-'],['month','2026-10','2026-']]){
  await mount(kind,initial);assert.equal(await page.$eval('#subject',node=>node.type),'text');
  await type('#subject',partial);await page.type('#other','rerender');assert.equal(await page.$eval('#subject',node=>node.value),partial);
  assert.equal(await page.$eval('#subject',node=>node.validity.valid),false);assert.equal(await page.$eval('#subject',node=>node.validity.badInput),false);
  await open();await page.keyboard.press('Escape');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),partial);
  await open();await click('Cancelar');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),partial);
  assert.equal(await page.evaluate(()=>window.changes.some(change=>change.value==='')),false,'partial values never become an optional empty payload');
 }
 await mount('date','2026-10-17',{min:'2026-01-01',max:'2026-12-31'});await open();
 await page.$eval('.ui-temporal-dialog input[type=date]',node=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,'2027-01-01');node.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.$eval('.dialog-footer button[type=submit]',node=>node.disabled),true,'range violation cannot apply');await click('Cancelar');await closeWait();
 await open();await page.$eval('.ui-temporal-dialog input[type=date]',node=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,'2026-11-22');node.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('Aplicar');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),'2026-11-22');assert.deepEqual(await page.evaluate(()=>window.changes.at(-1)),{value:'2026-11-22',event:'input',dom:true});
 // A background update invalidates the selection snapshot and survives both Apply and Cancel.
 await open();await page.evaluate(()=>window.background('2026-12-15'));await page.waitForFunction(()=>document.querySelector('.ui-temporal-dialog [role=alert]')?.textContent.includes('cambió'));
 assert.equal(await page.$eval('.dialog-footer button[type=submit]',node=>node.disabled),true);await click('Cancelar');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),'2026-12-15');
 // Empty clocks stay empty until chosen; all visible clock controls are explicitly 24h even with en-US browser locale.
 await mount('time','');await open();assert.deepEqual(await page.$$eval('.ui-temporal-clock input',nodes=>nodes.map(node=>node.value)),['','']);
 assert.equal(await page.$eval('.dialog-footer button[type=submit]',node=>node.disabled),true);
 await type('[aria-label="Horas (00–23)"]','23');await type('[aria-label="Minutos (00–59)"]','59');await click('Aplicar');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),'23:59');
 await open();await page.focus('[aria-label="Horas (00–23)"]');await page.keyboard.press('ArrowUp');await click('Cancelar');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),'23:59');
 await mount('time','23:30',{min:'22:00',max:'06:00'});assert.equal(await page.$eval('#subject',node=>node.validity.valid),true);await type('#subject','12:00');assert.equal(await page.$eval('#subject',node=>node.validity.valid),false);
 await mount('datetime','2026-10-17T13:45');await open();await type('[aria-label="Horas (00–23)"]','22');await type('[aria-label="Minutos (00–59)"]','07');await click('Aplicar');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),'2026-10-17T22:07');
 await mount('month','2026-10');await open();await page.$eval('input[type=month]',node=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,'2026-11');node.dispatchEvent(new Event('input',{bubbles:true}));});await click('Aplicar');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),'2026-11');
 await open();await click('Borrar valor');await closeWait();assert.equal(await page.$eval('#subject',node=>node.value),'');
 // Actual optional Editor regression: editing another field cannot turn incomplete or impossible dates into ''.
 await page.evaluate(()=>window.mountEditor());await page.waitForSelector('[data-field=date] input');
 for(const raw of ['2026-02-','2026-02-31']){await type('[data-field=date] input',raw);await type('[data-field=other] input','Cambio ajeno');await page.click('button[type=submit]');assert.equal(await page.evaluate(()=>window.saved.length),0);assert.equal(await page.$eval('[data-field=date] input',node=>node.value),raw);}
 await type('[data-field=date] input','');await page.keyboard.press('Backspace');await page.click('button[type=submit]');await page.waitForFunction(()=>window.saved.length===1);assert.equal(await page.evaluate(()=>window.saved[0].date),'');
 assert.deepEqual(errors,[]);console.log('PASS Chromium en-US: four raw temporal drafts, staged Apply/Cancel/Escape, real DOM/RHF events, range/overnight bounds, 24h clocks, stale selection guard and optional Editor partial/impossible/explicit-clear regression.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
