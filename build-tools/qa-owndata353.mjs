import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(process.env.SCALE_QA_SOURCE_ROOT||process.cwd());
const dependencyRoot=resolve(process.env.SCALE_QA_DEPENDENCY_ROOT||root);
const out=resolve(process.env.SCALE_QA_OUTPUT||'/tmp/scale-owndata353-browser');await mkdir(out,{recursive:true});
const require=createRequire(`${dependencyRoot}/package.json`),backendRequire=createRequire(`${dependencyRoot}/backend/package.json`);
const {build}=require('esbuild'),puppeteer=backendRequire('puppeteer-core');
const fixture={id:'4',name:'Nombre comercial manual',legal_name:'Razón manual',email:'',phone:'',tax_id:'',notes:'',lifecycle_status:'active',updated_at:'fixture',social_links:{}};
await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{ClientEditor}from'${root}/app/client-editor';const fixture=${JSON.stringify(fixture)};createRoot(document.getElementById('root')).render(<ClientEditor mode="edit" clientId="4" record={fixture} onSaved={()=>{document.querySelector('#saved').textContent='Guardado QA';}}/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',platform:'browser',format:'iife',outfile:`${out}/app.js`,loader:{'.css':'empty'},alias:{react:resolve(dependencyRoot,'node_modules/react'),'react-dom':resolve(dependencyRoot,'node_modules/react-dom')},define:{'process.env.NODE_ENV':'"production"'}});
let css=await readFile(require.resolve('owncoding-ui/styles.css'),'utf8');
for(const sheet of ['fonts.css','ui-tokens.css','globals.css','ui-system.css','operations.css','contrast.css','dialog.css','ui/select.css','client-editor.css'])try{css+='\n'+(await readFile(resolve(root,'app',sheet),'utf8')).replace(/@import[^;]+;/g,'');}catch{}
const writes=[],requests=[],errors=[];
let mode='success';
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}if(url.pathname==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(`${out}/app.js`));return;}if(url.pathname.startsWith('/fonts/')){try{res.end(await readFile(resolve(root,'public',url.pathname.slice(1))));}catch{res.statusCode=404;res.end();}return;}if(url.pathname.startsWith('/core-api/')){let text='';for await(const chunk of req)text+=chunk;const body=text?JSON.parse(text):null;requests.push({path:url.pathname,method:req.method,body});res.setHeader('Content-Type','application/json');if(url.pathname.endsWith('/ruc-lookup')){await new Promise(r=>setTimeout(r,120));if(mode==='rate'){res.statusCode=429;res.setHeader('Retry-After','60');res.end(JSON.stringify({error:'OwnData alcanzó el límite de consultas. Esperá 60 segundos o completá manualmente.',code:'DAILY_QUOTA_REACHED',retry_after:60}));return;}if(mode==='error'){res.statusCode=503;res.end(JSON.stringify({error:'OwnData no autorizó la clave del servidor. Podés cargar los datos manualmente.',code:'API_KEY_EXPIRED',provider_status:401}));return;}if(mode==='missing'){res.end(JSON.stringify({record:null,cached:false,remaining:99}));return;}res.end(JSON.stringify({record:{name:'PEREZ, ANA',tax_id:'80168807-8',tax_state:'',source:'owndata:dnit_official_snapshot',publication_date:'2026-10-01',...(body.subjectKind==='individual'?{display_name:'ANA PEREZ'}:{})},cached:false,remaining:99}));return;}if(req.method==='PATCH'){writes.push(body);res.end(JSON.stringify({client:{...fixture,...body}}));return;}res.end(JSON.stringify({}));return;}mode=url.searchParams.get('mode')||'success';res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\nbody{margin:0}.qa-main{padding:12px;max-width:1100px;margin:auto;min-width:0}</style></head><body class="control-shell"><main class="qa-main"><div id="root"></div><p id="saved"></p></main><script src="/app.js"></script></body></html>`);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.SCALE_QA_CHROME||process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>new URL(r.url()).hostname==='127.0.0.1'?r.continue():r.abort());
const origin=`http://127.0.0.1:${server.address().port}`;
async function field(name,value){await page.waitForSelector(`input[name="${name}"]`);const h=await page.$(`input[name="${name}"]`);await h.click();await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await h.type(value);await page.keyboard.press('Tab');}
async function button(text){const h=await page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(e=>e.getClientRects().length&&e.textContent.includes(text)),text);assert(h.asElement(),`button ${text}`);await h.asElement().click();}
async function ready(query=''){await page.goto(origin+query,{waitUntil:'networkidle0'});await page.waitForSelector('input[name="tax_id"]');}
async function clientType(label){const choice=await page.evaluateHandle(()=>[...document.querySelectorAll('.ops-select')].find(e=>e.textContent.includes('Tipo de cliente'))?.querySelector('button'));assert(choice.asElement(),'explicit client type selector');await choice.asElement().click();await page.waitForSelector('[role="option"]');const option=await page.evaluateHandle(label=>[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent.includes(label)),label);assert(option.asElement());await option.asElement().click();}
async function lookup(){await field('tax_id','80168807-8');await button('Extraer datos del RUC');await page.waitForSelector('[data-ui-lookup-review]');}
try{
 for(const width of [390,1440]){
 await page.setViewport({width,height:900});await ready();await lookup();
 assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'Razón manual');
 assert.equal(requests.at(-1).body.subjectKind,undefined,'default never claims person');
 assert(!(await page.evaluate(()=>document.body.textContent)).includes('Estado tributario'),'no fiscal status UI');
 await button('Aplicar');assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'PEREZ, ANA');
 assert.equal(await page.$eval('input[name="name"]',e=>e.value),'Nombre comercial manual');
 const n=requests.filter(r=>r.path.endsWith('/ruc-lookup')).length;
 await button('Guardar');await page.waitForFunction(()=>document.querySelector('#saved').textContent==='Guardado QA');
 assert.equal(requests.filter(r=>r.path.endsWith('/ruc-lookup')).length,n,'save does not requery');
 assert.equal(requests.filter(r=>r.path.endsWith('/ruc-refresh')).length,0,'save never refreshes automatically');
 assert(writes.at(-1).legal_name==='PEREZ, ANA');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
 await page.screenshot({path:`${out}/success-${width}.png`,fullPage:true});
 }
 await ready();await lookup();await field('legal_name','Editado mientras revisaba');await button('Aplicar');assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'Editado mientras revisaba','stale review does not overwrite new edit');
 await ready();await lookup();await button('Descartar');assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'Razón manual');
 for(const scenario of ['rate','error','missing']){await ready(`/?mode=${scenario}`);await field('tax_id','80168807-8');const n=requests.filter(r=>r.path.endsWith('/ruc-lookup')).length;await button('Extraer datos del RUC');await page.waitForFunction(()=>document.querySelector('[data-lookup-state="error"]')||document.querySelector('[data-lookup-state="not-found"]'));await new Promise(r=>setTimeout(r,350));assert.equal(requests.filter(r=>r.path.endsWith('/ruc-lookup')).length,n+1);assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'Razón manual');await field('legal_name','Manual disponible');assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'Manual disponible');}

 await ready();await field('name','');
 await clientType('Persona física');
 await lookup();assert.equal(requests.at(-1).body.subjectKind,'individual');assert.match(await page.$eval('[data-ui-lookup-review]',e=>e.textContent),/ANA PEREZ/);
 await button('Aplicar');assert.equal(await page.$eval('input[name="name"]',e=>e.value),'ANA PEREZ','confirmed presentation fills empty commercial name');assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'PEREZ, ANA','official legal text preserved');
 await ready();await field('name','');await clientType('Persona física');await lookup();await clientType('Empresa / persona jurídica');await button('Aplicar');assert.equal(await page.$eval('input[name="name"]',e=>e.value),'','stale person presentation does not apply after company selection');assert.equal(await page.$eval('input[name="legal_name"]',e=>e.value),'Razón manual');
 await ready();const beforeInvalid=requests.length;await field('tax_id','80168807-0');await button('Extraer datos del RUC');await page.waitForFunction(()=>document.body.textContent.includes('dígito verificador'));assert.equal(requests.length,beforeInvalid,'invalid supplied DV never sent');
 await ready();await field('tax_id','80168807-8');const beforeDouble=requests.filter(r=>r.path.endsWith('/ruc-lookup')).length;
 await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Extraer datos del RUC'));b.click();b.click();});await page.waitForSelector('[data-ui-lookup-review]');assert.equal(requests.filter(r=>r.path.endsWith('/ruc-lookup')).length,beforeDouble+1,'double click one request');
 assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({scope:'Actual ClientEditor, local synthetic HTTP only, no provider key/auth/production validation',viewports:[390,1440],checks:['confirmation','official company text unchanged','manual names preserved','no fiscal UI','no duplicate lookup on save','stale review protection','discard','rate/error/not-found manual fallback','no automatic retry','no horizontal overflow','explicit person presentation','official legal name preserved with presentation','invalid DV before network','double click one request','stale person/company type protected'],requests,writes,pageErrors:errors},null,2));console.log('PASS browser form checks',out);
}catch(e){await writeFile(`${out}/failure.json`,JSON.stringify({error:e.message,body:await page.evaluate(()=>document.body.innerText),requests,pageErrors:errors},null,2));throw e;}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
