import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const requireBackend=createRequire(new URL('../backend/package.json',import.meta.url));
const browser=await requireBackend('puppeteer-core').launch({executablePath:process.env.SCALE_QA_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const fixture={can_manage:true,can_print:true,printers:[{id:'p1',name:'Impresora térmica principal',width_mm:80,enabled:true,connection:'lan',destination:'lan:192.168.1.10:9100',copies:1,auto_cut:false}],bridges:[],templates:[{id:'t1',name:'Plantilla de prueba',kind:'test',version:1,definition:{version:1,widthMm:80,heightMm:'auto',orientation:'portrait',marginsMm:{top:2,left:4,right:4,bottom:2},fontSize:10,autoCut:false}}],jobs:[{id:'j1',reference:'INV-42',state:'incierto',printer_id:'p1',template_id:'t1',template_version:1,copies:1,created_at:'2026-10-19T00:00:00Z'}],audit:[]};
try{
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {PrintingWorkspace} from './app/printing-workspace';createRoot(document.getElementById('root')).render(<PrintingWorkspace/>);`},bundle:true,jsx:'automatic',write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixtures',setup(build){build.onLoad({filter:/workspace-request\.ts$/},()=>({contents:'export async function request(){return window.fixture};export function transporteError(e){return e}',loader:'js'}));build.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]});
 const css=['ui-tokens.css','globals.css','qa-fixes.css','mobile-forms.css','ui-system.css','dialog.css','ui/field.css','contrast.css','printing-workspace.css'].map(file=>readFileSync(new URL(`../app/${file}`,import.meta.url),'utf8')).join('\n');
 for(const width of [280,320,390,768,1440]){
  const page=await browser.newPage();page.on('pageerror',error=>console.error(error.message));await page.setViewport({width,height:900,isMobile:width<768,hasTouch:width<768});await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><main id="root"></main>');await page.addStyleTag({content:css});await page.evaluate(fixture=>{window.fixture=fixture;},fixture);await page.addScriptTag({content:bundle.outputFiles[0].text});await page.waitForSelector('.printing-workspace');await page.waitForFunction(()=>document.body.textContent.includes('Editar plantilla'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`page overflow ${width}`);
  await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Editar plantilla').click());await page.waitForSelector('iframe');if(width===280)await page.addStyleTag({content:'.ops-dialog{width:250px!important;min-width:0!important}'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`dialog overflow ${width}`);
  const iframe=page.frames().find(frame=>frame!==page.mainFrame());assert.ok(iframe);await iframe.waitForSelector('main[data-width-mm="80"]');await iframe.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  const frameBounds=await page.$eval('iframe',node=>{const rect=node.getBoundingClientRect();return {left:rect.left,right:rect.right,viewport:innerWidth};});assert(frameBounds.left>=0&&frameBounds.right<=frameBounds.viewport,`iframe outside viewport ${JSON.stringify(frameBounds)}`);const iframeMetrics=await iframe.evaluate(()=>({page:innerWidth,scroll:document.documentElement.scrollWidth}));assert(iframeMetrics.scroll<=iframeMetrics.page,`preview horizontal overflow ${width}`);console.log(JSON.stringify({width,iframeMetrics}));
  await page.close();
 }
 console.log('PASS printing workspace page/dialog desktop/mobile widths; sandboxed shared preview, synthetic API only.');
}finally{await browser.close();}
