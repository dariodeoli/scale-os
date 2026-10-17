/** Local CSS cascade acceptance for #241. No account, API, or production writes. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
require('tsx/cjs');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {Button,IconButton}=require('../app/ui/button.tsx');
const action=props=>renderToStaticMarkup(React.createElement(Button,props,'Guardar'));
const canonical=action({id:'canonical',variant:'primary',color:'brand',size:'medium'});
const compact=action({id:'compact',variant:'ghost',color:'brand',size:'compact'});
const danger=action({id:'filled-danger',variant:'danger',color:'danger',size:'medium'});
const picker=renderToStaticMarkup(React.createElement(IconButton,{type:'button',size:'compact',variant:'ghost',label:'Abrir calendario',icon:React.createElement('span',null,'▦')}));
const output=resolve(process.env.QA_OUT||'/tmp/scale241-tokens-browser');await mkdir(output,{recursive:true});
const root=resolve(new URL('..',import.meta.url).pathname);
const sheets=['fonts.css','ui-tokens.css','globals.css','qa-fixes.css','mobile-forms.css','ui-system.css','contrast.css'];
let css=await readFile(require.resolve('owncoding-ui/styles.css'),'utf8');
for(const sheet of sheets)css+='\n'+(await readFile(resolve(root,'app',sheet),'utf8')).replace(/@import[^;]+;/g,'');
css+='\n'+await readFile(process.env.QA_TAILWIND_CSS||'/tmp/scale241-tailwind.css','utf8');
const fixture=`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="control-shell" style="min-height:100vh;padding:16px"><section class="panel"><h1>Tokens de Scale</h1><button id="legacy" class="primary">Guardar</button>${canonical}${compact}<button id="danger" class="record-remove">Borrar</button>${danger}<span class="ui-temporal" data-ui-temporal="date"><input id="date" type="date" value="2026-10-17">${picker}</span><div class="search-field"><span class="search-field-box"><input id="search" placeholder="Buscar"></span></div><div class="person-sheet"><div data-sheet-tab hidden class="grid">Oculto</div></div></section></main></body></html>`;
// Public font assets are the only requests served; no fixture contacts an API.
const server=createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
 if(req.url?.startsWith('/fonts/')&&!req.url.includes('..')){try{res.end(await readFile(resolve(root,'public',req.url.slice(1))));return;}catch{}}
 res.statusCode=404;res.end();
});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,XDG_CONFIG_HOME:resolve(output,'config'),XDG_CACHE_HOME:resolve(output,'cache')}});
const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',request=>{if(new URL(request.url()).hostname==='127.0.0.1')void request.continue();else void request.abort();});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);const checks=[];
try{
 for(const width of [1440,390])for(const theme of ['light','dark','contrast']){
  await page.setViewport({width,height:900});await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);await page.evaluate(()=>document.fonts.ready);
  const ratios=await page.evaluate(()=>{
   const colors=['brand','neutral','success','warning','danger'],variants=['primary','secondary','outline','ghost','danger'];
   const channels=color=>color.match(/[\d.]+/g).slice(0,3).map(Number);
   const luminance=color=>channels(color).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
   const result=[];
   for(const color of colors)for(const variant of variants){const b=document.createElement('button');b.dataset.uiButton='';b.dataset.uiColor=color;b.dataset.uiVariant=variant;b.textContent='Acción';document.querySelector('.panel').append(b);let background=getComputedStyle(b).backgroundColor,ancestor=b.parentElement;while(background==='rgba(0, 0, 0, 0)'&&ancestor){background=getComputedStyle(ancestor).backgroundColor;ancestor=ancestor.parentElement;}
    const fg=luminance(getComputedStyle(b).color),bg=luminance(background);result.push({color,variant,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)});b.remove();}
   return result;
  });
  for(const pair of ratios)assert(pair.ratio>=4.5,`${theme} ${pair.color}/${pair.variant}: ${pair.ratio}:1`);
  const state=await page.evaluate(()=>{
   const get=id=>getComputedStyle(document.getElementById(id));const canonical=get('canonical'),legacy=get('legacy');
   const input=get('date'),group=getComputedStyle(document.querySelector('.ui-temporal')),picker=getComputedStyle(document.querySelector('.ui-temporal button'));
   return {shell:getComputedStyle(document.querySelector('.control-shell')).backgroundImage,body:getComputedStyle(document.body).color,canonical:{color:canonical.color,background:canonical.backgroundColor,height:canonical.minHeight,ink:canonical.getPropertyValue('--ui-button-ink'),onBrand:canonical.getPropertyValue('--on-brand'),channels:canonical.getPropertyValue('--c-onbrand')},legacy:{color:legacy.color,background:legacy.backgroundColor},compact:get('compact').minHeight,dateBorder:input.borderWidth,groupBorder:group.borderWidth,pickerWidth:picker.width,hidden:getComputedStyle(document.querySelector('[data-sheet-tab]')).display,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(state.canonical.color,state.legacy.color,JSON.stringify({width,theme,state}));assert.equal(state.canonical.background,state.legacy.background);
  assert.equal(state.canonical.height,width===390?'44px':'40px');assert.equal(state.compact,width===390?'44px':'32px');
  assert.equal(state.dateBorder,'0px','temporal input has no second border');assert.equal(state.groupBorder,'1px');assert.equal(state.pickerWidth,width===390?'44px':'32px');
  assert.equal(state.hidden,'none');assert.equal(state.overflow,false);
  if(theme==='contrast')assert.equal(state.shell,'linear-gradient(rgb(0, 0, 0) 0%, rgb(0, 0, 0) 360px)');
  await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({id:document.activeElement.id,outline:getComputedStyle(document.activeElement).outlineStyle,color:getComputedStyle(document.activeElement).outlineColor}));
  assert.equal(focus.id,'legacy');assert.equal(focus.outline,'solid');
  await page.keyboard.press('Tab');const canonicalFocus=await page.evaluate(()=>({id:document.activeElement.id,outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}));assert.equal(canonicalFocus.id,'canonical');assert.equal(canonicalFocus.outline,'solid');assert.equal(canonicalFocus.width,'3px');
  checks.push({width,theme,state,focus,canonicalFocus,ratios});await page.screenshot({path:resolve(output,`${theme}-${width}.png`),fullPage:true});
 }
 await writeFile(resolve(output,'report.json'),JSON.stringify({checks,scope:'Actual local CSS cascade + installed dependency stylesheet + generated Tailwind; synthetic markup, not an authenticated page audit.'},null,2));
 console.log(`PASS ${checks.length} CSS browser scenarios: 3 themes × 2 viewports, aliases, focus, density, temporal border, hidden tabs and overflow.`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
