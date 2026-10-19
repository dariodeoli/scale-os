// Refs #297: actual local Next routes and local API/DB; browser writes blocked.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(new URL('../../../backend/package.json',import.meta.url));
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3027';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local server required');
assert(process.env.QA_COMPILED_SOURCE,'Set exact source SHA (dev baseline must say dev:<SHA>)');
const production=process.env.QA_MODE!=='baseline';
if(production)assert(process.env.QA_BUILD_ID,'Production evidence requires QA_BUILD_ID');
const widths=(process.env.QA_WIDTHS||'320,390,768,1024,1440').split(',').map(Number);
assert(widths.every(w=>[320,390,768,1024,1440].includes(w)),'Unknown viewport');
const themes=(process.env.QA_THEMES||'light,dark,contrast').split(',');
const allRoutes=['/pipeline/metricas','/presupuestos/planes','/equipo/invitaciones','/equipo/comisiones','/equipo/permisos','/equipo/historial','/equipo/actividad','/configuracion/preferencias','/configuracion/papelera'];
const routes=process.env.QA_ROUTES?process.env.QA_ROUTES.split(','):allRoutes;
assert(routes.every(r=>allRoutes.includes(r)),'Unknown route');
const out=resolve(process.env.QA_OUT||'/tmp/scale-mobile-secondary297');await mkdir(out+'/screens',{recursive:true});
const report={source:process.env.QA_COMPILED_SOURCE,buildId:process.env.QA_BUILD_ID||null,mode:production?'production':'dev-baseline',base,startedAt:new Date().toISOString(),widths,themes,routes,records:[],errors:[],httpErrors:[],external:[],blockedWrites:[],fixtureCounts:{},coverage:{expected:widths.length*themes.length*routes.length}};
const browser=await require('puppeteer-core').launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.createBrowserContext();
await context.setCookie({name:'scale_session',value:(await readFile(process.env.QA_SESSION_FILE||'/workspace/.qa-tools/mobile292/demoA-session','utf8')).trim(),url:base,httpOnly:true});
const demoToken=(await readFile(process.env.QA_SESSION_FILE||'/workspace/.qa-tools/mobile292/demoA-session','utf8')).trim();
const ownerToken=(await readFile(process.env.QA_OWNER_SESSION_FILE||'/workspace/.qa-tools/mobile292/ordinary-session','utf8')).trim();
const page=await context.newPage();page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push({route:new URL(page.url()).pathname,error:e.message}));
page.on('response',r=>{const url=new URL(r.url());if(r.request().method()==='GET'&&url.pathname.startsWith('/core-api/api/')&&r.status()>=400)report.httpErrors.push({path:url.pathname,status:r.status()});});
await page.setRequestInterception(true);page.on('request',r=>{
 const u=new URL(r.url());
 if(['data:','blob:','about:'].includes(u.protocol))return r.continue();
 if(!['127.0.0.1','localhost'].includes(u.hostname)){report.external.push({host:u.host,path:u.pathname});return r.abort();}
 if(!['GET','HEAD','OPTIONS'].includes(r.method())){report.blockedWrites.push({path:u.pathname,method:r.method()});return r.abort();}
 return r.continue();
});
const snapshot=()=>page.evaluate(()=>{
 const box=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};
 const visible=e=>e.checkVisibility()&&box(e).width>0&&box(e).height>0;
 const inViewport=e=>{const b=box(e);return b.right>0&&b.x<innerWidth&&b.bottom>0&&b.y<innerHeight;};
 const effective=e=>e.matches('input[type=checkbox],input[type=radio]')&&e.labels?.length?[...e.labels].reduce((a,b)=>box(a).width*box(a).height>box(b).width*box(b).height?a:b,e):e;
 const label=e=>(e.getAttribute('aria-label')||e.title||e.innerText||e.getAttribute('placeholder')||e.tagName).trim().slice(0,100);
 const main=document.querySelector('.control-shell[data-shell-data="ready"] .workspace-content');
 const controls=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=combobox]')].filter(visible).map(e=>({label:label(e),disabled:e.disabled,rect:box(effective(e))}));
 const images=[...document.images].filter(e=>visible(e)&&inViewport(e)).map(e=>({label:e.alt||'image',loaded:e.complete&&e.naturalWidth>0,source:e.currentSrc?.startsWith('data:')?'data':new URL(e.currentSrc||e.src,location.href).pathname,rect:box(e),naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,fit:getComputedStyle(e).objectFit}));
 const offenders=[...document.querySelectorAll('body *')].filter(visible).filter(e=>{const b=box(e);if(b.x>=-1&&b.right<=innerWidth+1)return false;for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(['auto','scroll'].includes(s.overflowX)&&p.scrollWidth>p.clientWidth)return false;if(['hidden','clip'].includes(s.overflowX)){const b=box(p);if(b.x>=-1&&b.right<=innerWidth+1)return false;}}return true;}).slice(0,15).map(e=>({label:label(e),tag:e.tagName,className:String(e.className).slice(0,100),rect:box(e)}));
 const dialogs=[...document.querySelectorAll('[role=dialog]')].filter(visible).map(e=>({label:label(e),rect:box(e),scrollable:e.scrollHeight>e.clientHeight}));
 const occluded=[...document.querySelectorAll('main button,main a[href],.workspace-content button')].filter(visible).filter(e=>{const b=box(e);if(b.x<0||b.y<0||b.right>innerWidth||b.bottom>innerHeight)return false;const top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return top&&!e.contains(top)&&!top.contains(e);}).map(e=>({label:label(e),rect:box(e)}));
 return{path:location.pathname,mainPresent:Boolean(main),text:main?.innerText.slice(0,500)||'',overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),controls,images,offenders,dialogs,occluded,scrollY,scrollHeight:document.documentElement.scrollHeight,innerHeight,pointerCoarse:matchMedia('(pointer:coarse)').matches,maxTouchPoints:navigator.maxTouchPoints};
});
async function flush(){report.finishedAt=new Date().toISOString();report.coverage.actual=report.records.length;report.passed=report.records.length===report.coverage.expected&&report.records.every(r=>r.passed)&&!report.errors.length&&!report.httpErrors.length;await writeFile(out+'/results.json',JSON.stringify(report,null,2)+'\n');}
try{
 const who=await page.goto(base+'/core-api/api/auth/me',{waitUntil:'domcontentloaded'});assert.equal(who.status(),200,'Fixture session must be valid before audit');
 if(production){const manifest=await page.evaluate(async id=>{const r=await fetch('/_next/static/'+encodeURIComponent(id)+'/_buildManifest.js',{cache:'no-store'});return{status:r.status,isBuildManifest:(await r.text()).includes('__BUILD_MANIFEST')};},process.env.QA_BUILD_ID);assert.equal(manifest.status,200,'Compiled build manifest must match QA_BUILD_ID');assert(manifest.isBuildManifest,'Expected actual Next build manifest');report.buildManifest=manifest;}
 const identity=JSON.parse(await page.$eval('body',e=>e.innerText));assert(identity.user?.id&&identity.user?.organization_id,'Isolated fixture identity required');report.identity={role:identity.user.role,isDemo:Boolean(identity.user.demo_owner_user_id)};
 for(const [endpoint,key] of [['clients','clients'],['collaborators','collaborators']]){
  const fixture=await page.evaluate(async endpoint=>{const r=await fetch('/core-api/api/agency/'+endpoint);return{status:r.status,data:await r.json()};},endpoint);
  assert.equal(fixture.status,200,`Fixture ${endpoint} must load`);assert(Array.isArray(fixture.data[key])&&fixture.data[key].length>0,`Missing populated ${endpoint} fixture`);report.fixtureCounts[endpoint]=fixture.data[key].length;
 }
 for(const width of widths)for(const theme of themes)for(const path of routes){
  const row={width,height:width===768?1024:width===1024?768:width===1440?1000:844,theme,path,device:width<=390?'phone':width<=1024?'tablet':'desktop',hasTouch:width<=1024,isMobile:width<=390,states:[],findings:[]};
  try{
   await context.setCookie({name:'scale_session',value:path==='/equipo/invitaciones'?ownerToken:demoToken,url:base,httpOnly:true});row.identity=path==='/equipo/invitaciones'?'synthetic-ordinary-owner':'synthetic-demo-owner';
   await page.setViewport({width,height:row.height,isMobile:row.isMobile,hasTouch:row.hasTouch});
   await page.evaluate(theme=>localStorage.setItem('scale-theme',theme),theme);
   const response=await page.goto(base+path,{waitUntil:'networkidle2',timeout:60000});assert(response&&response.status()<400,'Route response must be successful');
   await page.evaluate(async theme=>{if(theme==='light')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=theme;await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},theme);
   await page.waitForSelector('.control-shell[data-shell-data="ready"] .workspace-content',{timeout:45000});
   await page.waitForFunction(()=>![...document.querySelectorAll('.workspace-content [aria-busy="true"]')].some(e=>e.checkVisibility()),{timeout:45000});
   const intro=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(e=>e.checkVisibility()&&/Explorar.*demo/i.test(e.textContent)));if(intro.asElement())await intro.asElement().click();await intro.dispose();
   await page.waitForFunction(()=>{const root=document.querySelector('.control-shell[data-shell-data="ready"] .workspace-content');return Boolean(root)&&!root.querySelector('[aria-busy="true"]');},{timeout:45000});
   for(const progress of[0,.5,1]){
    await page.evaluate(p=>window.scrollTo(0,p*(document.documentElement.scrollHeight-innerHeight)),progress);await new Promise(r=>setTimeout(r,180));
    await page.waitForFunction(()=>[...document.images].filter(e=>{const b=e.getBoundingClientRect();return e.checkVisibility()&&b.bottom>0&&b.y<innerHeight&&b.right>0&&b.x<innerWidth;}).every(e=>e.complete),{timeout:5000}).catch(()=>{});
    const state={name:'scroll-'+progress,...await snapshot()};row.states.push(state);
    assert.equal(state.path,path,'Unexpected login/route redirect');assert.equal(state.pointerCoarse,width<=1024,'Pointer emulation must match device class');assert(state.mainPresent&&state.text.trim().length>15,'Content/fixture missing');
    if(state.overflow>1)row.findings.push({type:'document-overflow',state:state.name,pixels:state.overflow,offenders:state.offenders});
    const broken=state.images.filter(i=>!i.loaded);if(broken.length)row.findings.push({type:'broken-images',state:state.name,images:broken});
    // Scrolling content behind fixed chrome is normal; retain diagnostics, focus probe below determines persistent occlusion.
   }
   const small=row.states[0].controls.filter(c=>!c.disabled&&(c.rect.width<43.5||c.rect.height<43.5));row.touchTargetReview=width<=1024?small:[]; // Evidence for manual44px review; inline link exceptions/spacing need context, so not an automatic defect.
   await page.evaluate(()=>window.scrollTo(0,0));
   // A real Tab step must land on a visible control; sticky occlusion is assessed after keyboard focus.
   const focusable=await page.evaluateHandle(()=>[...(document.querySelector('.control-shell[data-shell-data="ready"] .workspace-content')).querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].find(e=>e.checkVisibility()&&!e.disabled&&e.tabIndex>=0));
   if(focusable.asElement()){
    await focusable.asElement().focus();await page.keyboard.press('Tab');
    row.keyboard=await page.evaluate(()=>{const e=document.activeElement,b=e.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{label:e.getAttribute('aria-label')||e.textContent?.slice(0,80),inViewport:b.width>0&&b.height>0&&b.x>=0&&b.right<=innerWidth&&b.y>=0&&b.bottom<=innerHeight,occluded:top&&!e.contains(top)&&!top.contains(e),body:e===document.body};});
    if(row.keyboard.body||!row.keyboard.inViewport||row.keyboard.occluded)row.findings.push({type:'keyboard-focus',details:row.keyboard});
   }else row.keyboard={notApplicable:'No visible enabled control'};
   await focusable.dispose();
   await page.evaluate(()=>window.scrollTo(0,0));
   if(process.env.QA_SCREENSHOTS!=='0'){row.screenshot=out+'/screens/'+width+'-'+theme+'-'+path.slice(1).replaceAll('/','-')+'.png';await page.screenshot({path:row.screenshot,fullPage:false});}
   row.contentState=await page.$eval('.workspace-content',e=>({visibleRows:e.querySelectorAll('.list-row,.activity-feed-row,tbody tr').length,emptyMessages:[...e.querySelectorAll('[class*=empty], [role=status]')].filter(n=>n.checkVisibility()).map(n=>n.textContent.trim().slice(0,180)).filter(Boolean)}));row.passed=row.findings.length===0;
  }catch(e){row.error=e.message;row.passed=false;}
  report.records.push(row);await flush();console.log(`${row.passed?'PASS':'FINDING'} ${width} ${theme} ${path} ${row.error||row.findings.map(f=>f.type).join(',')}`);
 }
}catch(e){report.errors.push({fatal:e.message});}finally{await browser.close();await flush();console.log(JSON.stringify({passed:report.passed,coverage:report.coverage,findings:report.records.filter(r=>!r.passed).length,out}));}
if(!report.passed)process.exitCode=1;
