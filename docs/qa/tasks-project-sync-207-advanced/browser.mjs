import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const require=createRequire(new URL('../../../backend/package.json',import.meta.url));
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3013', api=process.env.QA_API_URL||'http://127.0.0.1:4115';
const out=process.env.QA_OUT||'/tmp/scale207-advanced', path='/api/agency/productivity/internal-tasks';
for(const url of [base,api])assert(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Only loopback is allowed');
assert(process.env.QA_BUILD_ID,'QA_BUILD_ID must identify the approved running candidate');
await mkdir(out,{recursive:true});
let token;
// Fixture bootstrap targets the local server only. Public demo requires this Origin;
// no server guard/CORS is changed and browser requests retain their real loopback Origin.
if(process.env.QA_SESSION_FILE)token=(await readFile(process.env.QA_SESSION_FILE,'utf8')).trim();
else {
 const response=await fetch(api+'/api/demo/start',{method:'POST',headers:{Origin:'https://sistema.scaleparaguay.com','Content-Type':'application/json'},body:'{}'});
 assert.equal(response.status,201,'Isolated local guest bootstrap');
 token=response.headers.getSetCookie().map(s=>s.match(/^scale_session=([^;]+)/)?.[1]).find(Boolean);assert(token);
 await writeFile(out+'/private-session',token,{mode:0o600});
}
async function call(suffix,body,method='PATCH'){
 const response=await fetch(api+path+suffix,{method:body?method:'GET',headers:{cookie:'scale_session='+token,...(body?{'Content-Type':'application/json',Origin:base}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json();assert.equal(response.status,body&&method==='POST'?201:200,JSON.stringify(result));return result;
}
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);const nextDay=tomorrow.toISOString().slice(0,10);
const contextData=await call('/context');const project=contextData.projects[0];assert(project,'Synthetic project required');
const title='QA207 SPA '+Date.now();
const created=process.env.QA_TASK_ID?{record:{id:process.env.QA_TASK_ID}}:await call('',{title,description:'Fixture privada de sincronización; no usar fuera de loopback.',priority:'urgent',status:'pending',due_date:today,due_time:'13:45',project_id:String(project.id),client_id:project.client_id||null,checklist:[{id:'qa207-check',text:'Comprobar sincronización',completed:false}],materials:[],expected_version:0},'POST');
const task=(await call('/'+created.record.id)).record, original=structuredClone(task);assert(task.title.startsWith('QA207 SPA '),'Only the dedicated QA fixture can be changed');
const beforeIds=(await call('?bucket=all&assignee=me')).records.map(r=>String(r.id)).sort();
const report={buildId:process.env.QA_BUILD_ID,compiledSource:process.env.QA_COMPILED_SOURCE,fixture:{id:String(task.id),projectId:String(task.project_id),title:task.title,originalVersion:task.version},checks:[],http:[],documents:[],runtimeErrors:[],external:[],screens:[]};
function check(name,ok,details){report.checks.push({name,passed:Boolean(ok),details});assert(ok,name);}
const browser=await require('puppeteer-core').launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const browserContext=await browser.createBrowserContext();await browserContext.setCookie({name:'scale_session',value:token,url:base,httpOnly:true});const page=await browserContext.newPage();page.setDefaultTimeout(30000);
await page.evaluateOnNewDocument(()=>{window.__qaTaskClicks=[];document.addEventListener('click',event=>{const button=event.target.closest?.('button[aria-controls]');if(button?.closest('.employee-tasks'))window.__qaTaskClicks.push({path:location.pathname,text:button.textContent,controls:button.getAttribute('aria-controls'),expanded:button.getAttribute('aria-expanded'),trusted:event.isTrusted});},true);});
await page.setRequestInterception(true);
page.on('request',r=>{const u=new URL(r.url());if(r.resourceType()==='document')report.documents.push({url:u.pathname,method:r.method()});if(['data:','blob:','about:'].includes(u.protocol)||['127.0.0.1','localhost'].includes(u.hostname))r.continue();else{report.external.push(u.host);r.abort();}});
page.on('pageerror',error=>report.runtimeErrors.push(error.message));
page.on('response',async r=>{const u=new URL(r.url());if(!u.pathname.includes(path))return;try{const d=await r.json();report.http.push({method:r.request().method(),status:r.status(),path:u.pathname,query:u.search,request:r.request().postData()?JSON.parse(r.request().postData()):undefined,...(d.record?{id:String(d.record.id),version:d.record.version,statusValue:d.record.status,dueDate:d.record.due_date,checklist:d.record.checklist}:{}),...(d.records?{records:d.records.map(t=>({id:String(t.id),version:t.version,status:t.status,dueDate:t.due_date}))}:{}),counts:d.counts});}catch{}});
function waitResponse(...args){const promise=page.waitForResponse(...args);promise.catch(()=>{});return promise;}
async function clickNode(handle){
 const element=handle.asElement();assert(element,'Expected a visible element');await element.scrollIntoView();
 await page.waitForFunction(async element=>{if(!element.isConnected)return false;const first=element.getBoundingClientRect();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const r=element.getBoundingClientRect();return Math.abs(r.x-first.x)<.1&&Math.abs(r.y-first.y)<.1&&element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));},{timeout:10000},element);
 await element.click();await handle.dispose();
}
async function button(text,scope=''){
 return page.evaluateHandle(({text,scope})=>[...document.querySelectorAll((scope?scope+' ':'')+'button')].find(n=>n.checkVisibility()&&n.textContent.trim()===text),{text,scope});
}
async function click(text,scope=''){await clickNode(await button(text,scope));}
async function closeDialogs(){for(let i=0;i<5;i++){const count=await page.$$eval('[role=dialog]',ns=>ns.filter(n=>n.checkVisibility()).length);if(!count)return;await page.keyboard.press('Escape');await page.waitForFunction(before=>[...document.querySelectorAll('[role=dialog]')].filter(n=>n.checkVisibility()).length<before,{},count);}}
let stamp;
async function stable(label){const state=await page.evaluate(()=>({origin:performance.timeOrigin,marker:sessionStorage.getItem('qa207-spa')}));check(label+' stays in one document/session',state.origin===stamp.origin&&state.marker===stamp.marker&&report.documents.length===1,{...state,documentRequests:report.documents.length});}
async function nav(route){
 await closeDialogs();
 for(let i=0;i<5;i++){
  const link=await page.evaluateHandle(route=>[...document.querySelectorAll('a[href]')].find(n=>n.checkVisibility()&&new URL(n.href).pathname===route),route);
  if(link.asElement()){await clickNode(link);await page.waitForFunction(route=>location.pathname===route&&!([...document.querySelectorAll('[aria-label="Menú de Scale OS"]')].some(n=>n.checkVisibility())),{},route);await stable('Navigation '+route);return;}
  await link.dispose();
  const mobile=await page.evaluateHandle(()=>[...document.querySelectorAll('[aria-label="Abrir menú"]')].find(n=>n.checkVisibility()&&n.getAttribute('aria-expanded')!=='true'));
  if(mobile.asElement()){await clickNode(mobile);continue;}await mobile.dispose();
  const group=await page.evaluateHandle(()=>[...document.querySelectorAll('.nav-group-toggle')].find(n=>n.checkVisibility()&&n.textContent.includes('Flujo')));await clickNode(group);
 }
 throw Error('Cannot navigate through actual links to '+route);
}
async function expandSummary(){
 await page.waitForFunction(()=>[...document.querySelectorAll('[aria-label="Mis tareas"] .employee-task-card')].some(n=>n.checkVisibility()));
 await page.waitForFunction(()=>[...document.querySelectorAll('[aria-label="Mis tareas"] button[aria-controls]')].some(n=>n.checkVisibility()));
 const toggle=await button('Ver todas mis tareas');if(toggle.asElement())await clickNode(toggle);else await toggle.dispose();
 await page.waitForFunction(()=>[...document.querySelectorAll('[aria-label="Mis tareas"] button[aria-controls]')].some(n=>n.checkVisibility()&&n.getAttribute('aria-expanded')==='true'));
}
async function bucket(name){
 await page.waitForSelector('.employee-tasks-tabs');await clickNode(await page.evaluateHandle(name=>[...document.querySelectorAll('.employee-tasks-tabs button')].find(n=>n.checkVisibility()&&n.textContent.trim().startsWith(name)),name));
 await page.waitForFunction(id=>[...document.querySelectorAll('.employee-task-card')].some(n=>n.checkVisibility()&&n.dataset.taskId===id),{},String(task.id));
}
async function openProject(){
 await nav('/proyectos');
 const projectName=task.project_name||project.name;
 await page.waitForFunction(name=>[...document.querySelectorAll('button')].some(n=>n.checkVisibility()&&n.getAttribute('aria-label')==='Ver detalle del proyecto: '+name),{},projectName);
 const query=waitResponse(r=>new URL(r.url()).pathname.includes(path)&&new URL(r.url()).searchParams.get('project_id')===String(task.project_id));
 await clickNode(await page.evaluateHandle(name=>[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&n.getAttribute('aria-label')==='Ver detalle del proyecto: '+name),projectName));
 const r=await query,d=await r.json();check('Project filter uses same project/task IDs',d.records.some(t=>String(t.id)===String(task.id)&&String(t.project_id)===String(task.project_id)),{query:new URL(r.url()).search});
 await page.waitForSelector('[aria-label="Tareas del proyecto"] .employee-task-card');
}
async function openTask(edit=false){
 const response=waitResponse(r=>new URL(r.url()).pathname.endsWith(path+'/'+task.id)&&r.request().method()==='GET');
 await clickNode(await page.evaluateHandle(({id,edit})=>{const card=[...document.querySelectorAll('.employee-task-card')].find(n=>n.checkVisibility()&&n.dataset.taskId===id);return[...card?.querySelectorAll('button')||[]].find(n=>n.checkVisibility()&&(edit?n.textContent.trim()==='Editar / reprogramar':/^Ver (detalle|checklist y detalle)$/.test(n.textContent.trim())));},{id:String(task.id),edit}));
 const d=await(await response).json();check('Detail reads the same task ID',String(d.record.id)===String(task.id),{version:d.record.version});
 await page.waitForSelector(edit?'.employee-task-form':'.employee-task-detail input[type=checkbox]');return d.record;
}
async function mutation(action,expected){
 const before=(await call('/'+task.id)).record;const prior=report.http.findLast(r=>r.records&&r.counts);
 const response=waitResponse(r=>new URL(r.url()).pathname.endsWith(path+'/'+task.id)&&r.request().method()==='PATCH');
 const refreshed=waitResponse(r=>{const u=new URL(r.url());return u.pathname.endsWith(path)&&r.request().method()==='GET'&&u.searchParams.has('bucket');});
 await action();const r=await response,d=await r.json();check('Same task CAS increments exactly once',r.status()===200&&String(d.record.id)===String(task.id)&&d.record.version===before.version+1,{before:before.version,after:d.record.version,request:JSON.parse(r.request().postData())});
 check('Mutation result matches requested change',expected(d.record),{status:d.record.status,date:d.record.due_date,checked:d.record.checklist[0].completed});
 const fresh=await(await refreshed).json();const updated=fresh.records.find(t=>String(t.id)===String(task.id));check('Mounted task dashboard invalidates/refetches same ID and version without page reload',Boolean(updated)&&updated.version===d.record.version&&updated.status===d.record.status&&updated.due_date.slice(0,10)===d.record.due_date.slice(0,10),{ids:fresh.records.map(t=>String(t.id)),version:updated?.version,counts:fresh.counts});if(prior){const classify=record=>{if(record.status==='done')return'completed';if(!record.due_date)return'undated';const date=record.due_date.slice(0,10);if(date<today)return'overdue';if(date>today)return'upcoming';const time=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Asuncion',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date());return record.due_time&&record.due_time<time?'overdue':'today';};const from=classify(before),to=classify(d.record);if(from!==to)check('Actual civil/time bucket counters invalidate without reload',fresh.counts[from]===prior.counts[from]-1&&fresh.counts[to]===prior.counts[to]+1,{from,to,before:prior.counts,after:fresh.counts});}await stable('Task mutation');return d.record;
}
async function toggle(expected){return mutation(async()=>{await page.click('[role=dialog][aria-modal=true] .employee-task-detail input[type=checkbox]');},r=>r.checklist[0].completed===expected);}
async function ensureEditorField(key){for(let i=0;i<8;i++){const field=await page.$('.employee-task-form [data-field="'+key+'"]');if(field&&await field.evaluate(n=>n.checkVisibility()))return field;await click('Siguiente','[role=dialog][aria-modal=true]');}throw Error('Editor field not visible '+key);}
async function editDate(date){
 await ensureEditorField('due_date');const selector='.employee-task-form [data-field="due_date"] input';await page.click(selector,{clickCount:3});await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.type(selector,date);await page.keyboard.press('Tab');
}
async function editStatus(label){
 const field=await ensureEditorField('status');const native=await field.$('select');if(native){await native.select(label==='Pendiente'?'pending':'done');return;}
 await(await field.$('button')).click();await clickNode(await page.evaluateHandle(label=>[...document.querySelectorAll('[role=option]')].find(n=>n.checkVisibility()&&n.textContent.trim()===label),label));
}
async function saveEditor(){for(let i=0;i<8;i++){const save=await page.evaluateHandle(()=>[...document.querySelectorAll('[role=dialog][aria-modal=true] button[type=submit]')].find(n=>n.checkVisibility()));if(save.asElement()){await clickNode(save);return;}await save.dispose();await click('Siguiente','[role=dialog][aria-modal=true]');}throw Error('Save not visible');}
async function shot(name){const file=out+'/'+name+'.png';await page.screenshot({path:file});report.screens.push(file);}
try{
 await page.setViewport({width:1440,height:1000});await page.goto(base+'/resumen',{waitUntil:'networkidle2'});
 const intro=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&/Explorar.*demo/i.test(n.textContent)));if(intro.asElement())await clickNode(intro);else await intro.dispose();
 stamp=await page.evaluate(()=>{const marker=crypto.randomUUID();sessionStorage.setItem('qa207-spa',marker);return{origin:performance.timeOrigin,marker};});check('Single initial browser document',report.documents.length===1,{documents:report.documents});
 for(const width of[1440,390]){
  await page.setViewport({width,height:width===390?844:1000});
  await nav('/resumen');await expandSummary();await bucket('Todas');
  const before=await openTask();check(width+' initial own task',before.status==='pending'&&before.due_date.slice(0,10)===today&&!before.checklist[0].completed);
  const marked=await toggle(true);await shot(width+'-summary-checklist');
  await openProject();const inProject=await openTask();check(width+' checklist visible in Project through SPA navigation',inProject.version===marked.version&&inProject.checklist[0].completed);await toggle(false);await shot(width+'-project-checklist-restored');
  await nav('/resumen');await expandSummary();await bucket('Todas');await page.click('[aria-label="Ver como lista"]');await openTask(true);await editDate(nextDay);const future=await mutation(saveEditor,r=>r.due_date.slice(0,10)===nextDay);await shot(width+'-summary-reprogrammed');
  await openProject();const futureProject=await openTask();check(width+' reprogrammed date visible in Project',futureProject.version===future.version&&futureProject.due_date.slice(0,10)===nextDay);await closeDialogs();await openProject();await openTask(true);await editDate(today);await mutation(saveEditor,r=>r.due_date.slice(0,10)===today);await shot(width+'-project-date-restored');
  await nav('/resumen');await expandSummary();await bucket('Todas');const restoredDate=await openTask();check(width+' Project date change visible in Summary',restoredDate.due_date.slice(0,10)===today);const done=await mutation(()=>click('Marcar completada','[role=dialog][aria-modal=true]'),r=>r.status==='done');await shot(width+'-summary-done');
  await openProject();const doneProject=await openTask();check(width+' completed state visible in Project',doneProject.status==='done'&&doneProject.version===done.version);await closeDialogs();await openProject();await openTask(true);await editStatus('Pendiente');await mutation(saveEditor,r=>r.status==='pending');await shot(width+'-project-status-restored');
  await nav('/resumen');await expandSummary();await bucket('Todas');await page.click('[aria-label="Ver como lista"]');const restored=await openTask();check(width+' final state restored in Summary',restored.status==='pending'&&restored.due_date.slice(0,10)===today&&!restored.checklist[0].completed);await shot(width+'-summary-restored');await closeDialogs();
 }
 const ids=(await call('?bucket=all&assignee=me')).records.map(r=>String(r.id)).sort();check('Task IDs unchanged after UI sequence; no mirrors',JSON.stringify(ids)===JSON.stringify(beforeIds));check('No POST tasks from UI',!report.http.some(r=>r.method==='POST'));check('No runtime errors or providers',report.runtimeErrors.length===0&&report.external.length===0);await stable('Final SPA assertion');
}catch(error){report.error=error.stack;await shot('failure').catch(()=>{});}
finally{
 const current=(await call('/'+task.id)).record;
 const same=current.status===original.status&&current.due_date.slice(0,10)===original.due_date.slice(0,10)&&JSON.stringify(current.checklist)===JSON.stringify(original.checklist);
 if(!same){const result=await call('/'+task.id,{expected_version:current.version,status:original.status,due_date:original.due_date.slice(0,10),due_time:original.due_time?.slice(0,5)||null,checklist:original.checklist});report.emergencyFixtureRestore={scope:'Own synthetic task only; preserves history',version:result.record.version};}
 report.taskToggleClicks=await page.evaluate(()=>window.__qaTaskClicks);report.finalRecord=(await call('/'+task.id)).record;const healthResponse=await fetch(api+'/health'),health=await healthResponse.json();const frontResponse=await fetch(base+'/status'),html=await frontResponse.text();report.endpointEvidence={capturedAt:new Date().toISOString(),api:{status:healthResponse.status,version:health.release?.version,ok:health.ok,database:health.database},frontend:{status:frontResponse.status,containsVersion194:html.includes('1.0.194'),containsExpectedBuildId:html.includes(report.buildId)},sourceIdentification:'Approved compiled source supplied by integrator; BUILD_ID compared against local HTTP HTML'};report.passed=!report.error&&report.checks.every(c=>c.passed);await writeFile(out+'/results.json',JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,fixture:report.fixture,documents:report.documents,error:report.error}));if(!report.passed)process.exitCode=1;
}
