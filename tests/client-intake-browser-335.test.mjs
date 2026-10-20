// Real Next SSR/hydration + Chromium; transport is intercepted, no production writes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../backend/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const origin=process.env.INTAKE_QA_ORIGIN||'http://127.0.0.1:3355';
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage(),errors=[],requests=[];let scope='basic',status=200;
 page.on('pageerror',error=>errors.push(error.message));await page.setRequestInterception(true);
 page.on('request',request=>{if(request.url().includes('/core-api/api/public/client-intake/')){requests.push({method:request.method(),data:request.postData()});void request.respond({status,contentType:'application/json',body:JSON.stringify(status!==200?{error:'Enlace vencido o no disponible'}:request.method()==='POST'?{received:true}:{scope,expires_at:'2026-10-30'})});}else void request.continue();});
 await page.setViewport({width:1440,height:1000});await page.goto(origin+'/adhesion/'+'x'.repeat(43),{waitUntil:'networkidle0'});
 await page.waitForSelector('[data-field="name"] input');assert.equal(await page.$('[data-field="legal_representative_document"]'),null);
 await page.type('[data-field="name"] input','Cliente de prueba');await page.type('[data-field="email"] input','fixture@example.invalid');
 await page.click('[data-field="consent"] input');
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Enviar para revisión').click());
 await page.waitForFunction(()=>document.body.textContent.includes('Recibimos tus datos para revisión'));
 const post=requests.find(request=>request.method==='POST');assert(post);assert.equal(JSON.parse(post.data).name,'Cliente de prueba');assert.equal(JSON.parse(post.data).consent,true);assert.equal(JSON.parse(post.data).legal_representative_same_as_client,undefined);
 scope='contract';await page.setViewport({width:390,height:844});await page.goto(origin+'/adhesion/'+'y'.repeat(43),{waitUntil:'networkidle0'});await page.waitForSelector('[data-field="legal_representative_document"]');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'390px form must not overflow horizontally');
 assert.match(await page.$eval('h1',node=>node.textContent),/contrato/);
 status=404;await page.goto(origin+'/adhesion/'+'z'.repeat(43),{waitUntil:'networkidle0'});await page.waitForFunction(()=>document.body.textContent.includes('Enlace vencido'));assert.equal(await page.$('form'),null);
 assert.deepEqual(errors,[]);console.log('PASS intake335 browser: real Next SSR/hydration, basic reviewed submission/scoped payload, complete legal form, 390px no overflow, expired token no form; synthetic transport only');
}finally{await browser.close();}
