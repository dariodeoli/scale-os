// Run against a built Next checkout: QA_BASE_URL=http://127.0.0.1:31292 node build-tools/qa-portal-next-292.mjs
// Authenticated API responses are synthetic and intercepted before any network request.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createServer,request as httpRequest} from 'node:http';
const require=createRequire(new URL('../backend/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const nextBase=new URL(process.env.QA_BASE_URL||'http://127.0.0.1:31292');
assert(['127.0.0.1','localhost'].includes(nextBase.hostname),'Only a local Next server is allowed');
// Exercise the actual host-aware middleware without resolving production DNS.
const proxy=createServer((incoming,outgoing)=>{const upstream=httpRequest(new URL(incoming.url,nextBase),{method:incoming.method,headers:{...incoming.headers,host:'app.scaleparaguay.com'}},response=>{outgoing.writeHead(response.statusCode||502,response.headers);response.pipe(outgoing);});upstream.on('error',()=>outgoing.writeHead(502).end());incoming.pipe(upstream);});
await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
const base=new URL('http://127.0.0.1:'+proxy.address().port);
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const delivery={id:42,title:'Entrega'+ 'SinSeparadores'.repeat(14),summary:'Entrega sintética para revisar la distribución y los controles.',asset_name:'Archivo'+ 'SinSeparadores'.repeat(14)+'.pdf',version:4,project_name:'Proyecto '+ 'Extenso'.repeat(20),client_name:'Cliente '+ 'Extenso'.repeat(20),due_date:'2026-10-19',due_time:'14:30'};
const measurements=[],requests=[],errors=[];
try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));await page.setRequestInterception(true);
 page.on('request',request=>{const url=new URL(request.url());if(url.origin!==base.origin)return request.abort();
  if(url.pathname.startsWith('/core-api/')){
   requests.push({path:url.pathname,method:request.method(),body:request.postData()||null});
   let data={ok:true};if(url.pathname.endsWith('/me'))data={user:{fullName:'Persona QA'}};
   else if(url.pathname.endsWith('/activity'))data={activity:[{kind:'version',at:'2026-10-19T12:00:00Z',version:4,actor_name:'Persona QA',summary:'Publicación de prueba'}]};
   else if(url.pathname.endsWith('/deliveries'))data={deliveries:[delivery]};
   else if(url.pathname.endsWith('/deliveries/42'))data={delivery,links:[{id:1,label:'Archivo'+ 'SinSeparadores'.repeat(16),url:base.origin+'/fixture-download'}],comments:[{id:1,body:'Comentario'+ 'SinSeparadores'.repeat(16),created_at:'2026-10-19T12:00:00Z',author_name:'Persona'+ 'SinSeparadores'.repeat(16)}],decision:null};
   return request.respond({status:200,contentType:'application/json',body:JSON.stringify(data)});
  }
  return request.continue();
 });
 for(const theme of ['light','dark','contrast'])for(const [width,height] of [[320,844],[390,844],[768,844],[1024,844],[1440,844],[844,390],[1024,600]])for(const view of ['list','detail']){
  await page.setViewport({width,height,hasTouch:true});await page.goto(new URL(view==='list'?'/cliente/entregas':'/cliente/entregas/42',base).href,{waitUntil:'networkidle0'});
  await page.waitForSelector(view==='list'?'.delivery-list article':'textarea[required]');await page.evaluate(async theme=>{document.documentElement.dataset.theme=theme;await document.fonts.ready;},theme);
  const measured=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).length,clipped:[...document.querySelectorAll('.client-portal *')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width>0&&(rect.left<0||rect.right>innerWidth+1||(node.clientWidth>0&&!['INPUT','TEXTAREA'].includes(node.tagName)&&node.scrollWidth>node.clientWidth+1));}).map(node=>node.tagName+':'+node.className),shortButtons:[...document.querySelectorAll('.client-portal button,.client-portal a.button')].filter(node=>(node.getBoundingClientRect().height<44||node.getBoundingClientRect().width<44)).map(node=>node.textContent)}));
  assert.equal(measured.scrollWidth,width,`${theme}/${view}/${width}: no document overflow`);assert.deepEqual(measured.clipped,[],`${theme}/${view}/${width}: no clipped internal content`);assert.deepEqual(measured.shortButtons,[],`${theme}/${view}/${width}: targets >=44px`);assert.equal(measured.brokenImages,0);
  await page.keyboard.press('Tab');const focus=await page.evaluate(()=>{const target=document.activeElement;return {tag:target.tagName,outline:getComputedStyle(target).outlineStyle};});assert.notEqual(focus.tag,'BODY');assert.notEqual(focus.outline,'none');
  measurements.push({theme,view,...measured,focus});
  if(process.env.PORTAL_QA_OUTPUT&&width===390){await mkdir(process.env.PORTAL_QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.PORTAL_QA_OUTPUT,`next-${theme}-${view}-390.png`),fullPage:true});}
 }
 // Real Next Link navigation between the private list and detail.
 await page.goto(new URL('/cliente/entregas',base).href,{waitUntil:'networkidle0'});await page.click('.delivery-list a.button');await page.waitForSelector('textarea[required]');assert(new URL(page.url()).pathname.endsWith('/42'));
 await page.click('header a.button');await page.waitForSelector('.delivery-list article');assert.equal(new URL(page.url()).pathname,'/cliente/entregas');
 assert.deepEqual(errors,[]);
 const result={base:base.origin,nextBase:nextBase.origin,forwardedHost:'app.scaleparaguay.com',measurements,apiRequests:requests,errors,limitations:['Synthetic API responses; no real login/OAuth, storage download or physical mobile/Safari.']};
 if(process.env.PORTAL_QA_OUTPUT){await mkdir(process.env.PORTAL_QA_OUTPUT,{recursive:true});await writeFile(path.join(process.env.PORTAL_QA_OUTPUT,'next-measurements.json'),JSON.stringify(result,null,2));}
 console.log(`PASS Next private portal: ${measurements.length} route/theme/viewport combinations, actual compiled root/layout/CSS, real Next Link navigation, only synthetic API responses.`);
}finally{await browser.close();await new Promise(resolve=>proxy.close(resolve));}
