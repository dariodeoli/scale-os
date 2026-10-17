import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const chrome=process.env.SCALE_QA_CHROME||'/usr/bin/chromium';
const backendRequire=createRequire(new URL('../backend/package.json',import.meta.url));

test('Chromium: native submit, keyboard, external form, ref and loading guard', {skip:!existsSync(chrome)},async()=>{
 const puppeteer=backendRequire('puppeteer-core');
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {Button,IconButton} from './app/ui/button';
  window.qa={submits:[],actions:0,refIsButton:false};
  createRoot(document.getElementById('root')).render(<>
   <form id="save" onSubmit={event=>{event.preventDefault();window.qa.submits.push(event.nativeEvent.submitter.name);}}>
    <input aria-label="Nombre" defaultValue="Demo"/>
    <Button id="implicit" name="implicit" ref={node=>{if(node)window.qa.refIsButton=node instanceof HTMLButtonElement;}}>Guardar</Button>
    <Button id="explicit" name="explicit" type="submit">Publicar</Button>
    <IconButton id="action" label="Abrir calendario" icon={<svg/>} type="button" onClick={()=>window.qa.actions++}/>
    <Button id="loading" loading name="busy">Guardando</Button>
   </form>
   <Button id="external" form="save" name="external">Guardar externo</Button>
  </>);`},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.setRequestInterception(true);page.on('request',(request:any)=>request.abort());
  await page.setContent('<main id="root"></main>');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForSelector('#external');
  assert.equal(await page.$eval('#implicit',(node:any)=>node.hasAttribute('type')),false);
  assert.equal(await page.$eval('#implicit',(node:any)=>node.type),'submit');
  await page.click('#implicit');await page.click('#explicit');await page.click('#external');
  await page.focus('[aria-label="Nombre"]');await page.keyboard.press('Enter');
  await page.focus('#action');await page.keyboard.press('Space');
  await page.click('#loading');
  const result=await page.evaluate(()=>({...(window as any).qa,loadingDisabled:(document.querySelector('#loading') as HTMLButtonElement).disabled,label:document.querySelector('#action')?.getAttribute('aria-label')}));
  assert.deepEqual(result.submits,['implicit','explicit','external','implicit']);
  assert.equal(result.actions,1);assert.equal(result.refIsButton,true);
  assert.equal(result.loadingDisabled,true);assert.equal(result.label,'Abrir calendario');
 }finally{await browser.close();}
});


test('Chromium: final local CSS keeps compact targets, 48px login CTA and visible keyboard focus in both themes', {skip:!existsSync(chrome)},async()=>{
 const login=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 assert.match(login,/<ScaleButton type="submit" className="primary login-button" variant="primary" size="large">/,'the actual login consumer explicitly chooses the large size');
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';import {Button,IconButton} from './app/ui/button';
  createRoot(document.getElementById('root')).render(<main>
   <section className="access-page"><div className="auth-form-card"><Button id="login" type="submit" className="primary login-button" variant="primary" size="large">Continuar</Button></div></section>
   <Button id="medium" variant="secondary">Guardar</Button>
   <IconButton id="compact" type="button" size="compact" label="Cerrar" icon={<svg width="16" height="16"/>}/>
   <Button id="busy" loading>Guardando</Button>
  </main>);`},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
 const css=['ui-tokens.css','globals.css','qa-fixes.css','mobile-forms.css','ui-system.css','ui/field.css','contrast.css'].map(file=>readFileSync(new URL(`../app/${file}`,import.meta.url),'utf8')).join('\n');
 const browser=await backendRequire('puppeteer-core').launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 const results:unknown[]=[];const artifacts=process.env.SCALE_QA_ARTIFACT_DIR;if(artifacts)mkdirSync(artifacts,{recursive:true});
 try{
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',(request:any)=>request.abort());
  for(const width of [1440,390])for(const theme of ['light','dark']){
   await page.setViewport({width,height:900});await page.setContent('<div id="root"></div>');await page.addScriptTag({content:'window.__name=(fn)=>fn;'});await page.addStyleTag({content:css});
   await page.evaluate((theme:string)=>{document.documentElement.dataset.theme=theme;},theme);
   await page.addScriptTag({content:bundle.outputFiles[0].text});await page.waitForSelector('#busy');
   await page.focus('#medium');await page.keyboard.press('Tab');
   const metrics=await page.evaluate(()=>{
    const measure=(id:string)=>{const node=document.getElementById(id)!;const box=node.getBoundingClientRect(),style=getComputedStyle(node);return {width:box.width,height:box.height,radius:style.borderRadius,outline:style.outlineStyle,outlineWidth:style.outlineWidth};};
    return {login:measure('login'),medium:measure('medium'),compact:measure('compact'),focused:document.activeElement?.id,loadingDisabled:(document.getElementById('busy') as HTMLButtonElement).disabled,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(metrics.login.height,48);assert.equal(metrics.login.radius,'10px');
   assert.equal(metrics.medium.height,width===390?44:40);assert.equal(metrics.compact.height,width===390?44:32);assert.equal(metrics.compact.width,width===390?44:32);
   assert.equal(metrics.focused,'compact');assert.equal(metrics.compact.outline,'solid');assert(parseFloat(metrics.compact.outlineWidth)>=2);assert.equal(metrics.loadingDisabled,true);assert.equal(metrics.overflow,false);
   results.push({width,theme,...metrics});if(artifacts)await page.screenshot({path:path.join(artifacts,`buttons-${theme}-${width}.png`),fullPage:true});
  }
  if(artifacts)writeFileSync(path.join(artifacts,'button-metrics.json'),JSON.stringify(results,null,2)+'\n');
 }finally{await browser.close();}
});
