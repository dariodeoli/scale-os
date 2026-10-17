import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
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
