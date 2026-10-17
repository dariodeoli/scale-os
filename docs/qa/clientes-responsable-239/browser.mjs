// LOCAL QA ONLY: synthetic client and contract fixtures, no public providers.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(new URL('../../../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core'),sharp=require('sharp');
const base=new URL(process.env.QA_BASE_URL||'http://127.0.0.1:3000');
const local=value=>['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);
assert(local(base)&&['http:','https:'].includes(base.protocol),'Local QA URL required');
const fixture=JSON.parse(await readFile(process.env.QA_FIXTURE_FILE,'utf8'));
const identity=fixture.admin;assert(identity?.session||identity?.email&&identity?.password,'Synthetic local identity required');
const out=resolve(process.env.QA_OUT||'/tmp/scale-qa239'),stamp=`QA239-${Date.now()}`;
await mkdir(out,{recursive:true});
const report={theme:process.env.QA_THEME||'light',sha:process.env.QA_SOURCE_SHA||null,startedAt:new Date().toISOString(),base:base.origin,checks:[],screenshots:[],blockedExternal:[],limitations:['390px is browser emulation, not a physical device.','Google, RUC, legal advice and production deploy are outside this local run.']};
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,XDG_CONFIG_HOME:out,XDG_CACHE_HOME:out}});
const context=await browser.createBrowserContext(),page=await context.newPage();
page.setDefaultTimeout(30000);
report.browserErrors=[];page.on('pageerror',error=>report.browserErrors.push({type:'pageerror',message:error.message}));page.on('console',message=>{if(message.type()==='error')report.browserErrors.push({type:'console',message:message.text().slice(0,4000)});});
if(process.env.QA_THEME)await page.evaluateOnNewDocument(theme=>localStorage.setItem('scale-theme',theme),process.env.QA_THEME);
await page.setRequestInterception(true);
page.on('request',r=>{const u=r.url();if(/^(data:|blob:|about:)/.test(u)||local(u))r.continue();else{const host=new URL(u).hostname;if(!report.blockedExternal.includes(host))report.blockedExternal.push(host);r.abort('blockedbyclient');}});
const editor='[role="dialog"]:has([data-field="legal_representative_same_as_client"])';
function check(name,condition,details={}){report.checks.push({name,passed:Boolean(condition),...details});assert(condition,name);}
async function api(path,body,method=body===undefined?'GET':'POST'){
 return page.evaluate(async({path,body,method})=>{const r=await fetch('/core-api'+path,{method,credentials:'include',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};},{path,body,method});
}
async function record(id){const r=await api(`/api/agency/clients/${id}`);assert.equal(r.status,200);return r.data.record;}
async function go(){await page.goto(new URL('/clientes',base).href,{waitUntil:'networkidle2'});}
async function click(text,scope='body'){
 const handle=await page.evaluateHandle(({text,scope})=>[...document.querySelectorAll(`${scope} button,${scope} summary`)].find(n=>n.getClientRects().length&&n.textContent.trim()===text),{text,scope});
 const el=handle.asElement();assert(el,`Visible button ${text}`);await el.evaluate(n=>n.scrollIntoView({block:'center'}));await el.click();await handle.dispose();
}
async function openEditor(name){
 await go();const handle=await page.evaluateHandle(name=>[...document.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')===`Abrir ficha de ${name}`),name);
 const el=handle.asElement();assert(el,'Client row opens detail');await el.click();await handle.dispose();
 await page.waitForSelector('[data-testid="client-legal-identity"]');
 await click('Editar','[role="dialog"]');await page.waitForSelector(editor);
}
async function field(key){const h=await page.$(`${editor} [data-field="${key}"] input`);assert(h,`field ${key}`);await h.evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});return h;}
async function type(key,value){const h=await field(key);await h.focus();await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.press('Backspace');if(value)await h.type(value);await page.keyboard.press('Tab');await h.dispose();}
async function value(key){return page.$eval(`${editor} [data-field="${key}"] input`,n=>({value:n.value,disabled:n.disabled,checked:n.checked}));}
async function toggle(checked){const h=await field('legal_representative_same_as_client');await h.focus();check('Checkbox has keyboard focus',await h.evaluate(n=>document.activeElement===n));if((await h.evaluate(n=>n.checked))!==checked)await page.keyboard.press('Space');await h.dispose();await page.waitForFunction(({editor,checked})=>document.querySelector(`${editor} [data-field="legal_representative_same_as_client"] input`)?.checked===checked,{},{editor,checked});}
async function save(id){
 const response=page.waitForResponse(r=>r.url().split('?')[0].endsWith(`/api/agency/clients/${id}`)&&r.request().method()==='PATCH');
 await click('Guardar',editor);const saved=await response;check('Client saved through real form PATCH200',saved.status()===200);await page.waitForFunction(editor=>!document.querySelector(editor),{},editor);
}
async function geometry(label){
 const metrics=await page.evaluate(editor=>{const d=document.querySelector(editor)||[...document.querySelectorAll('[role="dialog"]')].at(-1);const b=d.getBoundingClientRect();return {viewport:innerWidth,documentOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,dialogWidth:b.width,dialogLeft:b.left,dialogRight:b.right,dialogOverflow:d.scrollWidth-d.clientWidth,scrollRegions:[...d.querySelectorAll('*')].filter(n=>n.getClientRects().length&&n.scrollHeight>n.clientHeight+1&&['auto','scroll'].includes(getComputedStyle(n).overflowY)).length};},editor);
 check(`${label}: document and dialog fit horizontally`,metrics.documentOverflow<=1&&metrics.dialogWidth<=metrics.viewport+1&&metrics.dialogLeft>=-1&&metrics.dialogRight<=metrics.viewport+1&&metrics.dialogOverflow<=1,{metrics});
 await page.screenshot({path:resolve(out,label+'.png'),fullPage:true});report.screenshots.push(label+'.png');
}
async function photo(label,scope=editor){
 await page.waitForFunction(editor=>[...document.querySelector(editor).querySelectorAll('[data-testid="client-legal-identity"] img')].some(n=>n.complete&&n.naturalWidth>0),{},scope);
 const result=await page.evaluate(editor=>[...document.querySelector(editor).querySelectorAll('[data-testid="client-legal-identity"] img')].map(n=>{const p=n.closest('.foto-perfil,.identity-avatar')||n.parentElement,b=p.getBoundingClientRect(),s=getComputedStyle(p);return {decoded:n.complete&&n.naturalWidth>0,width:b.width,height:b.height,radius:s.borderRadius,naturalWidth:n.naturalWidth};}),scope);
 check(`${label}: real image decoded in circular identity`,result.some(r=>r.decoded&&Math.abs(r.width-r.height)<1&&(r.radius.includes('%')?parseFloat(r.radius)>=50:parseFloat(r.radius)>=r.width/2)),{images:result});
}
async function identityCopy(label,clientName,representativeName,scope=editor){
 const text=await page.$eval(`${scope} [data-testid="client-legal-identity"]`,n=>n.textContent);
 check(`${label}: client and legal representative names share the photo identity`,text.includes('Cliente / empresa')&&text.includes('Responsable legal')&&text.includes(clientName)&&text.includes(representativeName));
}
let id,contractId,versionBefore;
const preserved={party_type:'company',document_type:'ci',document_number:'QA-DOC-CLIENT',legal_representative_document:'QA-DOC-SIGNER',legal_representative_role:'Representante QA'};
async function intact(row){for(const [key,expected]of Object.entries(preserved))check(`Independent ${key} preserved`,row[key]===expected);const versions=await api(`/api/agency/contracts/${contractId}/versions`);check('Issued contract snapshot remains identical',versions.status===200&&JSON.stringify(versions.data.versions[0])===JSON.stringify(versionBefore));}
try{
 await page.setViewport({width:1366,height:1000});await page.goto(base.href,{waitUntil:'domcontentloaded'});
 if(identity.session)await context.setCookie({name:'scale_session',value:identity.session,url:base.origin});
 else assert.equal((await api('/api/auth/login',{email:identity.email,password:identity.password})).status,200);
 const me=await api('/api/auth/me');assert.equal(me.status,200);check('Authenticated synthetic local owner',me.data.user.role==='owner');
 if(process.env.QA_DETAIL_ONLY_CLIENT){
  const row=await record(process.env.QA_DETAIL_ONLY_CLIENT);
  for(const width of [1366,390]){
   await page.setViewport({width,height:width===390?844:1000});await go();
   const handle=await page.evaluateHandle(name=>[...document.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')===`Abrir ficha de ${name}`),row.name);
   const element=handle.asElement();assert(element,'Client row opens detail');await element.click();await handle.dispose();await page.waitForSelector('[data-testid="client-legal-identity"]');
   await identityCopy(`Detail ${width}`,row.legal_name||row.name,row.legal_representative_name,'[role="dialog"]');
   await photo(`Detail ${width}`,'[role="dialog"]');await geometry(`client-detail-${width}`);
   await click('Editar','[role="dialog"]');await page.waitForSelector(editor);
   await identityCopy(`Editor readonly ${width}`,row.legal_name||row.name,row.legal_representative_name);await photo(`Editor readonly ${width}`);
   check(`Editor readonly ${width}: linked checkbox and disabled representative`,(await value('legal_representative_same_as_client')).checked&&(await value('legal_representative_name')).disabled);
   await geometry(`client-editor-readonly-${width}`);
  }
  report.fixture={clientId:String(row.id),readOnly:true};
 }else{
 const photoData='data:image/webp;base64,'+(await sharp({create:{width:64,height:64,channels:3,background:'#8b4ec2'}}).webp().toBuffer()).toString('base64');
 let name=stamp+' Cliente';const legal=stamp+' Empresa Legal';
 const created=await api('/api/agency/clients',{name,legal_name:legal,legal_representative_name:'Representante separado QA',legal_representative_same_as_client:false,logo_url:photoData,...preserved});
 check('Synthetic client created201',created.status===201);id=created.data.client.id;
 const template=await api('/api/agency/contracts/templates',{name:stamp+' snapshot',body:'Cliente: {{counterparty.legal_name}}\nRepresentante: {{counterparty.legal_representative_name}}\nDocumento: {{counterparty.legal_representative_document}}',required_fields:['counterparty.legal_name','counterparty.legal_representative_name','counterparty.legal_representative_document']});assert.equal(template.status,201);
 const contract=await api('/api/agency/contracts',{template_id:template.data.template.id,client_id:id,title:stamp+' documento sintético'});assert.equal(contract.status,201);contractId=contract.data.contract.id;
 const issued=await api(`/api/agency/contracts/${contractId}/versions`,{expected_revision:contract.data.contract.revision,reviewed:true});check('Synthetic contract human-review fixture issued201',issued.status===201);versionBefore=issued.data.version;
 check('Issued text contains original independent representative',versionBefore.rendered_text.includes('Representante separado QA'));
 await openEditor(name);await identityCopy('Desktop independent',legal,'Representante separado QA');await photo('Desktop editor');await geometry('client-editor-independent-1366');
 check('Unlinked representative editable',!(await value('legal_representative_name')).disabled);
 await toggle(true);await page.waitForFunction(({editor,legal})=>document.querySelector(`${editor} [data-field="legal_representative_name"] input`)?.value===legal,{},{editor,legal});
 check('Linked representative visible and disabled', (await value('legal_representative_name')).disabled);
 const renamedLegal=stamp+' Nueva Razón Social';await type('legal_name',renamedLegal);
 check('Linked name follows legal name live',(await value('legal_representative_name')).value===renamedLegal);
 name=stamp+' Cliente renombrado';await type('name',name);check('Legal name has priority over commercial name',(await value('legal_representative_name')).value===renamedLegal);
 await save(id);let row=await record(id);check('Linked state and canonical name persist',row.legal_representative_same_as_client===true&&row.legal_representative_name===renamedLegal);await intact(row);
 await openEditor(name);await identityCopy('Desktop linked',renamedLegal,renamedLegal);check('Linked checkbox and derived field survive reopen',(await value('legal_representative_same_as_client')).checked&&(await value('legal_representative_name')).value===renamedLegal);await geometry('client-editor-linked-1366');
 await toggle(false);await type('legal_representative_name','Representante independiente posterior');await type('legal_name',stamp+' Empresa distinta');await save(id);
 row=await record(id);check('Unchecked state retains independent representative',row.legal_representative_same_as_client===false&&row.legal_representative_name==='Representante independiente posterior');await intact(row);
 let changed=await api(`/api/agency/clients/${id}`,{name:stamp+' Renombre API',legal_name:''},'PATCH');assert.equal(changed.status,200);row=await record(id);name=row.name;check('Unlinked representative survives API rename',row.legal_representative_name==='Representante independiente posterior');await intact(row);
 await page.setViewport({width:390,height:844});await openEditor(name);await identityCopy('Mobile independent',name,'Representante independiente posterior');await photo('Mobile editor');await geometry('client-editor-independent-390');
 await toggle(true);await page.waitForFunction(({editor,name})=>document.querySelector(`${editor} [data-field="legal_representative_name"] input`)?.value===name,{},{editor,name});
 name=stamp+' Nombre móvil para validar vinculación';await type('name',name);check('Mobile linked name follows commercial fallback',(await value('legal_representative_name')).value===name);
 await geometry('client-editor-linked-390');await save(id);row=await record(id);check('Mobile linked save persists canonical fallback',row.legal_representative_same_as_client===true&&row.legal_representative_name===name);await intact(row);
 await openEditor(name);await identityCopy('Mobile linked',name,name);check('Mobile reopen retains checked link',(await value('legal_representative_same_as_client')).checked);await photo('Mobile reopen');await geometry('client-editor-reopened-390');
 changed=await api(`/api/agency/clients/${id}`,{legal_name:stamp+' Nombre legal por API'},'PATCH');assert.equal(changed.status,200);row=await record(id);check('Backend rename recanonicalizes a linked representative',row.legal_representative_name===row.legal_name);await intact(row);
 report.fixture={clientId:String(id),contractId:String(contractId),issuedVersion:String(versionBefore.version),snapshotHash:crypto.createHash('sha256').update(JSON.stringify(versionBefore)).digest('hex')};
 }
}catch(error){report.checks.push({name:'QA239 run',passed:false,error:error.message});console.error(error.stack);await page.screenshot({path:resolve(out,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();report.assertionRecords=report.checks.length;report.uniqueCheckNames=new Set(report.checks.map(c=>c.name)).size;report.passed=report.checks.length>0&&report.checks.every(c=>c.passed);await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(c=>!c.passed)}));}
