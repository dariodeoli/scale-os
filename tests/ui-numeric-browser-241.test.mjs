// Raw numeric drafts in real controls, native forms, RHF and the canonical Editor.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createServer} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const repo=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`
import React,{useRef,useState}from'react';import{createRoot}from'react-dom/client';import{useForm}from'react-hook-form';
import{InputControl}from'./app/ui/input-control';import{NumberInput,PercentageInput}from'./app/ui/number';import{Editor}from'./app/operations';import{Dialog}from'./app/dialog';
const root=createRoot(document.getElementById('root'));window.writes=[];
function Native({rhf=false}){const[value,setValue]=useState(''),ref=useRef(null),form=useForm({defaultValues:{amount:''}});return <form data-mode={rhf?'rhf':'native'} onSubmit={rhf?form.handleSubmit(values=>window.writes.push(values)):event=>{event.preventDefault();window.writes.push({amount:ref.current.value});}}><label>Valor<InputControl id="numeric" type="number" min={-2} max={2} step="0.1" required {...(rhf?form.register('amount'):{ref,value,onChange:event=>setValue(event.target.value)})}/></label><button type="submit">Guardar</button></form>;}
function Facade(){const[value,setValue]=useState(''),[percent,setPercent]=useState('0.125'),[whole,setWhole]=useState('0');return <form data-mode="facade" onSubmit={event=>{event.preventDefault();window.writes.push({value,percent,whole});}}><NumberInput id="numeric" policy="decimal" value={value} onChange={setValue} step="any" required/><PercentageInput id="ratio" policy="ratio" min="0" max="1" precision={3} value={percent} onChange={setPercent}/><PercentageInput id="percent" policy="integer-percent" min="0" max="100" value={whole} onChange={setWhole}/><button type="submit">Guardar</button></form>;}
window.mount=mode=>{window.writes=[];root.render(mode==='editor'?<Dialog key={mode} title="Numérico QA" close={()=>{}}><Editor fields={[{key:'count',label:'Cantidad',type:'number',integer:true},{key:'decimal',label:'Decimal',type:'number',min:'-2',max:'2'}]} defaults={{count:'0',decimal:''}} save={async values=>{window.writes.push(values);}}/></Dialog>:mode==='facade'?<Facade key={mode}/>:<Native key={mode} rhf={mode==='rhf'}/>);};
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body><div id="root"></div></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:bundle.outputFiles[0].text});
 const replace=async(selector,value)=>{await page.click(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');if(value)await page.keyboard.type(value,{delay:30});};
 const submit=()=>page.evaluate(()=>document.querySelector('form').requestSubmit());
 for(const mode of ['native','rhf','facade']){
  await page.evaluate(mode=>window.mount(mode),mode);await page.waitForSelector(`form[data-mode="${mode}"]`);
  for(const value of ['-','.','-.']){await replace('#numeric',value);assert.equal(await page.$eval('#numeric',node=>node.value),value,`${mode} retains ${value}`);assert.equal(await page.$eval('#numeric',node=>node.selectionStart),value.length);await submit();assert.equal(await page.evaluate(()=>window.writes.length),0,`${mode} invalid draft does not save`);}
  await replace('#numeric','1.2');await page.keyboard.press('ArrowLeft');await page.keyboard.type('0');assert.equal(await page.$eval('#numeric',node=>node.value),'1.02');assert.equal(await page.$eval('#numeric',node=>node.selectionStart),3,'caret stays at actual edit point');
  if(mode!=='facade'){
   for(const value of ['2.1','-2.1','0.11']){await replace('#numeric',value);assert.equal(await page.$eval('#numeric',node=>node.checkValidity()),false);await submit();assert.equal(await page.evaluate(()=>window.writes.length),0);}
  }
  await replace('#numeric','-1.2');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.writes.length===1);assert.equal(await page.evaluate(()=>window.writes[0].amount??window.writes[0].value),'-1.2');
  await replace('#numeric','0');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.writes.length===2);assert.equal(await page.evaluate(()=>window.writes[1].amount??window.writes[1].value),'0');
  if(mode!=='facade'){await replace('#numeric','1e0');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.writes.length===3);assert.equal(await page.evaluate(()=>window.writes[2].amount),'1e0','native scientific notation remains raw');await replace('#numeric','1e-');await submit();assert.equal(await page.evaluate(()=>window.writes.length),3,'unfinished exponent is retained and invalid');assert.equal(await page.$eval('#numeric',node=>node.value),'1e-');}
  if(mode==='facade'){
   assert.equal(await page.$eval('#ratio',node=>node.value),'0.125','ratio unit and precision stay unchanged');
   await replace('#percent','100.5');await submit();assert.equal(await page.evaluate(()=>window.writes.length),2,'integer percent rejects fractions');
   await replace('#percent','101');await submit();assert.equal(await page.evaluate(()=>window.writes.length),2,'explicit max100 remains enforced');
   await replace('#percent','100');await submit();await page.waitForFunction(()=>window.writes.length===3);assert.equal(await page.evaluate(()=>window.writes[2].percent),'0.125');assert.equal(await page.evaluate(()=>window.writes[2].whole),'100');
  }
 }
 await page.evaluate(()=>window.mount('editor'));await page.waitForSelector('[data-field="decimal"] input');
 for(const value of ['-','.','-.','0.001','2.01']){await replace('[data-field="decimal"] input',value);await submit();await page.waitForFunction(()=>document.activeElement?.name==='decimal'&&!document.querySelector('form[aria-busy=true]'));assert.equal(await page.evaluate(()=>window.writes.length),0,'Editor noValidate still blocks invalid numeric data');assert.equal(await page.$eval('[data-field="decimal"] input',node=>node.value),value);}
 await replace('[data-field="decimal"] input','-1.25');await replace('[data-field="count"] input','-1');await submit();await page.waitForFunction(()=>document.activeElement?.name==='count');assert.equal(await page.evaluate(()=>window.writes.length),0,'Editor keeps its unsigned integer business rule');
 await replace('[data-field="count"] input','0');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.writes.length===1);assert.deepEqual(await page.evaluate(()=>window.writes[0]),{count:'0',decimal:'-1.25'});
 assert.deepEqual(errors,[]);console.log('PASS Chromium: raw partials/caret in native, RHF and string facades; HTML validity format/bounds/step; zero/negative unchanged; percent vs ratio units; Editor noValidate blocks invalid drafts and restores precise error focus, existing integer policy preserved.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
