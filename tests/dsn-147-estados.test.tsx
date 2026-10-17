import {actionElements} from './helpers/action-source';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import {build} from 'esbuild';

// Contrato de los estados engañosos de #147: la vista previa no se ofrece como
// CTA, la guía no afirma vacíos que no leyó (cubierto en
// workspace-guide-loading/data), Mis datos no deja derechos activos sin base,
// la bandeja vacía tiene una sola acción y el panel global no dice «Solo
// lectura» con el acceso denegado.
const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('#147: la vista previa del cliente declara que no realiza acciones y no luce CTA primario',()=>{
 const controls=file('app/daily-controls.tsx');
 assert.match(controls,/data-preview="inert"/,'la réplica se marca inerte');
 assert.match(controls,/Vista previa: no realiza acciones/,'la etiqueta exacta vive en el diálogo y en el badge');
 assert.match(controls,/review-preview-badge/,'el badge viaja dentro de la réplica');
 const inertActions=actionElements(controls).filter(action=>['Aprobar esta versión','Solicitar cambios'].includes(action.children));
 assert.equal(inertActions.length,2);
 for(const action of inertActions){
  assert.equal(action.kind,'Button');assert.equal(action.attribute('type'),'button');
  assert.equal(action.attribute('disabled'),true);assert.equal(action.attribute('aria-disabled'),'true');
  assert.equal(action.attribute('variant'),'secondary');assert.equal(action.attribute('color'),'neutral','the real canonical action explicitly chooses the neutral palette');
  assert.equal(action.attribute('onClick'),undefined,'preview actions have no mutation callback');
 }
 assert.match(controls,/<a className="secondary justify-self-start" href=\{assetUrl\}/,'el enlace de archivo baja de jerarquía');
 const manual=file('app/manual.tsx');
 assert.match(manual,/manual-portal-badge[^>]*>Vista previa: no realiza acciones/,'el manual repite la misma verdad para su réplica');
});

test('#147: Mis datos sin API marca los derechos como próximamente y deriva al canal real',()=>{
 const panel=file('app/my-data.tsx');
 assert.match(panel,/Derechos con registro en preparación/,'el puente declara el registro pendiente');
 assert.match(panel,/bridge\?<ul className="grid gap-2"[^>]*>[\s\S]{0,400}?Próximamente/,'los derechos no se ofrecen como botones activos');
 assert.doesNotMatch(panel,/bridge\?[\s\S]{0,200}?setRequestType/,'sin base no se abre el alta simulada');
 assert.match(panel,/estos pedidos se registran por el canal alternativo/,'el camino real queda visible');
});


const chrome=process.env.SCALE_QA_CHROME||'/usr/bin/chromium';
test('#147 Chromium: actual preview fragment renders disabled neutral actions in both themes', {skip:!existsSync(chrome)},async()=>{
 const source=file('app/daily-controls.tsx'),parsed=ts.createSourceFile('daily-controls.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const preview=parsed.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='ClientReviewPreview');assert(preview,'execute the actual app preview function');
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {Eye} from 'lucide-react';
  import {Button as ScaleButton} from './app/ui/button';import {InputBase as InputControl,TextareaBase} from './app/ui/input';
  const Dialog=({title,children})=><section role="dialog" aria-label={title}>{children}</section>;
  ${preview.getText(parsed)}
  createRoot(document.getElementById('root')).render(<><ClientReviewPreview title="Pieza de prueba"/>
   <ScaleButton id="brand-reference" variant="primary" disabled>Referencia de marca</ScaleButton>
   <span id="neutral-reference" style={{background:'var(--surface-sunken)',color:'var(--text-strong)'}}/>
  </>);`},jsx:'automatic',bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
 const css=['ui-tokens.css','globals.css','qa-fixes.css','mobile-forms.css','ui-system.css','ui/field.css','contrast.css','productivity.css'].map(name=>file('app/'+name)).join('\n');
 const browser=await createRequire(new URL('../backend/package.json',import.meta.url))('puppeteer-core').launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 const output:unknown[]=[];const artifacts=process.env.SCALE_QA_ARTIFACT_DIR;if(artifacts)mkdirSync(artifacts,{recursive:true});let requests=0;const browserErrors:string[]=[];
 try{
  const page=await browser.newPage();page.on('pageerror',(error:any)=>browserErrors.push(error.message));await page.setRequestInterception(true);page.on('request',(request:any)=>{requests++;request.abort();});
  for(const width of [1440,390])for(const theme of ['light','dark']){
   await page.setViewport({width,height:900});await page.setContent('<div id="root"></div>');await page.addScriptTag({content:'window.__name=(fn)=>fn;'});await page.addStyleTag({content:css});
   await page.evaluate((theme:string)=>{document.documentElement.dataset.theme=theme;},theme);await page.addScriptTag({content:bundle.outputFiles[0].text});await page.waitForSelector('#brand-reference');
   await page.click('button');await page.waitForSelector('[data-preview="inert"]',{timeout:3000});
   const measured=await page.evaluate(()=>{
    const neutral=getComputedStyle(document.getElementById('neutral-reference')!),brand=getComputedStyle(document.getElementById('brand-reference')!);
    const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-preview="inert"] .review-preview-actions button'));
    return {neutral:{background:neutral.backgroundColor,color:neutral.color},brand:brand.backgroundColor,buttons:buttons.map(button=>{const style=getComputedStyle(button);return {text:button.textContent?.trim(),disabled:button.disabled,ariaDisabled:button.getAttribute('aria-disabled'),variant:button.dataset.uiVariant,color:button.dataset.uiColor,background:style.backgroundColor,foreground:style.color,cursor:style.cursor,height:button.getBoundingClientRect().height};})};
   });
   assert.equal(measured.buttons.length,2);assert.notEqual(measured.neutral.background,measured.brand);
   for(const action of measured.buttons){assert.equal(action.disabled,true);assert.equal(action.ariaDisabled,'true');assert.equal(action.variant,'secondary');assert.equal(action.color,'neutral');assert.equal(action.background,measured.neutral.background);assert.equal(action.foreground,measured.neutral.color);assert.equal(action.cursor,'not-allowed');assert(action.height>=(width===390?44:40));}
   await page.evaluate(()=>{(window as any).previewClicks=0;document.querySelectorAll('[data-preview="inert"] button').forEach(button=>button.addEventListener('click',()=>{(window as any).previewClicks++;}));});
   for(const button of await page.$$('[data-preview="inert"] button'))await button.click();
   assert.equal(await page.evaluate(()=>(window as any).previewClicks),0,'disabled preview buttons do not dispatch click actions');
   output.push({width,theme,...measured});if(artifacts)await page.screenshot({path:path.join(artifacts,`inert-preview-${theme}-${width}.png`),fullPage:true});
  }
  if(artifacts)writeFileSync(path.join(artifacts,'inert-preview-metrics.json'),JSON.stringify(output,null,2)+'\n');
 }finally{await browser.close();}
 assert.deepEqual(browserErrors,[]);assert.equal(requests,0,'the isolated preview makes no network requests');
});
