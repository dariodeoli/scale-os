import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';

// Source-level CSS contracts, not a browser layout or visual verification.
const read=(file:string)=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
const sheets=Object.fromEntries(['workspace-density.css','desktop-sidebar.css','mobile-navigation.css','production-focus.css','work-checklist.css'].map(file=>[file,postcss.parse(read(file))]));

// Inspect a particular selector's declarations in source order at a viewport.
// This deliberately does not emulate the full CSS cascade or font metrics.
function declaration(file:string,selector:string,property:string,width:number){
 let value:string|undefined;
 sheets[file].walkRules(rule=>{
  if(!rule.selectors.includes(selector))return;
  for(let parent=rule.parent;parent;parent=parent.parent){
   if(parent.type!=='atrule')continue;
   if(parent.name!=='media')throw Error('Unsupported conditional rule');
   const conditions=Array.from(parent.params.matchAll(/\((min|max)-width:\s*(\d+)px\)/g));
   if(!conditions.length)return;
   if(conditions.some(([,kind,size])=>kind==='min'?width<Number(size):width>Number(size)))return;
  }
  rule.walkDecls(property,d=>{value=d.value;});
 });
 return value;
}

const workspace=read('scale-workspace.tsx'),operations=read('operations.tsx');
assert(workspace.includes('<h3>{project.name}</h3>'),'project name is rendered as a card heading');
assert(operations.includes('<b>{c.author_email || "Integrante"}</b>'),'project comments render the author email');

for(const width of [320,360,390,768]){
 const at=(file:string,selector:string,property:string)=>declaration(file,selector,property,width);
 assert.equal(at('workspace-density.css','.control-shell .project-card h3','overflow-wrap'),'anywhere',`project identifiers must wrap at ${width}px`);
 // Comments live in a portal outside .control-shell: do not scope to the shell.
 assert.equal(at('workspace-density.css','.ops-comment>b','overflow-wrap'),'anywhere',`comment author emails must wrap at ${width}px`);
 assert.equal(at('production-focus.css','.control-shell .production-focus .kanban','overflow-x'),'auto');
 assert.equal(at('production-focus.css','.control-shell .production-focus .kanban','height'),'auto');
 assert.equal(at('production-focus.css','.control-shell .production-focus .column','max-height'),'none');
 assert.equal(at('production-focus.css','.control-shell .production-focus .column','overflow'),'visible');
 assert.equal(at('work-checklist.css','.work-checklist-check span','overflow-wrap'),'anywhere');
 assert.equal(at('work-checklist.css','.work-checklist input:not([type=checkbox])','min-width'),'0');
 if(width<=760){
  assert.equal(at('desktop-sidebar.css','.control-shell .desktop-sidebar','display'),'none');
  assert.equal(at('mobile-navigation.css','.control-shell .mobile-menu-trigger','display'),'grid');
  assert.equal(at('production-focus.css','.production-toolbar .production-filters','display'),'contents');
  assert.equal(at('production-focus.css','.production-toolbar .production-filters .ops-select','min-width'),'0');
  assert.equal(at('work-checklist.css','.work-checklist-item','flex-wrap'),'wrap');
  assert.equal(at('work-checklist.css','.work-checklist-add-row','flex-wrap'),'wrap');
 }else{
  assert.equal(at('desktop-sidebar.css','.control-shell .desktop-sidebar','width'),'192px');
  assert.equal(at('desktop-sidebar.css','.control-shell .desktop-sidebar.is-collapsed','width'),'60px');
  assert.equal(at('mobile-navigation.css','.control-shell .mobile-menu-trigger','display'),'none');
 }
}
console.log('PASS: source CSS contracts at 320/360/390/768px; project text wrapping, responsive sidebar/checklist and intentional board scrolling. Not visual QA.');
