// Refs #295. Real React forms and CSS, isolated synthetic HTTP transport.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
const root=process.cwd(),require=createRequire(root+'/package.json');
const {build}=require('esbuild'),postcss=require('postcss'),tw=require('tailwindcss');
const puppeteer=createRequire(root+'/backend/package.json')('puppeteer-core');
const componentCss=new Set();
const bundle=await build({plugins:[{name:'css',setup(b){b.onLoad({filter:/\.css$/},args=>{componentCss.add(args.path);return{contents:'',loader:'js'}})}}],stdin:{contents:readFileSync(root+'/tests/fixtures/mobile-actions-295.tsx.txt','utf8'),resolveDir:root,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const styles=['node_modules/owncoding-ui/dist/styles.css','app/ui-tokens.css','app/globals.css','app/qa-fixes.css','app/mobile-forms.css','app/ui-system.css','app/ui/field.css','app/contrast.css','app/tailwind.css','app/contracts-workspace.css','app/employee-tasks.css'];
let css=[...new Set([...styles.map(p=>root+'/'+p),...componentCss])].map(p=>readFileSync(p,'utf8').replace(/@import[^;]+;/g,'')).join('\n');
css=(await postcss([tw({config:root+'/tailwind.config.mjs'})]).process(css,{from:root+'/app/tailwind.css'})).css;
const server=createServer((_req,res)=>{if(_req.url?.startsWith('/logo.svg')){res.setHeader('content-type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="#74318a"/></svg>');return;}res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></body></html>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||process.env.SCALE_QA_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],errors=[];
try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 const tap=async selector=>{await page.waitForSelector(selector,{visible:true});await page.$eval(selector,n=>n.scrollIntoView({block:'center'}));const point=await page.$eval(selector,n=>{const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:innerWidth,height:innerHeight}});assert.ok(point.x>=0&&point.x<=point.width&&point.y>=0&&point.y<=point.height,'touch target reachable after scroll');if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await page.tap(selector);else await page.click(selector);};
 const clickText=async text=>{const selector=await page.evaluate(text=>{const nodes=[...document.querySelectorAll('[role="dialog"]')].at(-1)||document;const n=[...nodes.querySelectorAll('button')].find(n=>n.textContent.trim()===text||n.getAttribute('aria-label')===text);if(!n)throw Error('Missing button: '+text);n.setAttribute('data-qa-target','1');return '[data-qa-target="1"]';},text);await tap(selector);await page.evaluate(()=>document.querySelector('[data-qa-target]')?.removeAttribute('data-qa-target'));};
 const type=async(selector,value)=>{await tap(selector);await page.type(selector,value);};
 const assertFit=async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'document must fit viewport');const controls=await page.$$eval('[role="dialog"] input:not([type="hidden"]),[role="dialog"] textarea,[role="dialog"] [role="combobox"],[role="dialog"] button[aria-haspopup="listbox"]',ns=>ns.filter(n=>n.getBoundingClientRect().width>0).map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:innerWidth})));assert.deepEqual(controls.filter(n=>n.left < -1||n.right>n.width+1),[],'form controls stay horizontally reachable');return controls.length;};
 const allFlows=['client','inventory','account','payment','team','tasks','contracts'],flows=process.env.QA_FLOWS?process.env.QA_FLOWS.split(','):allFlows;assert.ok(flows.length&&flows.every(flow=>allFlows.includes(flow)),'known nonempty QA flows');
 const sizes=process.env.QA_VIEWPORTS?JSON.parse(process.env.QA_VIEWPORTS):[[320,844],[390,844],[768,844],[390,568],[844,390]];assert.ok(sizes.length&&sizes.every(size=>Array.isArray(size)&&size.length===2&&size.every(n=>Number.isInteger(n)&&n>=300)),'valid viewports');
 for(const [width,height] of sizes)for(const flow of flows){
  console.log('Checking',flow,width+'x'+height);await page.setViewport({width,height,isMobile:width<900,hasTouch:width<900});
  await page.goto('http://127.0.0.1:'+server.address().port+'/?flow='+flow);await page.waitForFunction(()=>document.querySelector('form')||document.querySelector('.employee-tasks')||document.querySelector('.contracts-workspace'));
  let checks=0,controls=0;
  if(flow==='client'){
   await type('[data-field="name"] input','Cliente móvil QA');
   await tap('[data-field="legal_representative_same_as_client"] input');
   assert.equal(await page.$eval('[data-field="legal_representative_name"] input',n=>n.disabled),true);checks++;
   controls=await assertFit();await clickText('Crear cliente');await page.waitForFunction(()=>window.completed>0);
   assert.equal(await page.evaluate(()=>window.writes[0].body.legal_representative_name),'Cliente móvil QA');checks++;
  }else if(flow==='inventory'){
   assert.equal(await page.$eval('#inventory-item-value',n=>n.value),'');checks++;
   await clickText('Crear equipo');await page.waitForSelector('#inventory-item-name-error');assert.equal(await page.evaluate(()=>window.writes.length),0);checks++;
   await type('#inventory-item-name','Cámara móvil QA');await type('#inventory-item-value','250000');controls=await assertFit();
   await page.evaluate(()=>{window.failNext=true});await clickText('Crear equipo');await page.waitForFunction(()=>document.body.textContent.includes('Fallo temporal sintético'));
   assert.equal(await page.$eval('#inventory-item-name',n=>n.value),'Cámara móvil QA');checks++;
   await clickText('Crear equipo');await page.waitForFunction(()=>window.completed>0);assert.equal(await page.evaluate(()=>window.writes[1].body.value),'250000');checks++;
  }else if(flow==='account'){
   await type('[name="name"]','Caja móvil QA');controls=await assertFit();await clickText('Crear cuenta');await page.waitForFunction(()=>window.completed>0);assert.equal(await page.evaluate(()=>window.writes[0].body.name),'Caja móvil QA');checks++;
  }else if(flow==='payment'){
   await tap('[data-form-field="invoiceId"] button');await tap('[data-form-field="accountId"] button');await type('[name="amount"]','1000');controls=await assertFit();await clickText('Registrar cobro');await page.waitForFunction(()=>window.completed>0);assert.equal(await page.evaluate(()=>window.writes[0].body.amount),1000);assert.ok(await page.evaluate(()=>window.writes[0].body.requestId));checks+=2;
  }else if(flow==='team'){
   await type('[data-field="full_name"] input','Persona móvil QA');controls=await assertFit();await clickText('Crear persona');await page.waitForFunction(()=>window.completed>0);assert.equal(await page.evaluate(()=>window.writes[0].body.full_name),'Persona móvil QA');checks++;
  }else if(flow==='tasks'){
   await page.waitForSelector('[data-task-id="1"]');await clickText('Ver detalle');await page.waitForSelector('[role="dialog"] input[type="checkbox"]');controls=await assertFit();
   await tap('[role="dialog"] input[type="checkbox"]');await page.waitForFunction(()=>window.writes.length===1);assert.equal(await page.evaluate(()=>window.writes[0].body.checklist[0].completed),true);checks++;
   await type('[role="dialog"] textarea','Comentario móvil QA');await clickText('Agregar comentario');await page.waitForFunction(()=>window.writes.length===2);assert.equal(await page.evaluate(()=>window.writes[1].body.body),'Comentario móvil QA');checks++;
   await clickText('Marcar completada');await page.waitForFunction(()=>window.writes.length===3);assert.equal(await page.evaluate(()=>window.writes[2].body.status),'done');checks++;
  }else{
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Nuevo contrato'&&!n.disabled));await clickText('Nuevo contrato');await type('[data-field="title"] input','Contrato móvil QA');controls=await assertFit();
   if(process.env.QA_CONTRACT_REVIEW==='1'){
    await page.waitForSelector('iframe.contracts-print-page');assert.equal(await page.$eval('iframe.contracts-print-page',n=>n.getAttribute('sandbox')),'');checks++;
    const select=async(label,option)=>{console.log('Selecting',label,option);const trigger=await page.evaluate(label=>{const box=[...document.querySelectorAll('[data-ui-selector]')].find(n=>[...n.querySelectorAll('.ops-label')].some(x=>x.textContent===label));const button=box?.querySelector('button[aria-haspopup="listbox"]');if(!button)throw Error('Selector missing '+label);button.setAttribute('data-qa-select','1');return '[data-qa-select="1"]';},label);await tap(trigger);await page.waitForSelector('[role="option"]');const target=await page.evaluate(option=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.textContent.includes(option));if(!n)throw Error('Option missing '+option);n.setAttribute('data-qa-option','1');return '[data-qa-option="1"]';},option);await tap(target);await page.waitForFunction(()=>![...document.querySelectorAll('[role="option"]')].some(n=>n.getBoundingClientRect().height>0));await page.evaluate(()=>{document.querySelector('[data-qa-select]')?.removeAttribute('data-qa-select');document.querySelector('[data-qa-option]')?.removeAttribute('data-qa-option');});};
    await select('Cliente','Cliente QA');await select('Tipo de contraparte','Contrato con colaborador');await select('Colaborador','Colaborador QA');await select('Tipo de contraparte','Contrato con cliente');
    assert.match(await page.evaluate(()=>[...document.querySelectorAll('[data-ui-selector]')].find(n=>n.querySelector('.ops-label')?.textContent==='Cliente')?.textContent),/Cliente QA/);checks++;
    assert.equal(await page.$eval('[data-field="title"] input',n=>n.value),'Contrato móvil QA','counterparty changes preserve editor text');checks++;
    const frameHandle=await page.waitForFunction(()=>{const section=document.querySelector('.contracts-print-preview'),n=section?.querySelector('iframe');if(!n||section.getAttribute('aria-busy')!=='false')return false;const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth}});const frame=await frameHandle.jsonValue();assert.ok(frame.left>=-1&&frame.right<=frame.width+1,'printable surface fits viewport');checks++;if(process.env.QA_SCREENSHOT_DIR){mkdirSync(process.env.QA_SCREENSHOT_DIR,{recursive:true});await page.$eval('iframe.contracts-print-page',n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:process.env.QA_SCREENSHOT_DIR+'/preview-'+width+'.png'});}
   }
   await clickText('Crear borrador');await page.waitForSelector('[data-testid="contract-detail"]');assert.equal(await page.evaluate(()=>window.writes[0].body.template_id),'t1');checks++;if(process.env.QA_CONTRACT_REVIEW==='1'){assert.equal(await page.evaluate(()=>window.writes[0].body.client_id),'1');assert.equal(await page.evaluate(()=>window.writes[0].body.collaborator_id),undefined);checks++;}
   assert.equal(await page.$$eval('button',ns=>ns.find(n=>n.textContent.trim()==='Emitir versión revisada').disabled),true);checks++;if(process.env.QA_CONTRACT_REVIEW==='1'){await clickText('Cerrar');await page.waitForSelector('[role="dialog"]',{hidden:true});if(!await page.$eval('.contracts-template-management',n=>n.open))await tap('.contracts-template-management>summary');await clickText('Nueva plantilla');await page.waitForSelector('textarea[name="body"]');const measured=await page.$eval('textarea[name="body"]',n=>({height:n.getBoundingClientRect().height,min:getComputedStyle(n).minHeight,style:n.getAttribute('style'),form:n.closest('form')?.className,parent:n.closest('.contracts-workspace')?.className}));console.log('Template field',JSON.stringify(measured));const height=measured.height;assert.ok(height>=(width<561?300:360),'template text has a large editing surface');checks++;await assertFit();}
  }
  await assertFit();results.push({flow,width,height,checks,visibleFormControls:controls,status:'PASS'});
 }
 assert.deepEqual(errors,[],'no runtime errors');
 const output=process.env.OUT||'/tmp/scale-mobile-actions-295.json';writeFileSync(output,JSON.stringify({transport:'synthetic local; no API/DB/production',browser:await browser.version(),results,errors},null,2));
 console.log('PASS',results.length,'touch flow/viewports;',results.reduce((n,r)=>n+r.checks,0),'explicit behavioral assertions. Report:',output);
}finally{await browser.close();await new Promise(r=>server.close(r));}
