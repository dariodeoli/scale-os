/** Public registration UI against local Next; all API transports are mocked. Refs #237. */
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {delimiter,join,resolve} from 'node:path';

const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const base=new URL(process.env.SCALE_QA_URL||'http://127.0.0.1:3006');
assert(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'Use a local SCALE_QA_URL; never production.');
assert(!base.username&&!base.password,'Do not put credentials in SCALE_QA_URL.');
assert(['http:','https:'].includes(base.protocol),'Use HTTP or HTTPS.');
const out=resolve(process.env.SCALE_QA_OUT||'work/qa-registration-access');
const chrome=process.env.CHROME_PATH||(process.env.PATH||'').split(delimiter).flatMap(directory=>['chromium','chromium-browser','google-chrome'].map(name=>join(directory,name))).find(existsSync);
assert(chrome,'Install Chromium or set CHROME_PATH.');
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
const report={base:base.origin,startedAt:new Date().toISOString(),transport:'mocked API; local frontend; external requests blocked',cases:[]};

const text=(page,selector)=>page.$eval(selector,node=>node.textContent);
async function click(page,label){
 const element=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label);
 assert(element.asElement(),`Missing button: ${label}`);
 await element.asElement().click();await element.dispose();
}
async function identify(page){
 await page.type('input[type=email]','qa237@example.invalid');
 await page.type('input[name=password]','Legacy7');
 await page.click('button[type=submit]');
}
async function measure(page,entry,label,{requireFit=true}={}){
 const metrics=await page.evaluate(()=>{
  const footer=document.querySelector('[data-testid="product-footer"]');
  const card=document.querySelector('.auth-form-card');
  const rect=node=>node?{x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,bottom:node.getBoundingClientRect().bottom}:null;
  return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,theme:document.documentElement.dataset.theme||'light',card:rect(card),footer:rect(footer),footerOutside:!!footer&&!card?.contains(footer),actions:[...document.querySelectorAll('.auth-form-card button.primary')].map(rect)};
 });
 assert.equal(metrics.scrollWidth,metrics.width,'No horizontal document overflow');
 assert(metrics.footerOutside,'Canonical footer outside the card');
 if(metrics.width>=1024&&requireFit){
  assert(metrics.scrollHeight<=metrics.height,'Desktop default state fits vertically');
  assert(metrics.footer.bottom<=metrics.height,'Desktop footer visible');
  assert(metrics.actions.every(action=>action.y>=0&&action.bottom<=metrics.height),'Desktop primary action visible');
 }
 assert(metrics.actions.every(action=>action.height>=44),'Primary touch targets at least 44px');
 const filename=`${entry.name.replaceAll(' ','-')}-${label}-${metrics.theme}-${metrics.width}.png`;
 await page.screenshot({path:join(out,filename),fullPage:true});
 entry.measurements.push({label,...metrics,screenshot:filename});
}
async function measureThemes(page,entry,label,originalWidth){
 const sizes=originalWidth===1366?[[1366,768],[1440,900]]:[[390,844]];
 for(const [width,height]of sizes){
  await page.setViewport({width,height});
  for(const theme of['light','dark']){
   for(let attempt=0;attempt<3;attempt++){
    const current=await page.$eval('.access-theme-toggle',node=>node.dataset.themeState);
    if(current===theme)break;
    await page.click('.access-theme-toggle');
   }
   await measure(page,entry,label);
  }
 }
 await page.setViewport({width:originalWidth,height:originalWidth===390?844:768});
}
async function run(name,options,fn){
 const context=await browser.createBrowserContext(),page=await context.newPage();
 const entry={name,passed:false,calls:[],measurements:[],blockedExternal:0,unexpectedApi:[]};
 report.cases.push(entry);let meAttempts=0;
 await page.setViewport({width:options.width||1366,height:options.width===390?844:768});
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());
  if(['data:','blob:','about:'].includes(url.protocol))return request.continue();
  if(url.origin!==base.origin){entry.blockedExternal++;return request.abort();}
  if(request.isNavigationRequest()&&url.pathname!=='/registro')return request.respond({status:200,contentType:'text/html',body:'<main>Destino de acceso simulado</main>'});
  if(!url.pathname.startsWith('/core-api/'))return request.continue();
  const body=request.postData()?JSON.parse(request.postData()):{};
  entry.calls.push({path:url.pathname,method:request.method(),...(body.intent?{intent:body.intent}:{})});
  let status=200,data={};
  if(url.pathname.endsWith('/auth/me')){
   meAttempts++;
   status=['real','demo'].includes(options.session)?200:options.session==='error'&&meAttempts===1?503:401;
   data=options.session==='real'?{user:{id:237,organization_slug:'qa-real'}}:options.session==='demo'?{user:{id:237,demo_owner_user_id:237,organization_slug:'qa-demo'}}:{error:'Sesión requerida'};
  }else if(url.pathname.endsWith('/invitations/status')){
   status=options.pending?200:401;data=options.pending?{status:'pending'}:{error:'Sesión requerida'};
  }else if(url.pathname.endsWith('/password/register')){
   if(body.intent==='resolve'){
    if(options.resolve==='wrong'){status=401;data={error:'Credenciales inválidas'};}
    else data=options.resolve==='existing'?{ok:true,existing:true,redirect:'/?chooseCompany=1'}:{requiresAgency:true};
   }else{status=202;data={message:'Revisá tu correo para verificar tu cuenta.'};}
  }else if(url.pathname.endsWith('/google/registration/complete'))data={ok:true,existing:true,redirect:'/?chooseCompany=1'};
  else if(url.pathname.includes('/privacy/consents')){status=401;data={error:'Sesión requerida'};}
  else{entry.unexpectedApi.push(url.pathname);status=500;data={error:'Unexpected mocked API path'};}
  return request.respond({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 try{
  await page.goto(new URL(`/registro${options.ticket?'?pendingRegistration=synthetic-ticket':''}`,base).href,{waitUntil:'networkidle2'});
  await fn(page,entry);
  assert.deepEqual(entry.unexpectedApi,[],'Only documented mocked API paths');
  entry.passed=true;console.log(`PASS ${name}`);
 }catch(error){entry.error=error.message;await page.screenshot({path:join(out,'failure.png'),fullPage:true});throw new Error(`${name}: ${error.message}`);}
 finally{await context.close();}
}

try{
 for(const width of[1366,390])await run(`new workflow ${width}`,{width},async(page,entry)=>{
  assert((await text(page,'h1')).includes('identidad'));
  await measureThemes(page,entry,'identity',width);
  await page.type('input[type=email]','qa237@example.invalid');
  await page.type('input[name=password]','LocalPassword237');
  await page.click('button[type=submit]');
  await page.waitForFunction(()=>document.querySelector('h1')?.textContent.includes('Protegé'));
  await measureThemes(page,entry,'access',width);
  await page.type('input[name=confirm_password]','Different237');await page.click('button[type=submit]');
  assert((await text(page,'[role=alert]')).includes('no coinciden'));
  await page.$eval('input[name=confirm_password]',node=>node.select());
  await page.type('input[name=confirm_password]','LocalPassword237');await page.click('button[type=submit]');
  await page.waitForFunction(()=>document.querySelector('h1')?.textContent.includes('Configurá'));
  await measureThemes(page,entry,'agency',width);
  assert(await page.$$eval('input[type=checkbox]',nodes=>nodes.length===2&&nodes.every(node=>!node.checked)));
  await page.type('input[autocomplete=organization]','Agencia QA ficticia');await click(page,'Crear mi agencia');
  assert((await text(page,'[role=alert]')).includes('condiciones'));
  await page.$$eval('input[type=checkbox]',nodes=>nodes.forEach(node=>node.click()));await click(page,'Crear mi agencia');
  await page.waitForFunction(()=>document.querySelector('h1')?.textContent==='Revisá tu correo');
  assert.equal(entry.calls.filter(call=>call.path.endsWith('/password/register')).length,2);
 });
 await run('existing legacy password',{resolve:'existing'},async(page,entry)=>{
  await identify(page);await page.waitForFunction(()=>location.pathname==='/');
  assert.equal(new URL(page.url()).search,'?chooseCompany=1');assert.equal(entry.calls.filter(call=>call.method==='POST').length,1);
 });
 await run('wrong existing password',{resolve:'wrong'},async(page,entry)=>{
  await identify(page);await page.waitForSelector('[role=alert]');assert((await text(page,'h1')).includes('identidad'));
  assert(!(await page.$('input[autocomplete=organization]')));assert.equal(entry.calls.filter(call=>call.method==='POST').length,1);
  await measure(page,entry,'error');
 });
 await run('real session redirects',{session:'real'},async(page,entry)=>{
  await page.waitForFunction(()=>location.pathname==='/');assert.equal(entry.calls.filter(call=>call.method==='POST').length,0);
 });
 await run('demo session allows real signup',{session:'demo'},async page=>assert((await text(page,'h1')).includes('identidad')));
 await run('pending session keeps access intent',{pending:true},async page=>{await page.waitForFunction(()=>location.pathname==='/acceso-pendiente');});
 await run('session failure retry',{session:'error'},async page=>{
  assert(await page.$('[role=alert]'));assert(!(await page.$('input[type=email]')));
  await click(page,'Reintentar');await page.waitForSelector('input[type=email]');assert((await text(page,'h1')).includes('identidad'));
 });
 await run('stale Google ticket existing redirects without consent write',{ticket:true},async(page,entry)=>{
  assert((await text(page,'h1')).includes('Configurá'));assert(!page.url().includes('pendingRegistration'));
  await page.type('input[autocomplete=organization]','Agencia QA ficticia');
  await page.$$eval('input[type=checkbox]',nodes=>nodes.forEach(node=>node.click()));await click(page,'Crear mi agencia con Google');
  await page.waitForFunction(()=>location.pathname==='/');assert.equal(entry.calls.filter(call=>call.path.includes('privacy/consents')).length,0);
 });
 assert.equal(report.cases.length,9);
 console.log(`PASS ${report.cases.length} independent browser cases; ${report.cases.flatMap(entry=>entry.measurements).length} geometry measurements.`);
}finally{
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();
}
