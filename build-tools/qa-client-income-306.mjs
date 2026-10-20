// Refs #306: actual React editor + canonical CSS; synthetic API, no production data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
const root=process.cwd(),require=createRequire(root+'/package.json');
const {build}=require('esbuild'),postcss=require('postcss'),tw=require('tailwindcss');
const puppeteer=createRequire(root+'/backend/package.json')('puppeteer-core'),componentCss=new Set();
const output=process.env.QA_OUT||'/tmp/scale306-client-income';mkdirSync(output,{recursive:true});
const bundle=await build({plugins:[{name:'css',setup(b){b.onLoad({filter:/\.css$/},args=>{componentCss.add(args.path);return{contents:'',loader:'js'};});}}],stdin:{contents:readFileSync(root+'/tests/fixtures/client-monthly-income-306.tsx.txt','utf8'),resolveDir:root,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const styles=['node_modules/owncoding-ui/dist/styles.css','app/ui-tokens.css','app/globals.css','app/qa-fixes.css','app/mobile-forms.css','app/ui-system.css','app/ui/field.css','app/contrast.css','app/tailwind.css'];
let css=[...new Set([...styles.map(p=>root+'/'+p),...componentCss])].map(p=>readFileSync(p,'utf8').replace(/@import[^;]+;/g,'')).join('\n');css=(await postcss([tw({config:root+'/tailwind.config.mjs'})]).process(css,{from:root+'/app/tailwind.css'})).css;
const server=createServer((_req,res)=>{res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[],errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const clickText=async text=>{await page.evaluate(text=>{const root=[...document.querySelectorAll('[role="dialog"]')].at(-1)||document;const n=[...root.querySelectorAll('button')].find(n=>n.textContent.trim()===text||n.getAttribute('aria-label')===text);if(!n)throw Error('Missing button '+text);n.setAttribute('data-qa-target','1');n.scrollIntoView({block:'center'});},text);await page.click('[data-qa-target="1"]');await page.evaluate(()=>document.querySelector('[data-qa-target]')?.removeAttribute('data-qa-target'));};
 const input=async(selector,value)=>{await page.waitForSelector(selector,{visible:true});await page.$eval(selector,n=>n.scrollIntoView({block:'center'}));await page.click(selector,{clickCount:3});await page.keyboard.press('Backspace');await page.type(selector,value);};
 const fit=async()=>{const result=await page.evaluate(()=>({documentOverflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...document.querySelectorAll('[role="dialog"] input:not([type="hidden"]),[role="dialog"] textarea,[role="dialog"] button')].filter(n=>n.getBoundingClientRect().width>0).map(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth};}).filter(n=>n.left < -1||n.right>n.width+1)}));assert.equal(result.documentOverflow,false);assert.deepEqual(result.controls,[]);};
 for(const [width,height] of [[320,844],[390,844],[1440,900]])for(const theme of ['light','dark','contrast']){
  await page.setViewport({width,height,isMobile:width<768,hasTouch:width<768});await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await clickText('Importe del mes y extras');await page.waitForSelector('.client-monthly-income');await fit();
  await clickText('Agregar servicio extra');await clickText('Guardar ingreso del mes');assert.equal(await page.evaluate(()=>window.incomeWrites.length),0,'incomplete form must not write');
  await input('[data-field="label"] input','Rodaje extra de ejemplo con nombre extenso');await input('[data-field="amount"] input','450000');await input('[data-field="reason"] textarea','Servicio adicional confirmado para este mes');await fit();await clickText('Guardar ingreso del mes');await page.waitForFunction(()=>window.incomeWrites.length===1&&document.querySelector('.client-monthly-entry'));
  assert.equal(await page.evaluate(()=>window.incomeWrites[0].body.kind),'extra');assert.equal(await page.evaluate(()=>window.incomeWrites[0].body.month),'2026-10');await fit();
  await page.screenshot({path:output+`/extra-${width}-${theme}.png`,fullPage:false});
  await clickText('Editar');await input('[data-field="amount"] input','500000');await input('[data-field="reason"] textarea','Precio corregido según acuerdo del cliente');await clickText('Guardar ingreso del mes');await page.waitForFunction(()=>window.incomeWrites.length===2&&!document.querySelector('.client-monthly-editor'));
  assert.equal(await page.evaluate(()=>window.incomeWrites[1].method),'PATCH');assert.equal(await page.evaluate(()=>window.incomeWrites[1].body.expectedRevision),'2');
  await clickText('Eliminar');await input('[data-field="reason"] textarea','Servicio cancelado por el cliente de ejemplo');await clickText('Eliminar registro');await page.waitForFunction(()=>window.incomeWrites.length===3&&!document.querySelector('.client-monthly-entry'));await fit();assert.equal(await page.evaluate(()=>window.incomeWrites[2].method),'DELETE');assert.equal(await page.evaluate(()=>window.incomeRefreshes),3);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Importe del mes y extras');
  results.push({width,height,theme,passed:true,actions:['required-validation','create-extra-without-plan','edit-extra','delete-extra','refresh-origin','escape-focus-return'],api:'synthetic',components:'real',horizontalOverflow:false});console.log('PASS',width,theme);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();writeFileSync(output+'/results.json',JSON.stringify({passed:results.length===9&&errors.length===0,results,errors,limitations:['Chromium viewport/touch emulation only','Synthetic API transport; no production customer changes','No physical device, Safari or real keyboard claim']},null,2)+'\n');}
