import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';

// Source-level CSS contracts, not a browser layout or visual verification.
const read=(file:string)=>readFileSync(new URL('../app/'+file,import.meta.url),'utf8');
const sheets=Object.fromEntries(['actor-identity.css','workspace-density.css','desktop-sidebar.css','mobile-navigation.css','production-focus.css','work-checklist.css'].map(file=>[file,postcss.parse(read(file))]));

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
assert(workspace.includes("import {ProjectCard} from './project-card'"),'workspace imports the project card being tested');
assert(workspace.includes('<ProjectCard key={project.id} project={project}'),'directory passes each project into the shared card');
assert(/<h3 className="break-words[^"]*" title=\{project\.name\}>\{project\.name\}<\/h3>/.test(read('project-card.tsx')),'project name is rendered as a card heading with its full title (v2)');
assert(operations.includes('<ActorIdentity name={c.actor_name||c.author_email'),'project comments render the shared author identity with email fallback');

for(const width of [320,360,390,768]){
 const at=(file:string,selector:string,property:string)=>declaration(file,selector,property,width);
 assert.equal(at('workspace-density.css','.control-shell .project-card h3','overflow-wrap'),'anywhere',`project identifiers must wrap at ${width}px`);
 // Tarjeta de proyecto v2 (app/project-card.tsx): el nombre envuelve, la fila
 // comparte plantilla, las acciones no se envuelven y las celdas pueden encoger.
 const projectCard=read('project-card.tsx'),board=read('production-board.tsx'),section=read('sections/produccion.tsx');
 assert(projectCard.includes('break-words')&&projectCard.includes('title={project.name}'),'project headings wrap with their full title (v2)');
 assert(projectCard.includes('min-h-[200px]'),'project cards keep the 200px grid height (v2)');
 assert(projectCard.includes('[.project-list_&]:grid-cols-[var(--project-cols)]'),'project rows share the list template (v2)');
 assert(projectCard.includes('[.project-list_&]:overflow-x-auto')&&projectCard.includes('[.project-list_&]:flex-nowrap'),'project row actions never wrap: silent horizontal scroll (v2)');
 assert(projectCard.includes('min-w-0'),'project card cells allow shrinking (v2)');
 // Comments live in a portal outside .control-shell: do not scope to the shell.
 assert.equal(at('actor-identity.css','.actor-identity-name','overflow-wrap'),'anywhere',`comment author names must wrap at ${width}px`);
 assert.equal(at('actor-identity.css','.actor-identity','max-width'),'100%');
 assert(section.includes('flex snap-x gap-3 overflow-x-auto'),'board container scrolls horizontally on purpose (v2)');
 assert(board.includes('w-72 shrink-0'),'board columns keep their width (v2)');
 assert(!board.includes('max-h-')&&!board.includes('overflow-y-auto'),'board columns never scroll vertically on their own (v2)');
 assert.equal(at('work-checklist.css','.work-checklist-check span','overflow-wrap'),'anywhere');
 assert.equal(at('work-checklist.css','.work-checklist input:not([type=checkbox])','min-width'),'0');
 if(width<=760){
  assert.equal(at('desktop-sidebar.css','.control-shell .desktop-sidebar','display'),'none');
  assert.equal(at('mobile-navigation.css','.control-shell .mobile-menu-trigger','display'),'grid');
  assert.equal(at('production-focus.css','.control-shell .production-toolbar','flex-direction'),'column');
  assert.equal(at('production-focus.css','.control-shell .production-toolbar .production-filters','width'),'100%');
  assert.equal(at('production-focus.css','.control-shell .production-toolbar .production-filters .ops-select','min-width'),'0');
  assert.equal(at('work-checklist.css','.work-checklist-item','flex-wrap'),'wrap');
  assert.equal(at('work-checklist.css','.work-checklist-add-row','flex-wrap'),'wrap');
 }else{
  assert.equal(at('desktop-sidebar.css','.control-shell .desktop-sidebar','width'),'192px');
  assert.equal(at('desktop-sidebar.css','.control-shell .desktop-sidebar.is-collapsed','width'),'60px');
  assert.equal(at('mobile-navigation.css','.control-shell .mobile-menu-trigger','display'),'none');
 }
}
console.log('PASS: source CSS contracts at 320/360/390/768px; project text wrapping, responsive sidebar/checklist and intentional board scrolling. Not visual QA.');

// Reglas de contenedores: cápsulas alineadas con identidad, hechos por columnas,
// chips de altura estable y acciones ancladas al pie.
import {test as layoutTest} from 'node:test';
layoutTest('grid capsules share one aligned skeleton',()=>{
 const ui=readFileSync(new URL('../app/ui-system.css',import.meta.url),'utf8');
 assert(ui.includes('grid-auto-rows:1fr'),'grid rows keep one height per line');
 assert(ui.includes('.ops-grid:not(.ops-grid-list)>.person-hub-card'),'the shared capsule skeleton covers the team grid');
 assert(ui.includes('.inventory-equipment-grid:not(.inventory-equipment-list)>.inventory-equipment'),'the skeleton covers the inventory grid');
 assert(ui.includes('margin-top:auto'),'card actions anchor to the footer');
 assert(ui.includes('min-height:24px'),'chip rows keep a stable height');
});
