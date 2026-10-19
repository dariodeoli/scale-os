#!/usr/bin/env node
// Real Next /superadmin route; all API reads/writes isolated to synthetic fixtures.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';
import {adminResponses} from './fixtures/admin-mobile-155.mjs';
const require=createRequire(new URL('../../backend/package.json',import.meta.url));
const {default:fixtures}=await import('data:text/javascript;base64,'+Buffer.from((await build({entryPoints:['build-tools/visual-harness/fixtures/admin-mobile-292.ts'],bundle:true,write:false,format:'esm'})).outputFiles[0].text+'\nexport default {traffic,usage,inquiries,errors,reports,items};').toString('base64'));
const sourceSha=(await import('node:child_process')).execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.env.BASE_URL||process.env.QA_BASE_URL||'http://127.0.0.1:4123';
assert.match(base,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const output=process.env.QA_OUTPUT||'docs/qa/superadmin-292';mkdirSync(output,{recursive:true});
const photo='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="purple"/></svg>').toString('base64');
 fixtures.usage.users[0].avatar_url=photo;fixtures.usage.agencies[0].logo_url=photo;fixtures.usage.agencies[0].owner.avatar_url=photo;
const agency={id:27,name:'Agencia sintética de comunicación y producción audiovisual',slug:'qa',active:true,active_users:3,subscription_status:'active',subscription_currency:'USD',subscription_amount:'99',trial_ends_at:null,due_at:'2026-11-01',owner_name:'Responsable sintético con nombre largo',owner_email:'owner.long@example.test',logo_url:photo,owner_photo_url:photo};
const coupon={id:1,code:'SINTETICO2026',discount_type:'percent',discount_value:'10',currency:'USD',active:true,max_redemptions:100,redemptions:3,organization_id:null,note:'Campaña de prueba',expires_at:'2027-01-01'};
const list=(key,rows,counts)=>({[key]:rows,total:rows.length,hasMore:false,limit:50,offset:0,...counts});
const responses={...adminResponses,
 '/api/auth/me':{user:{id:1,platform_role:'admin'}},
 '/api/platform/agencies':list('agencies',[agency]),
 '/api/platform/users':list('users',[{id:2,email:'persona.sintetica.con.correo.largo@example.test',full_name:'Persona sintética con nombre largo',photo_url:photo,active_agencies:2,platform_admin:false,agency_names:[agency.name,'Otra agencia sintética']}]),
 '/api/platform/coupons':list('coupons',[coupon]),
 '/api/platform/overview':{agencies:{total:1,active:1},users:{total:2},coupons:{total:1,active:1},subscriptions:[{status:'active',total:1}]},
 '/api/platform/metrics':{range:fixtures.usage.range,days:[],kpis:Object.fromEntries(['agencies','users','active_users','sessions','inquiries','redemptions'].map(key=>[key,{value:5,previous:3,series:[1,2,2],has_data:true}]))},
 '/api/platform/usage':fixtures.usage,'/api/platform/traffic':fixtures.traffic,
 '/api/platform/inquiries':list('inquiries',fixtures.inquiries,{counts:{new:1,contacted:1,closed:0}}),
 '/api/platform/errors':list('errors',fixtures.errors,{counts:{new:1,resolved:1,ignored:0},last24h:{groups:1,new_groups:1}}),
 '/api/platform/errors/7':{error:{...fixtures.errors[0],sample_stack:'TypeError: synthetic\n at synthetic.test:1',sample_meta:{version:'test'}}},
 '/api/platform/reports':list('reports',fixtures.reports,{counts:{new:1,in_progress:1,resolved:0}}),
 '/api/platform/announcements':{announcements:fixtures.items},
 '/api/platform/maintenance':{maintenance:{enabled:false,message:'Mantenimiento sintético',until:null,updated_at:null,updated_by_email:null}},
 '/api/platform/agencies/27/subscription':{subscription:{internal_state:'active',internal_reason:'Sintético',internal_expires_at:null}},
};
const browser=await require('puppeteer-core').launch({executablePath:process.env.SCALE_QA_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const widths=process.env.QA_WIDTHS?process.env.QA_WIDTHS.split(',').map(Number):[320,390,768,1024,1440];assert(widths.every(w=>[320,390,768,1024,1440].includes(w)));
const results=[],requests=new Set(),failures=[];
try{
 const page=await browser.newPage();let role='admin';const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setRequestInterception(true);page.on('request',async request=>{const url=new URL(request.url());
  if(url.pathname.startsWith('/core-api/')){const path=url.pathname.replace('/core-api','');requests.add(request.method()+' '+path);const payload=path==='/api/auth/me'?{user:{id:1,platform_role:role}}:responses[path];await request.respond({status:payload?200:404,contentType:'application/json',body:JSON.stringify(payload||{error:'Unmocked request '+path})});return;}
  if(url.origin===base||url.protocol==='data:')await request.continue();else await request.abort();
 });
 async function inspect(label){if(process.env.QA_VERBOSE)console.log(label);await new Promise(r=>setTimeout(r,80));const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,wide:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.right>innerWidth+2&&s.position!=='absolute'&&!el.closest('.platform-sidebar-nav,.list-wrap,[role="table"],.platform-admin-table-wrap');}).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width})),images:document.images.length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src),viewport:{width:innerWidth,height:innerHeight},menus:[...document.querySelectorAll('[role="menu"]')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),dialogs:[...document.querySelectorAll('[role="dialog"]')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})}));results.push({label,...result});if(result.overflow||result.brokenImages.length||[...result.dialogs,...result.menus].some(r=>r.left< -1||r.right>result.viewport.width+1||r.top< -1||r.bottom>result.viewport.height+1))failures.push({label,...result});}
 const markers={'Resumen':'Suscripciones por estado','Consultas':'Ana Benítez','Agencias':agency.name,'Accesos':'persona.sintetica.con.correo.largo@example.test','Cupones':'SINTETICO2026','Auditoría':'administrator-with-long-name@example.com','Uso':'Agencia Norte','Errores':'TypeError:','Reportes':'Al guardar el presupuesto','Tráfico y demos':'google.com','Comunicados':'Nueva vista de producción','Mantenimiento':'Mantenimiento sintético'};
 async function waitSection(section){await page.waitForFunction(marker=>document.body.textContent.includes(marker)||[...document.querySelectorAll('input,textarea')].some(el=>el.value.includes(marker)),{timeout:15000},markers[section]);}
 const sections=['Resumen','Consultas','Agencias','Accesos','Cupones','Auditoría','Uso','Errores','Reportes','Tráfico y demos','Comunicados','Mantenimiento'];
 for(const width of widths){
  console.log('Auditing superadmin width '+width);
  await page.setViewport({width,height:900,hasTouch:width<1024,isMobile:width<768});
  await page.goto(base+'/superadmin',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('.platform-sidebar-nav button');
  for(const theme of ['light','dark','contrast']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   for(const section of sections){await page.$eval(`.platform-sidebar-nav button[title="${section}"]`,el=>el.click());await waitSection(section);await inspect(`${width}/${theme}/${section}`);}
   if(width===390||width===1440)await page.screenshot({path:`${output}/admin-${width}-${theme}.png`,fullPage:true});
  }
 }
 // Viewer has all sections but never receives mutating forms. This checks UI gates only.
 role='viewer';await page.setViewport({width:390,height:844});await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.platform-sidebar-nav button');
 await page.$eval('.platform-sidebar-nav button[title="Cupones"]',el=>el.click());assert.equal(await page.$('.platform-admin-coupon'),null);
 await inspect('390/viewer/coupons');
 role='admin';await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.platform-sidebar-nav button');
 // Mobile dialogs and edge-aware menus are measured on the real route.
 for(const width of widths){
  await page.setViewport({width,height:width===768?390:844,hasTouch:width<1024,isMobile:width<768});await page.waitForSelector('.platform-sidebar-nav button');
  await page.$eval('.platform-sidebar-nav button[title="Agencias"]',el=>el.click());
  await waitSection('Agencias');
  const manage=await page.$('button[title="Activar, suspender o extender el acceso manual"]');
  await manage.click();await page.waitForSelector('[role="dialog"]');await new Promise(r=>setTimeout(r,200));
  await inspect(`${width}/admin/subscription-dialog`);if(width===390)await page.screenshot({path:`${output}/subscription-390.png`,fullPage:true});
  await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')),'Dialog captures keyboard focus');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
  const menu=await page.$('[aria-haspopup="menu"]');if(width===390){await menu.tap();await page.waitForSelector('[role="menu"]');await inspect('390/touch/agency-menu');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="menu"]'));}await menu.focus();await page.keyboard.press('ArrowDown');await page.waitForSelector('[role="menu"]');
  await inspect(`${width}/admin/agency-menu`);
  assert(await page.evaluate(()=>document.activeElement?.getAttribute('role')==='menuitem'),'Keyboard enters action menu');
  const options=await page.$$('[role="menuitem"]');await options[0].click();await page.waitForSelector('[role="dialog"]');
  await page.waitForSelector('[role="dialog"] input[placeholder="Ej.: gracia acordada con el cliente"]');
  await inspect(`${width}/admin/apply-coupon-dialog`);if(width===390)await page.screenshot({path:`${output}/apply-coupon-390.png`,fullPage:true});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));

 }
 await page.setViewport({width:390,height:844,hasTouch:true,isMobile:true});await page.waitForSelector('.platform-sidebar-nav button');
 // Focus and keyboard navigation use actual DOM, no simulated event handlers.
 await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement!==document.body));
 await page.$eval('.platform-sidebar-nav button[title="Cupones"]',el=>el.click());await page.waitForSelector('.platform-admin-coupon');
 await page.focus('.platform-admin-coupon input');await page.keyboard.type('SINTETICO');assert.equal(await page.$eval('.platform-admin-coupon input',el=>el.value),'SINTETICO');
 await inspect('390/admin/coupon-form');
 // Low landscape viewport exercises scroll/reachability and touch navigation.
 await page.setViewport({width:844,height:390,hasTouch:true,isMobile:true});await page.waitForSelector('.platform-sidebar-nav button');
 for(const section of ['Agencias','Accesos','Comunicados','Mantenimiento']){await page.$eval(`.platform-sidebar-nav button[title="${section}"]`,el=>el.scrollIntoView({block:'nearest',inline:'nearest'}));await page.tap(`.platform-sidebar-nav button[title="${section}"]`);await waitSection(section);await inspect(`844x390/touch/${section}`);}
 writeFileSync(`${output}/results.json`,JSON.stringify({base,widths,sourceSha,artifactSha:process.env.QA_ARTIFACT_SHA||null,buildId:process.env.QA_BUILD_ID||null,engine:'Chromium '+await browser.version(),results,requests:[...requests].sort(),errors,failures},null,2)+'\n');
 console.log(JSON.stringify({cases:results.length,failures,errors},null,2));assert.equal(errors.length,0);assert.equal(failures.length,0);
}catch(error){writeFileSync(`${output}/failure.json`,JSON.stringify({error:String(error),results,requests:[...requests],failures},null,2));throw error;}finally{await browser.close();}
