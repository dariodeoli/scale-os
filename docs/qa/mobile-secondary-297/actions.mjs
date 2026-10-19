// Refs #297. Actual local UI, actual isolated API/Postgres; one explicit transport failure.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const require=createRequire(new URL('../../../backend/package.json',import.meta.url));
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3027',out=process.env.QA_OUT||'/tmp/scale297-actions';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));assert(process.env.QA_COMPILED_SOURCE);
await mkdir(out,{recursive:true});
const report={source:process.env.QA_COMPILED_SOURCE,buildId:process.env.QA_BUILD_ID||null,mode:process.env.QA_MODE||'production',checks:[],runtime:[],network:[],blocked:[],injectedFailures:[],states:[]};
if(report.mode!=='baseline')assert(report.buildId,'Final evidence requires BUILD_ID');
const browser=await require('puppeteer-core').launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.createBrowserContext();await context.setCookie({name:'scale_session',value:(await readFile(process.env.QA_SESSION_FILE||'/workspace/.qa-tools/mobile292/ordinary-session','utf8')).trim(),url:base,httpOnly:true});
const page=await context.newPage();page.setDefaultTimeout(90000);let failLegal=false,originalLegal=null,originalPreferences=null;
const check=(name,ok,details)=>{report.checks.push({name,passed:Boolean(ok),...(details?{details}:{})});assert(ok,name);};
page.on('pageerror',e=>report.runtime.push(e.message));page.on('response',r=>{const p=new URL(r.url()).pathname;if(p.includes('/company-legal-profile')||p.includes('/workspace-preferences'))report.network.push({path:p,method:r.request().method(),status:r.status()});});
await page.setRequestInterception(true);page.on('request',r=>{
 const u=new URL(r.url());if(['data:','blob:','about:'].includes(u.protocol))return r.continue();
 if(!['localhost','127.0.0.1'].includes(u.hostname)){report.blocked.push({host:u.host,path:u.pathname});return r.abort();}
 if(r.method()==='PATCH'&&u.pathname.endsWith('/company-legal-profile')){if(failLegal){failLegal=false;report.injectedFailures.push({path:u.pathname,status:503});return r.respond({status:503,contentType:'application/json',body:JSON.stringify({error:'QA297 error recuperable simulado'})});}return r.continue();}
 if(r.method()==='PATCH'&&u.pathname.endsWith('/workspace-preferences'))return r.continue();
 if(!['GET','HEAD','OPTIONS'].includes(r.method())){report.blocked.push({method:r.method(),path:u.pathname});return r.abort();}return r.continue();
});
const api=async(path,method='GET',body,scope)=>page.evaluate(async(path,method,body,scope)=>{const r=await fetch('/core-api'+path,{method,cache:'no-store',headers:{'Content-Type':'application/json',...(scope?{'X-Scale-Preference-Scope':scope}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()};},path,method,body,scope);
async function navigate(path){await page.goto(base+path,{waitUntil:'networkidle2'});await page.waitForSelector('.control-shell[data-shell-data="ready"] .workspace-content');const intro=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(e=>e.checkVisibility()&&/Explorar.*demo/i.test(e.textContent)));if(intro.asElement())await intro.asElement().click();await intro.dispose();}
async function tapText(text,scope='.workspace-content'){const handle=await page.evaluateHandle((text,scope)=>[...document.querySelector(scope).querySelectorAll('button')].find(e=>e.checkVisibility()&&e.textContent.trim()===text),text,scope);assert(handle.asElement(),'Button missing: '+text);await handle.asElement().evaluate(e=>e.scrollIntoView({block:'center'}));await handle.asElement().tap();await handle.dispose();}
async function fill(selector,value){await page.waitForSelector(selector);await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await page.type(selector,value);check('typed complete replacement',await page.$eval(selector,e=>e.value)===value);}
async function geometry(label){const m=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,path:location.pathname,coarse:matchMedia('(pointer:coarse)').matches}));check(label+' no overflow',m.overflow<=1,m);}
try{
 await page.goto(base+'/core-api/api/auth/me');if(report.mode!=='baseline'){const manifest=await page.evaluate(async id=>{const r=await fetch('/_next/static/'+encodeURIComponent(id)+'/_buildManifest.js',{cache:'no-store'});return{status:r.status,isBuildManifest:(await r.text()).includes('__BUILD_MANIFEST')};},process.env.QA_BUILD_ID);check('served compiled manifest matches BUILD_ID',manifest.status===200&&manifest.isBuildManifest,manifest);}const who=JSON.parse(await page.$eval('body',e=>e.innerText));check('fixture owner session',who.user?.role==='owner');const scope=who.user.id+':'+who.user.organization_id;
 originalLegal=(await api('/api/agency/company-legal-profile')).data.profile;originalPreferences=(await api('/api/agency/workspace-preferences','GET',undefined,scope)).data;check('actual preferences fixture',Boolean(originalPreferences.preferences));
 check('actual legal fixture',Boolean(originalLegal?.revision!==undefined));
 for(const [width,height] of [[320,844],[390,844],[768,844],[390,568],[844,390]]){
  const id=width+'x'+height;await page.setViewport({width,height,hasTouch:true,isMobile:width<768});
  await navigate('/configuracion/preferencias');await page.waitForSelector('button[aria-haspopup=listbox]');await geometry(id+' preferences');
  const trigger=await page.$('button[aria-haspopup=listbox]');await trigger.evaluate(e=>e.scrollIntoView({block:'center'}));await trigger.tap();await page.waitForSelector('[role=option]');
  const option=await page.evaluateHandle(()=>[...document.querySelectorAll('[role=option]')].find(e=>e.checkVisibility()&&e.getAttribute('aria-selected')!=='true'));
  check(id+' startup option exists',Boolean(option.asElement()));const selected=await option.asElement().evaluate(e=>e.textContent.trim());await option.asElement().evaluate(e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/'+id+'-preferences-selector.png'});await option.asElement().tap();await option.dispose();
  await page.waitForFunction(()=>!document.querySelector('.workspace-content')?.innerText.includes('Guardando preferencias…'));await page.waitForFunction(text=>document.querySelector('.workspace-content').innerText.includes('Inicio actual: '+text),{},selected);
  await page.reload({waitUntil:'networkidle2'});await page.waitForFunction(text=>document.querySelector('.workspace-content')?.innerText.includes('Inicio actual: '+text),{},selected);check(id+' preferences persisted through real API reload',true);
  await navigate('/configuracion');await page.waitForSelector('.company-legal-profile input[name=legal_representative_name]');await geometry(id+' configuration');
  await tapText('Crear otra empresa');await page.waitForSelector('[role=dialog]');const d=await page.$eval('[role=dialog]',e=>{const b=e.getBoundingClientRect();return{contained:b.x>=-1&&b.y>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,focus:e.contains(document.activeElement)};});check(id+' new company dialog bounds/focus',d.contained&&d.focus,d);await page.screenshot({path:out+'/'+id+'-company-dialog.png'});
  for(let i=0;i<8;i++){await page.keyboard.press('Tab');check(id+' modal Tab stays inside '+i,await page.$eval('[role=dialog]',e=>e.contains(document.activeElement)));}
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role=dialog]'));check(id+' modal close restores focus',await page.evaluate(()=>document.activeElement.textContent.trim()==='Crear otra empresa'));
  const value='QA297 representante '+id;await fill('.company-legal-profile input[name=legal_representative_name]',value);
  if(width===320){failLegal=true;await tapText('Guardar datos legales','.company-legal-profile');await page.waitForFunction(()=>document.querySelector('.company-legal-profile').innerText.includes('QA297 error recuperable simulado'));check(id+' legal draft retained after simulated503',await page.$eval('.company-legal-profile input[name=legal_representative_name]',e=>e.value)===value);}
  const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/company-legal-profile')&&r.request().method()==='PATCH'&&r.status()===200);await tapText('Guardar datos legales','.company-legal-profile');await response;
  check(id+' legal persisted in actual API',(await api('/api/agency/company-legal-profile')).data.profile.legal_representative_name===value);
  await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('.company-legal-profile input[name=legal_representative_name]');await page.waitForFunction(value=>document.querySelector('.company-legal-profile input[name=legal_representative_name]')?.value===value,{},value);check(id+' legal reload restores persisted value',true);
  await page.screenshot({path:out+'/'+id+'-legal.png'});report.states.push({width,height,preferences:true,configuration:true});console.log('PASS '+id+' preferences/legal/dialog actual API');
 }
 check('no runtime errors',!report.runtime.length,report.runtime);check('one deliberate recoverable transport failure',report.injectedFailures.length===1);
 report.passed=true;
}catch(e){report.error=e.stack;report.passed=false;console.error(e.message);}finally{
 try{if(originalLegal){const current=(await api('/api/agency/company-legal-profile')).data.profile;const r=await api('/api/agency/company-legal-profile','PATCH',{legal_representative_name:originalLegal.legal_representative_name,expected_revision:current.revision});check('restore legal fixture',r.status===200);}
 // Only known preference fields; API accepts the original preference envelope via its preferences property.
 if(originalPreferences){const who=(await api('/api/auth/me')).data.user;const data=originalPreferences.preferences||originalPreferences;const r=await api('/api/agency/workspace-preferences','PATCH',data,who.id+':'+who.organization_id);report.preferenceRestore={status:r.status};check('restore preference fixture',r.status===200);}}
 catch(e){report.cleanupError=e.message;report.passed=false;}
 await writeFile(out+'/results.json',JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,states:report.states.length,out}));
}
if(!report.passed)process.exitCode=1;
