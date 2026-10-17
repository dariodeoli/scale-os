import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import ts from 'typescript';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

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


test('Chromium: real inventory/project action fragments stay readable; rich and long content still fit', {skip:!existsSync(chrome)},async()=>{
 const read=(name:string)=>readFileSync(new URL(`../app/${name}`,import.meta.url),'utf8');
 const parse=(name:string)=>ts.createSourceFile(name,read(name),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const inventory=parse('inventory-workspace.tsx'),project=parse('project-card.tsx'),operations=parse('operations.tsx'),shell=parse('scale-workspace.tsx'),suite=parse('suite.tsx');
 function declaration(source:ts.SourceFile,name:string){const node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name||ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(source)===name));assert(node,`actual declaration ${name}`);return node.getText(source);}
 function element(source:ts.SourceFile,predicate:(node:ts.JsxElement)=>boolean){let found:ts.JsxElement|undefined;function walk(node:ts.Node){if(!found&&ts.isJsxElement(node)&&predicate(node))found=node;ts.forEachChild(node,walk);}walk(source);assert(found,'actual app action fragment exists');return found!.getText(source);}
 function attribute(node:ts.JsxElement,key:string){return node.openingElement.attributes.properties.find(prop=>ts.isJsxAttribute(prop)&&prop.name.getText()===key) as ts.JsxAttribute|undefined;}
 const inventoryFooter=element(inventory,node=>Boolean(attribute(node,'className')?.initializer?.getText().includes('mt-auto flex min-w-0 flex-wrap'))&&node.getText().includes('<InventoryItemActions'));
 const projectFooter=element(project,node=>Boolean(attribute(node,'className')?.initializer?.getText().includes('project-card-actions')));
 const comment=element(operations,node=>node.openingElement.tagName.getText()==='ScaleButton'&&node.children.some(child=>ts.isJsxText(child)&&child.text.includes('Comentarios')));
 const archive=element(shell,node=>node.openingElement.tagName.getText()==='ScaleButton'&&Boolean(attribute(node,'disabled')?.getText().includes('archiveBusy')));
 const edit=element(suite,node=>node.openingElement.tagName.getText()==='ScaleIconButton'&&attribute(node,'title')?.initializer?.getText()==='"Editar"');
 const company=element(operations,node=>node.openingElement.tagName.getText()==='button'&&attribute(node,'className')?.initializer?.getText()==='"workspace"');
 const companyWrapper=element(shell,node=>Boolean(attribute(node,'className')?.initializer?.getText().includes('topbar-company ')));
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';import {Pencil,MessageSquare,Building2,Plus} from 'lucide-react';
  import {MenuDesplegable} from 'owncoding-ui';import {Button,Button as ScaleButton,IconButton,IconButton as ScaleIconButton} from './app/ui/button';
  import {IconAction} from './app/ui/icon-action';import {FotoPerfil} from './app/foto-perfil';
  const noOp=()=>{},itemCode=()=>"EQ-001",inventoryLocation=()=>"Depósito",printInventoryLabel=noOp;
  ${['ICON_TARGETS','ROW_ICON_TARGETS','inventoryItemActionList','inventoryItemActions','menuItemsFrom','InventoryItemActions'].map(name=>declaration(inventory,name)).join('\n')}
  const VerificationStamp=({empty})=>empty;
  function InventoryFixture(){const item={id:'1',name:'Cámara ficticia',status:'available'},canManage=true,verifying=false,onDetail=noOp,onVerify=noOp,onVerifyDetail=noOp,onEdit=noOp,onArchive=noOp;return ${inventoryFooter};}
  function ProjectChildren(){const project={id:'1',name:'Campaña ficticia',active:true},archiveBusy='',setProjectArchive=noOp,setOpen=noOp,load=async()=>{},setError=noOp,message=String,name=project.name,openEdit=noOp;return <>${comment}${archive}${edit}</>;}
  function ProjectFixture(){${declaration(project,'ICON_TARGETS')}const project={name:'Campaña ficticia'},count=0,links=[],legacy='',driveLinksText=()=>'',setDetail=noOp,children=<ProjectChildren/>;return ${projectFooter};}
  ${declaration(operations,'CompanyMark')}
  const CompanySelector=({name,logo:companyLogo})=>{const setOpen=noOp;return ${company};};
  function CompanyFixture(){const companyLabel='Agencia con un nombre corporativo extenso para comprobar truncamiento',user={organization_logo_url:null};return ${companyWrapper};}
  createRoot(document.getElementById('root')).render(<main className="control-shell" style={{padding:16,maxWidth:'100%'}}>
   <h1 style={{fontSize:18}}>Acciones canónicas · datos ficticios</h1><section id="company" style={{display:'flex',width:240,maxWidth:'100%'}}><CompanyFixture/></section>
   <section className="probe-panels" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:16}}>
    <article id="inventory" style={{minWidth:0,maxWidth:220}}><h2>Inventario</h2><InventoryFixture/></article>
    <article id="project" style={{minWidth:0,maxWidth:220}}><h2>Proyectos</h2><ProjectFixture/></article>
   </section>
   <section id="compressed" style={{display:'flex',width:160,maxWidth:'100%',overflowX:'auto',gap:4}}><Button type="button" variant="ghost"><Pencil size={14}/>Editar</Button><IconButton type="button" label="Ver" icon={<Plus size={14}/>}/><IconButton type="button" label="Acciones" icon={<Plus size={14}/>}/></section>
   <section style={{width:340,maxWidth:'100%',display:'grid',gap:12}}>
    <Button id="long" type="button">{'NombreSinEspacios'.repeat(24)}</Button>
    <Button id="rich" type="button"><Plus size={16}/><div style={{minWidth:0,flex:1,textAlign:'left'}}><strong>Grupo de entidades</strong><p>{'DetalleSinEspacios'.repeat(24)}</p></div></Button>
    <div style={{display:'flex',width:160,maxWidth:'100%'}}><Button id="consumer-shrink" className="shrink" type="button">Composición flexible</Button><span style={{width:80,flex:'none'}}>Panel</span></div>
   </section>
  </main>);`},jsx:'automatic',bundle:true,write:false,format:'iife',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
 const temp=mkdtempSync(path.join(tmpdir(),'scale-button-readability-'));
 const config=path.join(temp,'tailwind.config.mjs'),compiled=path.join(temp,'tailwind.css');
 writeFileSync(config,`import base from ${JSON.stringify(fileURLToPath(new URL('../tailwind.config.mjs',import.meta.url)))};export default {...base,content:[...base.content,${JSON.stringify(fileURLToPath(import.meta.url))}]};`);
 execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-c',config,'-i','app/tailwind.css','-o',compiled,'--minify'],{cwd:process.cwd(),stdio:'pipe'});
 const css=['ui-tokens.css','globals.css','qa-fixes.css','mobile-forms.css','ui-system.css','ui/field.css','contrast.css','project-card.css','client-identity.css'].map(read).join('\n')+'\n'+readFileSync(compiled,'utf8');
 const browser=await backendRequire('puppeteer-core').launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
 const output:unknown[]=[],errors:string[]=[];const artifacts=process.env.SCALE_QA_ARTIFACT_DIR;if(artifacts)mkdirSync(artifacts,{recursive:true});
 try{
  const page=await browser.newPage();page.on('pageerror',(error:any)=>errors.push(error.message));await page.setRequestInterception(true);page.on('request',(request:any)=>request.abort());
  for(const width of [1440,390])for(const theme of ['light','dark','contrast']){
   await page.setViewport({width,height:1000});await page.setContent('<div id="root"></div>');await page.addScriptTag({content:'window.__name=(fn)=>fn;'});await page.addStyleTag({content:css});await page.evaluate((theme:string)=>{document.documentElement.dataset.theme=theme;},theme);await page.addScriptTag({content:bundle.outputFiles[0].text});await page.waitForSelector('#consumer-shrink');
   type Box={width:number;height:number;overflow:number};
   type ReadabilityMetrics={short:(Box&{text?:string;label:string|null;wordLines:number[];shrink:string})[];long:Box;rich:Box&{directChildren:string[]};company:Box&{nameOverflow:number;textOverflow:string};consumerShrink:string;pageOverflow:number};
   const measure=():Promise<ReadabilityMetrics>=>page.evaluate(()=>{
    const short=Array.from(document.querySelectorAll<HTMLButtonElement>('#inventory [data-ui-button],#project [data-ui-button],#compressed [data-ui-button]'));
    const words=(button:HTMLElement)=>{const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT),rows:number[]=[];let node:Node|null;while(node=walker.nextNode()){const text=node.textContent||'';for(const match of text.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,match.index!);range.setEnd(node,match.index!+match[0].length);rows.push(new Set(Array.from(range.getClientRects()).map(rect=>Math.round(rect.y))).size);}}return rows;};
    const box=(node:HTMLElement)=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,overflow:node.scrollWidth-node.clientWidth});
    const company=document.querySelector<HTMLElement>('#company .workspace')!,companyName=document.querySelector<HTMLElement>('#company .company-name')!;
    return {short:short.map(node=>({text:node.textContent?.trim(),label:node.getAttribute('aria-label'),...box(node),wordLines:words(node),shrink:getComputedStyle(node).flexShrink})),long:box(document.getElementById('long')!),rich:{...box(document.getElementById('rich')!),directChildren:Array.from(document.getElementById('rich')!.children).map(node=>node.tagName)},company:{...box(company),nameOverflow:companyName.scrollWidth-companyName.clientWidth,textOverflow:getComputedStyle(companyName).textOverflow},consumerShrink:getComputedStyle(document.getElementById('consumer-shrink')!).flexShrink,pageOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   const after=await measure();assert.equal(await page.$eval('#company .workspace',(node:any)=>node.title===node.querySelector('.company-name')?.textContent),true,'the full company name remains available in title and text');assert(after.short.length>=8);assert(after.short.some(button=>button.text==='Editar'));assert(after.short.some(button=>button.text==='Comentarios'));assert(after.short.some(button=>button.text==='Archivar'));
   for(const button of after.short){assert(button.wordLines.every(lines=>lines===1),`${theme}/${width}: ${button.text||button.label} splits a word`);assert(button.height<=(width===390?48:44),'short actions keep natural single-line height');assert(button.height>=(width===390?44:28));}
   assert.equal(after.long.overflow,0);assert(after.long.height>44);assert.equal(after.rich.overflow,0);assert.deepEqual(after.rich.directChildren,['svg','DIV']);assert.equal(after.consumerShrink,'1','a consumer can deliberately opt into flex shrink via its composition class');assert.equal(after.company.textOverflow,'ellipsis');assert(after.company.width<=240,'company trigger stays inside its existing header column');assert(after.company.nameOverflow>0,'the complete company name is visually truncated rather than expanding the header');assert(after.pageOverflow<=1);
   const beforeStyle=await page.addStyleTag({content:'[data-ui-button]{flex-shrink:1}.control-shell .topbar-company .workspace{max-width:none}#inventory [aria-label^="Editar equipo:"]{width:44px;height:44px}'});const before=await measure();assert(before.company.width>after.company.width,'fixture reproduces the pre-existing unbounded native company trigger');assert(before.short.some(button=>button.label?.startsWith('Editar equipo:')&&button.wordLines.some(lines=>lines>1)),'fixture reproduces the previous inventory square selector on its text action');assert(before.short.some(button=>button.text==='Editar'&&button.height>after.short.find(candidate=>candidate.text==='Editar')!.height),'fixture reproduces the original action compression without the fix');await beforeStyle.evaluate((node:any)=>node.remove());assert.deepEqual(await measure(),after,'the capture restores final source styles after the before comparison');
   output.push({width,theme,before,after});if(artifacts)await page.screenshot({path:path.join(artifacts,`button-readability-${theme}-${width}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);if(artifacts)writeFileSync(path.join(artifacts,'button-readability-metrics.json'),JSON.stringify(output,null,2)+'\n');
 }finally{await browser.close();rmSync(temp,{recursive:true,force:true});}
});
