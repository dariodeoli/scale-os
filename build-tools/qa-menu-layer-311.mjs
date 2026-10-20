// Real library menu inside clipped cards; no API/data fixtures required.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root=process.cwd(),require=createRequire(root+'/package.json');
const {build}=require('esbuild'),postcss=require('postcss'),tw=require('tailwindcss');
const puppeteer=createRequire(root+'/backend/package.json')('puppeteer-core');
const module=process.env.QA_MENU_BASELINE==='1'?'owncoding-ui/core':'./app/ui/menu';
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{MenuDesplegable}from'${module}';
const names=['Ver detalle y trazabilidad','Imprimir etiqueta','Verificar con detalle','Editar equipo','Archivar equipo'];
createRoot(document.getElementById('root')).render(<main style={{padding:16}}><div id="clipped" style={{height:60,width:'100%',maxWidth:300,overflow:'hidden',transform:'translateZ(0)',display:'flex',justifyContent:'flex-end',border:'1px solid'}}><MenuDesplegable ariaLabel="Acciones de prueba" trigger={<span style={{display:'grid',placeItems:'center',width:44,height:44}}>⋮</span>} items={names.map((label,id)=>({id:String(id),label,onClick:()=>{window.selected=label}}))}/></div><button id="outside">Fuera del menú</button></main>);`;
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,jsx:'automatic',platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
let css=['node_modules/owncoding-ui/dist/styles.css','app/ui-tokens.css','app/ui-system.css','app/tailwind.css'].map(p=>readFileSync(root+'/'+p,'utf8').replace(/@import[^;]+;/g,'')).join('\n');
css=(await postcss([tw({config:root+'/tailwind.config.mjs'})]).process(css,{from:root+'/app/tailwind.css'})).css;
const server=createServer((_req,res)=>{res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></body></html>')});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],errors=[];
try{
 for(const width of [320,390,1440])for(const theme of ['light','dark','contrast']){
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));await page.setViewport({width,height:568});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await page.click('[aria-haspopup="menu"]');await page.waitForSelector('[role="menuitem"]');
  const measured=await page.evaluate(()=>{const menu=document.querySelector('[role="menu"]'),card=document.getElementById('clipped'),last=menu.lastElementChild;const r=menu.getBoundingClientRect(),c=card.getBoundingClientRect(),b=last.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,cardBottom:c.bottom,hit:last.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)),labels:[...menu.querySelectorAll('[role="menuitem"]')].map(x=>x.textContent.trim())};});
  assert.equal(measured.labels.length,5);assert(measured.bottom>measured.cardBottom,'menu extends beyond clipping card');assert(measured.hit,'last action remains visible and clickable above transformed clipping ancestor');assert(measured.left>=0&&measured.right<=width&&measured.top>=0&&measured.bottom<=568,'popup stays inside viewport');
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Archivar equipo');await page.keyboard.press('Escape');await page.waitForSelector('[role="menu"]',{hidden:true});await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-haspopup')==='menu');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-haspopup')),'menu');
  await page.click('[aria-haspopup="menu"]');await page.waitForSelector('[role="menuitem"]');await page.evaluate(()=>[...document.querySelectorAll('[role="menuitem"]')].find(x=>x.textContent.trim()==='Editar equipo').click());assert.equal(await page.evaluate(()=>window.selected),'Editar equipo');
  results.push({width,theme,passed:true,...measured});await page.close();
 }
 assert.deepEqual(errors,[]);const output=process.env.QA_OUT||'/tmp/scale311-menu';mkdirSync(output,{recursive:true});writeFileSync(output+'/results.json',JSON.stringify({passed:true,results,errors},null,2)+'\n');console.log('PASS menu:9 viewport/theme cases, transformed overflow clipping, all actions, keyboard, focus return and edit');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
