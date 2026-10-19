// Real native fieldset, keyboard/focus and StrictMode evidence; synthetic loopback transport only.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import path from 'node:path';
const require=createRequire(import.meta.url),backendRequire=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=backendRequire('puppeteer-core'),repo=fileURLToPath(new URL('../',import.meta.url));
const cssBundle=await build({stdin:{contents:["owncoding-ui/styles.css",'./app/ui-tokens.css','./app/globals.css','./app/qa-fixes.css','./app/mobile-forms.css','./app/ui-system.css','./app/contrast.css','./app/tailwind.css','./app/cliente/portal.css'].map(file=>`@import '${file}';`).join('\n'),resolveDir:repo,loader:'css'},bundle:true,write:false,outdir:'/tmp/scale-access241-css',external:['/fonts/*','/images/*','/brand/*'],logLevel:'silent'});
const loadConfig=require('tailwindcss/loadConfig'),postcss=require('postcss'),tailwind=require('tailwindcss');
const config=loadConfig(path.join(repo,'tailwind.config.mjs'));
config.content=[{raw:(await Promise.all(['registro/page.tsx','invitacion/page.tsx','recuperar-cuenta/page.tsx','verificar-correo/page.tsx','access-layout.tsx','auth-brand-panel.tsx','workspace-footer.tsx','cliente/ingresar/page.tsx','cliente/invitacion/page.tsx','cliente/recuperar/page.tsx'].map(file=>readFile(path.join(repo,'app',file),'utf8')))).join('\n'),extension:'tsx'}];
const css=(await postcss([tailwind(config)]).process(cssBundle.outputFiles.find(file=>file.path.endsWith('.css')).text,{from:path.join(repo,'app/tailwind.css')})).css;
const bundle=await build({stdin:{contents:`
import React from'react';import{createRoot}from'react-dom/client';
import Login from'./app/cliente/ingresar/page';import PortalInvite from'./app/cliente/invitacion/page';import Recovery from'./app/cliente/recuperar/page';import Account from'./app/recuperar-cuenta/page';import Verify from'./app/verificar-correo/page';import Invite from'./app/invitacion/page';import Registration from'./app/registro/page';import PortalLayout from'./app/cliente/layout';
const root=createRoot(document.getElementById('root'));let key=0;const views={login:Login,portalInvite:PortalInvite,recovery:Recovery,account:Account,verify:Verify,teamInvite:Invite,registration:Registration};
window.calls=[];window.queue=[];
window.fetch=async(input,init={})=>{
 const url=String(input),body=init.body?JSON.parse(init.body):null;window.calls.push({url,body});
 if(url.endsWith('/auth/me')||url.endsWith('/invitations/status'))return new Response('{}',{status:401});
 if(url.includes('/client-portal/invites/preview?'))return new Response(JSON.stringify({organizationName:'Empresa QA',clientName:'Cliente QA'}));
 if(url.includes('/invitations/preview?'))return new Response(JSON.stringify({organization_name:'Empresa QA',role:'viewer',mode:'single'}));
 return new Promise(resolve=>window.queue.push({url,body,resolve:(status,data)=>resolve(new Response(JSON.stringify(data),{status}))}));
};
window.mount=(mode,search='')=>{window.calls=[];window.queue=[];window.history.replaceState({},'', '/'+mode+search);const Page=views[mode],view=<Page key={++key}/>;window.mountKey=key;root.render(<React.StrictMode><div data-qa-key={key}>{['login','portalInvite','recovery'].includes(mode)?<PortalLayout>{view}</PortalLayout>:view}</div></React.StrictMode>);};
`,resolveDir:repo,loader:'tsx'},bundle:true,write:false,jsx:'automatic',format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"development"'},logLevel:'silent'});
const server=createServer(async(req,res)=>{
 if(req.url==='/qa.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(css);return;}
 if(/^\/(fonts|images|brand)\//.test(req.url||'')){try{const file=path.join(repo,'public',req.url.split('?')[0]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}return;}
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><head><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
 await page.setRequestInterception(true);page.on('request',request=>{const url=new URL(request.url());url.hostname==='127.0.0.1'?request.continue():request.abort();});
 await page.setViewport({width:1366,height:768});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(()=>{window.process={env:{NODE_ENV:'development'},browser:true,nextTick:queueMicrotask};});await page.addScriptTag({content:bundle.outputFiles[0].text});
 const mount=async(mode,search='')=>{await page.evaluate((mode,search)=>window.mount(mode,search),mode,search);await page.waitForFunction(()=>document.querySelector('[data-qa-key]')?.getAttribute('data-qa-key')===String(window.mountKey));};
 const fill=async(selector,value)=>{await page.waitForSelector(selector);await page.click(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await page.type(selector,value,{delay:2});};
 const submitTwice=async()=>page.$eval('form',form=>{form.requestSubmit();form.requestSubmit();});
 const release=async(status,data)=>page.evaluate((status,data)=>window.queue.shift().resolve(status,data),status,data);
 const assertPending=async(mode)=>{
  await page.waitForFunction(()=>document.querySelector('fieldset.ui-form-fields')?.disabled===true);
  const states=await page.$$eval('fieldset.ui-form-fields input,fieldset.ui-form-fields button,fieldset.ui-form-fields select',nodes=>nodes.map(node=>node.matches(':disabled')));
  assert(states.length>0&&states.every(Boolean),mode+': todos los controles nativos pendientes bloqueados');
  assert.equal(await page.$eval('fieldset.ui-form-fields',node=>getComputedStyle(node).display),'contents');
  await page.$eval('form',form=>form.requestSubmit());assert.equal(await page.evaluate(()=>window.queue.length),1,mode+': un efecto por intento');
 };
 for(const [mode,search] of [['login',''],['recovery',''],['recovery','?resetToken=fixture-reset'],['account',''],['verify','']]){
  await mount(mode,search);await page.waitForSelector('form');
  await fill('form input[type=email]','qa@example.invalid');
  for(const input of await page.$$('form input[type=password]'))await input.type(search?'ClaveLocal2026!':'old');
  await submitTwice();await assertPending(mode);
  if(mode==='login')assert.equal(await page.$$('a[data-provider="google"]').then(nodes=>nodes.length),0);
  await release(503,{error:'Fallo controlado de acceso'});await page.waitForFunction(()=>!document.querySelector('fieldset.ui-form-fields')?.disabled);
  await page.waitForFunction(()=>document.activeElement?.textContent?.includes('Fallo controlado de acceso'));
  assert.equal(await page.$eval('form input[type=email]',node=>node.value),'qa@example.invalid');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 for(const mode of ['portalInvite','teamInvite']){
  const token='a'.repeat(mode==='portalInvite'?64:43);await mount(mode,'?token='+token);
  if(mode==='teamInvite'){await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Crear cuenta con correo'));await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Crear cuenta con correo').click());}
  await page.waitForSelector('form');await fill('form input[autocomplete=name]','Persona QA');
  if(mode==='teamInvite')await fill('form input[type=email]','qa@example.invalid');
  for(const input of await page.$$('form input[type=password]'))await input.type('ClaveLocal2026!');
  await submitTwice();assert.equal(await page.evaluate(()=>window.queue.length),0,'sin consentimiento no hay efecto');
  await page.click('input[type=checkbox]');await submitTwice();await assertPending(mode);
  assert.equal(await page.evaluate(()=>window.queue[0].body.fullName??window.queue[0].body.full_name),'Persona QA');
  if(mode==='teamInvite'){const before=page.url();await page.$eval('a[href*="/auth/google/start"]',link=>link.click());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(page.url(),before,'OAuth alternativo queda bloqueado durante la activación por contraseña');}
  await release(503,{error:'Fallo controlado de invitación'});await page.waitForFunction(()=>!document.querySelector('fieldset.ui-form-fields')?.disabled);
  await page.waitForFunction(()=>document.activeElement?.textContent?.includes('Fallo controlado de invitación'));
  assert.equal(await page.$eval('input[type=checkbox]',node=>node.checked),true);
 }
 await mount('verify','?token='+'a'.repeat(64));await page.waitForFunction(()=>window.queue.length===1);assert.equal(await page.evaluate(()=>window.calls.filter(call=>call.url.endsWith('/password/verify')).length),1,'StrictMode comparte una sola verificación de token');
 await release(400,{error:'Enlace no disponible'});await page.waitForSelector('form');
 for(const theme of ['light','dark'])for(const width of [320,390,768,1024,1440]){
  await page.setViewport({width,height:width===390?844:768});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);await mount('registration');
  await page.waitForSelector('form input[type=email]');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,theme+' '+width+' identidad sin overflow');await fill('input[type=email]','qa@example.invalid');await fill('input[name=password]','ClaveLocal2026!');
  await submitTwice();await assertPending('registration');await release(200,{requiresAgency:true});await page.waitForSelector('input[name=confirm_password]');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,theme+' '+width+' acceso sin overflow');
  await fill('input[name=confirm_password]','ClaveLocal2026!');await page.$eval('form',form=>form.requestSubmit());await page.waitForSelector('input[autocomplete=organization]');
  await fill('input[autocomplete=organization]','Agencia QA');for(const box of await page.$$('input[type=checkbox]'))await box.click();
  await page.evaluate(()=>{const action=Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Crear mi agencia');action.click();action.click();});
  await page.waitForFunction(()=>document.querySelector('fieldset.ui-form-fields')?.disabled===true);
  assert.equal(await page.evaluate(()=>window.queue.length),1,'registro conserva un lock común');
  assert((await page.$$eval('fieldset.ui-form-fields input,fieldset.ui-form-fields button',nodes=>nodes.map(node=>node.matches(':disabled')))).every(Boolean));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,theme+' '+width+' sin overflow');
  await release(503,{error:'Fallo controlado de agencia'});await page.waitForFunction(()=>!document.querySelector('fieldset.ui-form-fields')?.disabled);
  await page.waitForFunction(()=>document.activeElement?.textContent==='Fallo controlado de agencia');assert.equal(await page.$eval('input[autocomplete=organization]',node=>node.value),'Agencia QA');assert((await page.$$eval('input[type=checkbox]',nodes=>nodes.map(node=>node.checked))).every(Boolean));
 }
 assert.deepEqual(errors,[]);
 console.log('PASS Chromium real:7 rutas+reset, fieldset display:contents y bloqueo nativo completo, dobles submits, consentimientos/drafts/foco tras error, OAuth deshabilitado, StrictMode verify1POST, registro320/390/768/1024/1440 (3 pasos) claro/oscuro sin overflow.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
