/** #241 local CSS acceptance: actual Button markup, retained classes and state. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
// Render frontend components with their own React; backend has independent peers.
const require=createRequire(new URL('../package.json',import.meta.url));
const browserRequire=createRequire(new URL('../backend/package.json',import.meta.url));require('tsx/cjs');
const React=require('react');Object.assign(globalThis,{React});
const {renderToStaticMarkup}=require('react-dom/server');const {Button,IconButton}=require('./app/ui/button.tsx');
const puppeteer=browserRequire('puppeteer-core');
const root=resolve(new URL('..',import.meta.url).pathname),output=resolve(process.env.QA_OUT||'/tmp/scale241-ui-action-styles');await mkdir(output,{recursive:true});
const profiles=[
 {name:'workspace',path:['control-shell','panel','header-actions'],className:'primary',props:{variant:'secondary',size:'compact',color:'success'}},
 {name:'finance',path:['control-shell','finance-balance','finance-balance-card','finance-detail-actions'],className:'icon-button record-remove',icon:true,props:{variant:'ghost',size:'compact',color:'success'}},
 {name:'finance-toolbar',path:['control-shell','finance-balance','finance-balance-toolbar'],className:'secondary min-h-11 md:min-h-10',props:{variant:'primary',size:'medium',color:'brand'}},
 {name:'dialog',path:['ops-dialog unified-dialog','dialog-footer','dialog-actions'],className:'primary',props:{variant:'outline',size:'medium',color:'warning'}},
 {name:'login',path:['login-page','login-card'],className:'primary login-button',props:{variant:'primary',size:'large',color:'brand'}},
 {name:'google',path:['login-page','login-card'],className:'google-login-button',props:{variant:'secondary',size:'large',color:'neutral'}},
 {name:'access',path:['access-page','auth-form-card registration-card','form-stack'],className:'text-button',props:{variant:'ghost',size:'compact',color:'neutral'}},
 {name:'portal',path:['client-portal','client-portal-card','delivery-actions'],className:'secondary',props:{variant:'danger',size:'medium',color:'danger'}},
 {name:'superadmin',path:['control-shell platform-admin-page','platform-admin-actions'],className:'text-button platform-admin-danger',props:{variant:'ghost',size:'medium',color:'brand'}},
 {name:'superadmin-secondary',path:['control-shell platform-admin-page','platform-admin-actions'],className:'secondary',props:{variant:'secondary',size:'medium',color:'brand'}},
 {name:'lookup',path:['control-shell','ops-form-grid','ops-lookup-row'],className:'text-button ops-lookup-button',props:{variant:'ghost',size:'compact',color:'brand'}},
 {name:'team',path:['control-shell','team-access','team-access-actions'],className:'secondary',props:{variant:'secondary',size:'medium',color:'brand'}},
 {name:'clear',path:['search-field','search-field-box'],className:'search-field-clear',icon:true,props:{variant:'ghost',size:'compact',color:'brand'}},
 {name:'utility',path:['control-shell','panel'],className:'primary min-h-11 md:min-h-10 rounded-xl px-6 py-3 text-sm hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-fono/60',props:{variant:'primary',size:'medium',color:'brand'}},
 {name:'select',path:['control-shell','ops-select'],className:'ops-select-trigger',props:{variant:'outline',size:'medium',color:'brand'}},
 {name:'settings',path:['control-shell','settings-card','settings-card-actions'],className:'secondary',props:{variant:'danger',size:'medium',color:'danger'}},
];
const icon=React.createElement('svg',{width:16,height:16,'aria-hidden':true},React.createElement('path',{d:'M2 2h12v12H2z',fill:'currentColor'}));
const action=(profile,id,state,className,canonical=true)=>canonical?renderToStaticMarkup(React.createElement(profile.icon?IconButton:Button,{...profile.props,id,type:'button',className,...(profile.icon?{icon,label:'Acción'}:{}),disabled:state==='disabled',loading:state==='loading'},profile.icon?undefined:'Acción')):`<button id="${id}" type="button" class="${className}" ${state!=='normal'?'disabled':''}>Acción</button>`;
const wrap=(profile,content)=>profile.path.reduceRight((child,className)=>`<div class="${className}">${child}</div>`,content);
const markup=profiles.map((profile,index)=>['normal','disabled','loading'].map(state=>`<section class="qa-pair" data-profile="${profile.name}" data-state="${state}">${action(profile,`gold-${index}-${state}`,state,'')}${wrap(profile,action(profile,`probe-${index}-${state}`,state,profile.className))}</section>`).join('')).join('');
const richMarkup='<div class="profile-footer">'+renderToStaticMarkup(React.createElement(Button,{id:'rich-user',className:'user',variant:'ghost',size:'medium'},React.createElement('div',null,React.createElement('b',null,'Nombre de ejemplo largo'))))+'</div>';
const nativeMarkup=profiles.map((profile,index)=>wrap(profile,action(profile,`native-${index}`,'normal',profile.className,false))).join('');
const allCss=async directory=>(await Promise.all((await readdir(directory,{withFileTypes:true})).map(entry=>entry.isDirectory()?allCss(resolve(directory,entry.name)):entry.name.endsWith('.css')?[resolve(directory,entry.name)]:[]))).flat();
const globalSheets=['fonts.css','ui-tokens.css','globals.css','qa-fixes.css','mobile-forms.css','ui-system.css','contrast.css'];
const modules=(await allCss(resolve(root,'app'))).filter(file=>!globalSheets.some(sheet=>file===resolve(root,'app',sheet))&&!file.endsWith('/tailwind.css')&&!file.endsWith('/reports-workspace.css')).sort();
const dependency=await readFile(require.resolve('owncoding-ui/styles.css'),'utf8');
const strip=source=>source.replace(/@import[^;]+;/g,'');
const current=dependency+'\n'+(await Promise.all(globalSheets.map(sheet=>readFile(resolve(root,'app',sheet),'utf8')))).map(strip).join('\n')+'\n'+await readFile(process.env.QA_TAILWIND_CSS||'/tmp/scale241-actions-tailwind.css','utf8')+'\n'+(await Promise.all(modules.map(file=>readFile(file,'utf8')))).map(strip).join('\n');
// A predecessor is optional. When supplied, compare ordinary native controls too.
let previous='';if(process.env.QA_BASELINE_SHA){const files=[...globalSheets.map(sheet=>resolve(root,'app',sheet)),resolve(root,'app/tailwind.css'),...modules];previous=dependency+'\n'+files.map(file=>strip(execFileSync('git',['show',`${process.env.QA_BASELINE_SHA}:${file.slice(root.length+1)}`],{cwd:root,encoding:'utf8'}))).join('\n');}
const html=(css,body)=>`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\n.qa-pair{display:grid;grid-template-columns:1fr;gap:8px;padding:8px}.qa-pair>button{justify-self:start}</style></head><body>${body}</body></html>`;
const server=createServer(async(req,res)=>{if(req.url==='/'||req.url==='/native'||req.url==='/before'){res.setHeader('Content-Type','text/html');res.end(html(req.url==='/before'?previous:current,req.url==='/'?markup+richMarkup:nativeMarkup));return;}if(req.url?.startsWith('/fonts/')&&!req.url.includes('..')){try{res.end(await readFile(resolve(root,'public',req.url.slice(1))));return;}catch{}}res.statusCode=404;res.end();});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||process.env.PUPPETEER_EXECUTABLE_PATH||process.env.SCALE_QA_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,XDG_CONFIG_HOME:resolve(output,'config'),XDG_CACHE_HOME:resolve(output,'cache')}});
const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',request=>{if(new URL(request.url()).hostname==='127.0.0.1')void request.continue();else void request.abort();});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
const properties=['color','background-color','border-top-width','border-top-style','border-top-color','border-radius','font-family','font-size','font-weight','line-height','padding-top','padding-right','padding-bottom','padding-left','min-height','box-shadow','opacity','cursor','white-space'];
const readStyles=async(id,extra=[])=>page.$eval(`#${id}`,(element,properties)=>{const style=getComputedStyle(element);return Object.fromEntries(properties.map(name=>[name,style.getPropertyValue(name)]));},[...properties,...extra]);
const failures=[],scenarios=[],intentionalChanges=[];let comparisons=0,nativeComparisons=0;
const settle=()=>page.evaluate(async()=>{await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));});
const compare=(expected,actual,metadata)=>{comparisons++;for(const key of Object.keys(expected))if(expected[key]!==actual[key])failures.push({...metadata,property:key,expected:expected[key],actual:actual[key]});};
try{
 for(const width of [390,760,761,767,768,1366])for(const theme of ['light','dark','contrast']){
  await page.setViewport({width,height:950});await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>document.fonts.ready);await settle();
  for(const [index,profile] of profiles.entries())for(const state of ['normal','disabled','loading'])compare(await readStyles(`gold-${index}-${state}`,profile.icon?['width','height']:[]),await readStyles(`probe-${index}-${state}`,profile.icon?['width','height']:[]),{width,theme,profile:profile.name,state});
  if([390,1366].includes(width))for(const [index,profile] of profiles.entries()){
   await page.hover(`#gold-${index}-normal`);const hover=await readStyles(`gold-${index}-normal`);await page.hover(`#probe-${index}-normal`);compare(hover,await readStyles(`probe-${index}-normal`),{width,theme,profile:profile.name,state:'hover'});
   await page.mouse.move(1,1);await page.keyboard.press('Tab');await page.$eval(`#gold-${index}-normal`,element=>element.focus());const focus=await readStyles(`gold-${index}-normal`,['outline-style','outline-width','outline-color']);await page.$eval(`#probe-${index}-normal`,element=>element.focus());compare(focus,await readStyles(`probe-${index}-normal`,['outline-style','outline-width','outline-color']),{width,theme,profile:profile.name,state:'focus'});
  }
  if([390,1366].includes(width)){await page.screenshot({path:resolve(output,`${theme}-${width}.png`),fullPage:true});}
  assert.equal(await page.$eval('#rich-user b',element=>getComputedStyle(element).whiteSpace),'nowrap','rich child truncation contract survives the canonical parent');
  scenarios.push({width,theme});
  if(previous&&[390,1366].includes(width)){
   const samples=[];for(const route of ['/before','/native']){await page.goto(`http://127.0.0.1:${server.address().port}${route}`);await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>document.fonts.ready);await settle();samples.push(await Promise.all(profiles.map((_,index)=>readStyles(`native-${index}`))));}
   for(const [index,profile] of profiles.entries()){nativeComparisons++;for(const key of properties)if(samples[0][index][key]!==samples[1][index][key]){if(profile.name==='clear'&&width<=760&&key==='min-height'&&samples[0][index][key]==='32px'&&samples[1][index][key]==='44px'){intentionalChanges.push({width,theme,profile:profile.name,property:key,before:'32px',after:'44px'});continue;}failures.push({width,theme,profile:profile.name,state:'native-preservation',property:key,expected:samples[0][index][key],actual:samples[1][index][key]});}}
  }
 }
 // Coarse pointers preserve compact touch targets across the desktop boundary.
 await page.setViewport({width:1366,height:950,isMobile:false,hasTouch:true});await page.goto(`http://127.0.0.1:${server.address().port}/`);for(const name of ['clear','finance']){const index=profiles.findIndex(profile=>profile.name===name);const target=await readStyles(`probe-${index}-normal`,['width']);if(target['min-height']!=='44px'||target.width!=='44px')failures.push({profile:name,state:'coarse',actual:target});}
 await writeFile(resolve(output,'report.json'),JSON.stringify({scenarios,comparisons,nativeComparisons,intentionalChanges,failures,scope:'Actual SSR Button/IconButton, real local styles and generated Tailwind, synthetic contextual markup. No authenticated page/API validation.'},null,2));
 console.log(JSON.stringify({scenarios:scenarios.length,comparisons,nativeComparisons,intentionalChanges:intentionalChanges.length,failures:failures.length,first:failures.slice(0,12)},null,2));
 if(process.env.QA_REPORT_ONLY!=='1')assert.equal(failures.length,0,'CSS ownership differences; see report.json');
}finally{await browser.close();await new Promise(done=>server.close(done));}
