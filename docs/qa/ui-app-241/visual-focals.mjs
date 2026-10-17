// Integrated real-app geometry checks. Company stress text is DOM-only and explicitly labelled.
import assert from 'node:assert/strict';
import{createRequire}from'node:module';
import{readFile,writeFile,mkdir}from'node:fs/promises';
const require=createRequire(new URL('../../../backend/package.json',import.meta.url));
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3013';assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const out=process.env.QA_OUT||'/tmp/scale241-app-final-recheck';await mkdir(out,{recursive:true});
const browser=await require('puppeteer-core').launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.createBrowserContext();await context.setCookie({name:'scale_session',value:(await readFile(process.env.QA_SESSION_FILE||'/workspace/.qa-tools/ui-final241/demoA-session','utf8')).trim(),url:base,httpOnly:true});
const page=await context.newPage();page.setDefaultTimeout(30000);
const report={compiledSource:process.env.QA_COMPILED_SOURCE||'unknown',checks:[],pageErrors:[],blockedExternal:[],startedAt:new Date().toISOString()};
page.on('pageerror',e=>report.pageErrors.push(e.message));await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(['data:','blob:','about:'].includes(u.protocol)||['127.0.0.1','localhost'].includes(u.hostname))r.continue();else{report.blockedExternal.push(u.host);r.abort();}});
function check(name,passed,details){report.checks.push({name,passed:Boolean(passed),details});}
try{
 for(const width of[1440,1366,390])for(const theme of['light','dark','contrast'])for(const route of['/pagos/balance','/pagos/mora','/clientes','/proyectos','/inventario']){
  await page.setViewport({width,height:width===390?844:1000});await page.goto(base+route,{waitUntil:'networkidle2'});
  await page.evaluate(async theme=>{localStorage.setItem('scale-theme',theme);if(theme==='light')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=theme;await document.fonts.ready;},theme);
  const intro=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&/Explorar.*demo/i.test(n.textContent)));if(intro.asElement())await intro.asElement().click();await intro.dispose();
  const prefix=`${width} ${theme} ${route}`;
  check(prefix+' document contained',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(route==='/pagos/balance'){
   const data=await page.evaluate(()=>({tables:[...document.querySelectorAll('.finance-balance-columns [role=table]')].map(n=>({label:n.getAttribute('aria-label'),y:n.getBoundingClientRect().y})),logos:[...document.querySelectorAll('.finance-detail-section .foto-perfil-logo img')].map(n=>{const a=n.parentElement,b=n.getBoundingClientRect(),p=a.getBoundingClientRect();return{complete:n.complete,naturalWidth:n.naturalWidth,padding:getComputedStyle(n).padding,radius:getComputedStyle(a).borderRadius,overflow:getComputedStyle(a).overflow,width:b.width,height:b.height,parentWidth:p.width,parentHeight:p.height};})}));
   check(prefix+' two comparison tables',data.tables.length===2,data.tables);
   if(width>=1024)check(prefix+' table headers share y',data.tables.length===2&&Math.abs(data.tables[0].y-data.tables[1].y)<=1,data.tables);
   check(prefix+' loaded logos circular and unpadded',data.logos.length>0&&data.logos.every(n=>n.complete&&n.naturalWidth>0&&n.padding==='0px'&&n.radius==='50%'&&n.overflow==='hidden'&&n.width<=n.parentWidth+1&&n.height<=n.parentHeight+1),data.logos);
  }
  if(route==='/clientes'){
   const kpi=await page.$eval('.client-billing-kpi',n=>({text:n.innerText,width:n.clientWidth,scroll:n.scrollWidth,parts:[...n.children].map(c=>({text:c.textContent,width:c.clientWidth,scroll:c.scrollWidth}))}));
   check(prefix+' contracted KPI USD exists and fits',/USD|US\$/.test(kpi.text)&&kpi.scroll<=kpi.width+1&&kpi.parts.every(n=>n.scroll<=n.width+1),kpi);
  }
  if(route==='/proyectos'){
   const actions=await page.$$eval('.project-card-actions',nodes=>nodes.map(n=>({width:n.clientWidth,scroll:n.scrollWidth,buttons:[...n.querySelectorAll('button')].map(b=>({label:b.innerText||b.getAttribute('aria-label'),width:b.clientWidth,scroll:b.scrollWidth,shrink:getComputedStyle(b).flexShrink}))})));
   check(prefix+' project actions present',actions.length>0,{count:actions.length});
   check(prefix+' project actions retain label width',actions.every(a=>a.buttons.every(b=>b.width>0&&b.scroll<=b.width+1&&b.shrink==='0')),actions);
  }
  if(route==='/inventario'){
   const buttons=await page.$$eval('button[aria-label^="Editar equipo:"]',nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>({text:n.innerText,width:n.clientWidth,scroll:n.scrollWidth,shrink:getComputedStyle(n).flexShrink,svgWidth:n.querySelector('svg')?.getBoundingClientRect().width})));
   check(prefix+' inventory edit text fits',buttons.length>0&&buttons.every(n=>n.text.includes('Editar')&&n.width>=55&&n.scroll<=n.width+1&&n.shrink==='0'&&n.svgWidth>0),buttons);
  }
  const name=await page.$('.topbar-company .company-name');if(name){const stress=await name.evaluate(n=>{const previous=n.textContent;n.textContent='Empresa sintética de nombre extraordinariamente largo para comprobar contención del selector';const root=n.closest('.topbar-company'),button=n.closest('.workspace'),r=button.getBoundingClientRect(),parent=root.getBoundingClientRect();const result={method:'DOM-only synthetic text, restored immediately; no profile/tenant write',buttonWidth:r.width,parentWidth:parent.width,contained:r.right<=parent.right+1,documentOverflow:document.documentElement.scrollWidth-innerWidth};n.textContent=previous;return result;});check(prefix+' company long-name DOM stress stays contained',stress.contained&&stress.documentOverflow===0,stress);}
  await page.screenshot({path:out+'/'+width+'-'+theme+'-'+route.slice(1).replaceAll('/','-')+'.png'});
  await writeFile(out+'/visual-focals.json',JSON.stringify(report,null,2)+'\n');
 }
}catch(e){report.error=e.stack;}finally{report.finishedAt=new Date().toISOString();report.passed=!report.error&&report.checks.every(n=>n.passed)&&!report.pageErrors.length;await writeFile(out+'/visual-focals.json',JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(n=>!n.passed).map(n=>n.name),error:report.error}));}
