/** Local-only browser acceptance checks. See docs/qa/tasks-contracts/README.md. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const base=new URL(process.env.QA_BASE_URL||'http://127.0.0.1:3000');
const local=url=>['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname);
assert(local(base),'QA_BASE_URL must use localhost; this runner creates local test records.');
assert(['http:','https:'].includes(base.protocol));
const out=resolve(process.env.QA_OUT||'work/qa-tasks-contracts');
const fixture=process.env.QA_FIXTURE_FILE?JSON.parse(await readFile(process.env.QA_FIXTURE_FILE,'utf8')):{};
const admin=fixture.admin||{email:process.env.QA_EMAIL,password:process.env.QA_PASSWORD,session:process.env.QA_SESSION};
assert(admin.session||(admin.email&&admin.password),'Provide QA_FIXTURE_FILE or QA_EMAIL/QA_PASSWORD (local QA only).');
const stamp=`QA-${Date.now()}`;
const report={base:base.origin,run:stamp,started_at:new Date().toISOString(),checks:[],screenshots:[],blocked_external:[],limitations:[]};
await mkdir(out,{recursive:true});
await mkdir(resolve(out,'browser-config'),{recursive:true});await mkdir(resolve(out,'browser-cache'),{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,env:{...process.env,XDG_CONFIG_HOME:resolve(out,'browser-config'),XDG_CACHE_HOME:resolve(out,'browser-cache')},args:['--no-sandbox','--disable-dev-shm-usage']});
const TASKS='/api/agency/productivity/internal-tasks';
const CONTRACTS='/api/agency/contracts';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const tomorrow=new Date(new Date(`${today}T12:00:00Z`).valueOf()+86400000).toISOString().slice(0,10);
let page;
const adminTasks=[];
let failNextTaskList=false;
function check(name,condition,details={}){report.checks.push({name,passed:Boolean(condition),...details});if(!condition)throw new Error(name);}
async function step(name,fn){try{await fn();console.log(`PASS ${name}`);}catch(error){report.checks.push({name,passed:false,error:error.message});console.error(`FAIL ${name}: ${error.message}`);process.exitCode=1;if(page)await shot(`failure-${report.checks.length}`).catch(()=>{});}}
async function shot(name){const file=`${name}.png`;await page.screenshot({path:resolve(out,file),fullPage:true});report.screenshots.push(file);}
async function api(path,body,method=body===undefined?'GET':'POST'){
 return page.evaluate(async({path,body,method})=>{const response=await fetch(`/core-api${path}`,{method,credentials:'include',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const type=response.headers.get('content-type')||'';return {status:response.status,data:type.includes('json')?await response.json():null,type};},{path,body,method});
}
async function newPage(identity=admin){
 const context=await browser.createBrowserContext();const target=await context.newPage();
 await target.setRequestInterception(true);
 target.on('request',request=>{const url=request.url();if(failNextTaskList&&url.includes(`${TASKS}?`)&&request.method()==='GET'){failNextTaskList=false;request.abort('failed');return;}if(/^(data:|blob:|about:)/.test(url)||local(url))request.continue();else{const host=new URL(url).hostname;if(!report.blocked_external.includes(host))report.blocked_external.push(host);request.abort('blockedbyclient');}});
 target.setDefaultTimeout(30000);await target.goto(new URL('/resumen',base).href,{waitUntil:'domcontentloaded'});
 if(identity.session)await context.setCookie({name:'scale_session',value:identity.session,url:base.origin});
 else{const login=await target.evaluate(async identity=>{const response=await fetch('/core-api/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(identity),credentials:'include'});return response.status;},{email:identity.email,password:identity.password});assert.equal(login,200,'Local QA login');}
 await target.goto(new URL('/resumen',base).href,{waitUntil:'networkidle2'});return target;
}
async function button(text,scope='body',exact=true){
 const handle=await page.evaluateHandle(({text,scope,exact})=>[...document.querySelectorAll(`${scope} button,${scope} a,${scope} summary`)].find(node=>node.getClientRects().length&&(exact?node.textContent.trim()===text:node.textContent.trim().startsWith(text))),{text,scope,exact});
 const element=handle.asElement();assert(element,`Visible control: ${text}`);await element.click();await handle.dispose();
}
async function input(label,value,scope='[role="dialog"]'){
 const handle=await page.evaluateHandle(({label,scope})=>{const root=document.querySelector(scope);if(!root)return null;const direct=[...root.querySelectorAll('input,textarea')].find(node=>node.getAttribute('aria-label')===label||node.getAttribute('placeholder')===label);if(direct)return direct;const caption=[...root.querySelectorAll('label')].find(node=>node.textContent.trim().replace(/\s*\*$/,'')===label||node.textContent.trim().startsWith(label));return caption?.control||caption?.querySelector('input,textarea')||(caption?.htmlFor?document.getElementById(caption.htmlFor):null);},{label,scope});
 const element=handle.asElement();assert(element,`Input: ${label}`);await element.focus();
 const type=await element.evaluate(node=>node.type);
 if(['date','time','month'].includes(type))await element.evaluate((node,value)=>{const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');descriptor.set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
 else{await element.click();await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.press('Backspace');if(value.length>1000)await page.keyboard.sendCharacter(value);else await element.type(value);}
 await page.keyboard.press('Tab');await handle.dispose();
}
async function select(label,option,scope='[role="dialog"]'){
 const handle=await page.evaluateHandle(({label,scope})=>[...document.querySelectorAll(`${scope} .ops-select`)].find(node=>{const text=node.querySelector('.ops-label')?.textContent.trim();return text===label||text?.startsWith(`${label} ·`);})?.querySelector('button'),{label,scope});
 const element=handle.asElement();assert(element,`Select: ${label}`);await element.focus();await page.keyboard.press('ArrowDown');await page.waitForSelector('[role="option"]');await button(option,'[role="listbox"]');await handle.dispose();
}
async function geometry(name,scope='body'){
 const dimensions=await page.evaluate(scope=>{const root=document.querySelector(scope);const buttons=[...root.querySelectorAll('button,a,summary')].filter(node=>node.getClientRects().length&&!node.disabled);const dialog=document.querySelector('[role="dialog"]');return {width:innerWidth,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),dialog:dialog?{width:Math.round(dialog.getBoundingClientRect().width),height:Math.round(dialog.getBoundingClientRect().height)}:null,scrollable_regions:[...root.querySelectorAll('*')].filter(node=>node.getClientRects().length&&node.scrollHeight>node.clientHeight+1&&['auto','scroll'].includes(getComputedStyle(node).overflowY)).length,small_targets:buttons.map(node=>({label:(node.getAttribute('aria-label')||node.textContent).trim().slice(0,70),height:Math.round(node.getBoundingClientRect().height)})).filter(item=>item.height<44)};},scope);
 check(`${name}: no document overflow`,dimensions.overflow<=1,{dimensions});
 if(dimensions.width<768)check(`${name}: touch targets >=44px`,dimensions.small_targets.length===0,{small_targets:dimensions.small_targets});
 if(dimensions.dialog)check(`${name}: dialog fits viewport`,dimensions.dialog.width<=dimensions.width);
 await shot(name);
}
async function waitTasks(){await page.waitForSelector('.employee-tasks');await page.waitForFunction(()=>!document.querySelector('.employee-tasks')?.textContent.includes('Cargando tareas…'));}
async function taskCard(title){const handle=await page.evaluateHandle(title=>[...document.querySelectorAll('.employee-task-card')].find(card=>card.querySelector('h4')?.textContent===title),title);assert(handle.asElement(),`Task card ${title}`);return handle;}
async function taskFlow(width){
 await page.setViewport({width,height:844,isMobile:width<768,hasTouch:width<768,deviceScaleFactor:1});
 await page.goto(new URL('/resumen',base).href,{waitUntil:'networkidle2'});await waitTasks();
 await geometry(`tasks-${width}` ,'.employee-tasks');
 await button('Crear tarea','.employee-tasks');await page.waitForSelector('[role="dialog"]');
 const title=`${stamp} móvil ${width}`;await input('Título',title);await input('Descripción e instrucciones','Instrucción QA escrita con teclado.\nRevisar materiales antes de completar.');
 await input('Fecha',today);await input('Hora (Asunción, 24 h)','23:59');await select('Prioridad','Alta');
 if(fixture.project?.name)await select('Proyecto',fixture.project.name);
 await button('Agregar subtarea','[role="dialog"]');await input('Subtarea 1','Revisar material local');
 await button('Agregar enlace de material','[role="dialog"]');await input('Nombre del material 1','Material de QA');await input('Enlace del material 1','https://example.invalid/material-qa');
 await page.keyboard.press('Tab');check(`Keyboard focus remains inside task dialog ${width}`,await page.evaluate(()=>Boolean(document.activeElement?.closest('[role="dialog"]'))));
 await geometry(`task-form-${width}`,'[role="dialog"]');
 const saved=page.waitForResponse(response=>response.url().includes(TASKS)&&response.request().method()==='POST');
 await button('Guardar','[role="dialog"]');const response=await saved;check(`task create ${width}`,response.status()===201);const created=(await response.json()).record;check('Task has canonical id',Boolean(created?.id));
 adminTasks.push(created.id);
 await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
 await button('Todas','.employee-tasks-tabs',false);await waitTasks();
 // Unassigned tasks are intentionally absent from the default "me" filter.
 const filters=await page.$('.employee-tasks details');await filters.evaluate(node=>{node.open=true;});
 await select('Empleado','Todo el equipo','.employee-tasks');await waitTasks();
 await page.waitForFunction(title=>[...document.querySelectorAll('.employee-task-card h4')].some(node=>node.textContent===title),{},title);
 const card=await taskCard(title);await (await card.$('button')).click();await page.waitForSelector('.employee-task-detail');
 const checkbox=await page.$('.employee-task-detail input[type="checkbox"]');assert(checkbox,'Task checklist checkbox');const checked=page.waitForResponse(response=>response.url().endsWith(`${TASKS}/${created.id}`)&&response.request().method()==='PATCH');await checkbox.click();check('Checklist update persisted',(await checked).status()===200);
 await input('Nuevo comentario','Comentario QA escrito con teclado.');const commented=page.waitForResponse(response=>response.url().endsWith(`${TASKS}/${created.id}/comments`)&&response.request().method()==='POST');await button('Agregar comentario','.employee-task-detail');check('Comment persisted',(await commented).status()===201);
 await page.waitForFunction(()=>document.querySelector('.employee-task-detail')?.textContent.includes('Comentario QA escrito con teclado.'));
 await shot(`task-detail-with-comment-${width}`);await page.keyboard.press('Escape');
 const editCard=await taskCard(title);const editButtons=await editCard.$$('button');assert(editButtons[1],'Reprogram task button');await editButtons[1].click();await page.waitForSelector('.employee-task-form');
 await input('Fecha',tomorrow);await input('Hora (Asunción, 24 h)','09:30');
 const reprogrammed=page.waitForResponse(response=>response.url().endsWith(`${TASKS}/${created.id}`)&&response.request().method()==='PATCH');await button('Guardar','[role="dialog"]');const rescheduled=await reprogrammed;check('Task rescheduled through UI',rescheduled.status()===200&&(await rescheduled.json()).record.due_date===tomorrow);
 await page.waitForFunction(()=>!document.querySelector('.employee-task-form'));if(await page.$('[role="dialog"]'))await page.keyboard.press('Escape');
 await button('Próximas','.employee-tasks-tabs',false);await waitTasks();await page.waitForFunction(title=>[...document.querySelectorAll('.employee-task-card h4')].some(node=>node.textContent===title),{},title);await shot(`task-upcoming-${width}`);
 const upcoming=await taskCard(title);await (await upcoming.$('button')).click();await page.waitForSelector('.employee-task-detail');
 const completed=page.waitForResponse(response=>response.url().endsWith(`${TASKS}/${created.id}`)&&response.request().method()==='PATCH');await button('Marcar completada','.employee-task-detail');check('Task completion persisted',(await completed).status()===200);
 await geometry(`task-detail-${width}`,'[role="dialog"]');await page.keyboard.press('Escape');
 await button('Completadas','.employee-tasks-tabs',false);await waitTasks();await page.waitForFunction(title=>[...document.querySelectorAll('.employee-task-card h4')].some(node=>node.textContent===title),{},title);await shot(`task-completed-${width}`);
 // Optimistic conflict is checked on the real local API, never a stubbed response.
 const first=await api(`${TASKS}/${created.id}`);check('Task detail API',first.status===200);
 const edit=await api(`${TASKS}/${created.id}`,{expected_version:first.data.record.version,title:title+' actualizado'},'PATCH');check('Task update API',edit.status===200);
 const stale=await api(`${TASKS}/${created.id}`,{expected_version:first.data.record.version,title:'Borrador obsoleto'},'PATCH');check('Task stale write returns 409',stale.status===409);
 if(fixture.project?.id){const associated=await api(`${TASKS}?project_id=${fixture.project.id}&assignee=all&bucket=completed`);check('Project and dashboard share task id',associated.status===200&&associated.data.records.some(record=>String(record.id)===String(created.id)));}
 else report.limitations.push(`No project fixture at ${width}px; project drawer task synchronization needs manual check.`);
 return created;
}
async function contractFlow(width){
 await page.setViewport({width,height:844,isMobile:width<768,hasTouch:width<768,deviceScaleFactor:1});
 await page.goto(new URL(process.env.QA_CONTRACTS_PATH||'/contratos',base).href,{waitUntil:'networkidle2'});
 await page.waitForSelector('[data-testid="contracts-workspace"]');
 await geometry(`contracts-${width}`,'[data-testid="contracts-workspace"]');
 await button('Nueva plantilla','[data-testid="contracts-workspace"]');await page.waitForSelector('[role="dialog"]');
 const name=`${stamp} plantilla ${width}`;
 const body='{{company.name}} acuerda {{agreement.type}}.\n\n'+Array.from({length:65},(_,index)=>`Cláusula QA ${index+1}. Este texto de prueba verifica que el contrato conserva párrafos completos y produce varias páginas legibles. No contiene datos personales ni constituye asesoramiento legal.`).join('\n\n');
 await input('Nombre',name);await input('Tipo de acuerdo','Servicios de prueba');await input('Texto de plantilla',body);await input('Variables obligatorias (una por línea)','company.name\nagreement.type');
 await geometry(`contract-template-form-${width}`,'[role="dialog"]');
 const saved=page.waitForResponse(response=>response.url().endsWith(`${CONTRACTS}/templates`)&&response.request().method()==='POST');await button('Guardar','[role="dialog"]');check(`Template saved ${width}`,(await saved).status()===201);
 await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
 await button('Nuevo contrato','[data-testid="contracts-workspace"]');await input('Título',`${stamp} contrato ${width}`);await select('Plantilla de contrato',name);
 await geometry(`contract-create-form-${width}`,'[role="dialog"]');
 const created=page.waitForResponse(response=>response.url().endsWith(CONTRACTS)&&response.request().method()==='POST');await button('Crear borrador','[role="dialog"]');const response=await created;check(`Contract draft created ${width}`,response.status()===201);const record=(await response.json()).contract;
 await page.waitForSelector('[data-testid="contract-detail"]');
 check('Missing fields visibly identified',await page.$eval('[data-testid="contract-detail"]',node=>node.textContent.includes('Campos faltantes:')&&node.textContent.includes('agreement.type')));
 check('Unreviewed contract cannot issue',await page.$eval('[data-testid="contract-detail"]',node=>[...node.querySelectorAll('button')].find(button=>button.textContent==='Emitir versión revisada')?.disabled===true));
 await button('Editar datos y texto','[data-testid="contract-detail"]');await input('agreement.type','Prestación de servicios QA');await input('company.name','Empresa local de prueba');
 await button('Aplicar edición a la previsualización','[role="dialog"]');
 await page.waitForFunction(()=>document.querySelector('[data-testid="contract-preview"]')?.textContent.includes('Empresa local de prueba acuerda Prestación de servicios QA'));
 const persisted=page.waitForResponse(response=>response.url().endsWith(`${CONTRACTS}/${record.id}`)&&response.request().method()==='PATCH');await button('Guardar borrador','[data-testid="contract-detail"]');check(`Contract edited ${width}`,(await persisted).status()===200);
 await button('Procedencia de los datos','[data-testid="contract-detail"]');
 check('Manual data provenance visible',await page.$eval('[data-testid="contract-detail"]',node=>node.textContent.includes('manual')));
 const reviewed=await page.$('.contracts-review input[type="checkbox"]');assert(reviewed,'Human review checkbox');await reviewed.click();
 const issued=page.waitForResponse(response=>response.url().endsWith(`${CONTRACTS}/${record.id}/versions`)&&response.request().method()==='POST');await button('Emitir versión revisada','[data-testid="contract-detail"]');const issueResponse=await issued;check(`Human reviewed version issued ${width}`,issueResponse.status()===201);const issuedRecord=await issueResponse.json();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-testid="contract-detail"] button')].some(node=>node.textContent==='Exportar PDF versión 1'));
 await geometry(`contract-detail-issued-${width}`,'[role="dialog"]');
 const pdfPath=`/core-api${CONTRACTS}/${record.id}/versions/1/pdf`;
 const downloaded=page.waitForResponse(response=>response.url().endsWith(pdfPath));await button('Exportar PDF versión 1','[data-testid="contract-detail"]');const pdf=await downloaded;check(`PDF UI download response ${width}`,pdf.status()===200&&pdf.headers()['content-type']?.includes('application/pdf'));
 // Chromium/CDP can decode PDF bytes as text. Read the same local authenticated
 // endpoint through Node to validate bytes; cookies stay only in memory.
 const cookies=await page.browserContext().cookies(base.href);const cookie=cookies.map(item=>`${item.name}=${item.value}`).join('; ');
 const fileResponse=await fetch(new URL(pdfPath,base),{headers:{Cookie:cookie},redirect:'error'});check(`PDF binary response ${width}`,fileResponse.status===200&&fileResponse.headers.get('content-type')?.includes('application/pdf'));
 const buffer=Buffer.from(await fileResponse.arrayBuffer());check('PDF file signature',buffer.subarray(0,5).toString()==='%PDF-');const pdfFile=resolve(out,`contract-${width}.pdf`);await writeFile(pdfFile,buffer);
 try{const info=execFileSync('pdfinfo',[pdfFile],{encoding:'utf8'});const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);check(`PDF multipage ${width}`,pages>=2,{pages});const text=execFileSync('pdftotext',[pdfFile,'-'],{encoding:'utf8'});check(`PDF contains issued text ${width}`,text.includes('Empresa local de prueba')&&text.includes('Cláusula QA 65'));}catch(error){if(error.code==='ENOENT')report.limitations.push('pdfinfo/pdftotext unavailable; PDF signature checked, pagination/text inspection pending.');else throw error;}
 const previous=await api(`${CONTRACTS}/${record.id}/versions`);
 const edited=await api(`${CONTRACTS}/${record.id}`,{expected_revision:issuedRecord.contract.revision,title:`${stamp} modified draft ${width}`},'PATCH');check('Draft remains editable after issue',edited.status===200);
 const after=await api(`${CONTRACTS}/${record.id}/versions`);check('Issued version remains unchanged',JSON.stringify(previous.data.versions)===JSON.stringify(after.data.versions));
 const stale=await api(`${CONTRACTS}/${record.id}`,{expected_revision:issuedRecord.contract.revision,title:'Stale draft'},'PATCH');check('Contract stale write returns 409',stale.status===409);
 await page.keyboard.press('Escape');
}
async function taskErrorAndEmptyFlow(){
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.goto(new URL('/resumen',base).href,{waitUntil:'networkidle2'});await waitTasks();
 failNextTaskList=true;await button('Próximas','.employee-tasks-tabs',false);
 await page.waitForSelector('.employee-tasks [role="alert"]');
 check('Task network failure shown',await page.$eval('.employee-tasks [role="alert"]',node=>node.textContent.includes('No se pudieron cargar las tareas.')));await shot('tasks-network-error-390');
 const retry=await page.$('.employee-tasks [role="alert"] button');assert(retry,'Retry action on task network failure');await retry.click();await waitTasks();
 check('Task retry recovers real API',!(await page.$('.employee-tasks [role="alert"]')));
 await button('Todas','.employee-tasks-tabs',false);await waitTasks();await page.$eval('.employee-tasks details',node=>{node.open=true;});
 await input('Desde','2099-01-01','.employee-tasks');await input('Hasta','2099-01-01','.employee-tasks');await waitTasks();
 await page.waitForFunction(()=>document.querySelector('.employee-tasks')?.textContent.includes('No hay tareas en esta vista.'));
 check('Filtered task empty state visible',await page.$eval('.employee-tasks',node=>node.textContent.includes('No hay tareas en esta vista.')));await geometry('tasks-empty-390','.employee-tasks');
}
async function companyProfileSmoke(){
 const path='/api/agency/company-legal-profile';const before=await api(path);check('Company legal profile available',before.status===200);
 const fields=['city','department','legal_representative_name','legal_representative_document','legal_representative_role'];const values=Object.fromEntries(fields.map(key=>[key,before.data.profile[key]||'']));
 const saved=await api(path,{expected_revision:before.data.profile.revision,...values},'PATCH');check('Company legal profile saves with revision',saved.status===200&&saved.data.profile.revision===before.data.profile.revision+1);
 const after=await api(path);check('Company profile values preserved',after.status===200&&fields.every(key=>after.data.profile[key]===values[key]));
}
try{
 page=await newPage();
 await step('Tasks API readiness',async()=>{const response=await api(`${TASKS}/context`);check('Task context available',response.status===200);check('QA admin can edit tasks',response.data.can_edit);});
 for(const width of [390,1440])await step(`Tasks UI ${width}`,()=>taskFlow(width));
 await step('Task network failure, retry and empty view',taskErrorAndEmptyFlow);
 for(const width of [390,1440])await step(`Contracts UI ${width}`,()=>contractFlow(width));
 await step('Company legal profile save smoke',companyProfileSmoke);
 for(const role of ['employee','viewer']){
  if(!fixture[role]){report.limitations.push(`Missing local ${role} identity: permission browser checks not run.`);continue;}
  await step(`Permissions ${role}`,async()=>{
   page=await newPage(fixture[role]);
   const response=await api(`${TASKS}/context`);check(`${role} task context`,response.status===200);
   const created=await api(TASKS,{title:`${stamp} ${role} personal`,expected_version:0},'POST');
   check(`${role} task create matches capability`,created.status===(response.data.can_edit?201:403));
   if(response.data.can_edit){
    const completed=await api(`${TASKS}/${created.data.record.id}`,{expected_version:created.data.record.version,status:'done'},'PATCH');
    check(`${role} can complete own task`,completed.status===200&&completed.data.record.status==='done');
   }
   const team=await api(`${TASKS}?assignee=all&bucket=all`);check(`${role} cannot list team tasks`,team.status===403);
   if(adminTasks.length){const other=await api(`${TASKS}/${adminTasks[0]}`);check(`${role} cannot read unassigned administrator task`,other.status===404);}
   const contracts=await api(CONTRACTS);check(`${role} cannot read contracts`,contracts.status===403);
   await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.reload({waitUntil:'networkidle2'});await shot(`role-${role}-390`);
  });
 }
}catch(error){
 report.checks.push({name:'Runner setup',passed:false,error:error.message});process.exitCode=1;console.error(`FAIL runner setup: ${error.message}`);
}finally{
 report.finished_at=new Date().toISOString();report.complete=report.limitations.length===0;report.passed=report.checks.length>0&&report.checks.every(check=>check.passed)&&!process.exitCode;
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(`Evidence: ${out}/report.json`);
}
