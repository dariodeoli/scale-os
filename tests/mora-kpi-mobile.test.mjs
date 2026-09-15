import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';

// Static, module-local CSS contracts for the shared KPI strips, stage chips and
// the reports chart. No browser, layout engine or visual measurement involved.
const css=(name)=>postcss.parse(readFileSync(new URL(`../app/${name}.css`,import.meta.url),'utf8'));
const control=css('control-center'),reports=css('reports-workspace');
function value(sheet,selector,property,width){
 let result;
 sheet.walkRules(rule=>{
  if(!rule.selectors.includes(selector))return;
  for(let parent=rule.parent;parent;parent=parent.parent){
   if(parent.type!=='atrule')continue;
   assert.equal(parent.name,'media','extend this test explicitly for new at-rules');
   const match=parent.params.match(/^\((min|max)-width:\s*(\d+)px\)$/);
   assert(match,`Unsupported media query: ${parent.params}`);
   if(match[1]==='max'?width>Number(match[2]):width<Number(match[2]))return;
  }
  rule.walkDecls(property,decl=>{result=decl.value;});
 });
 return result;
}
for(const width of [320,390,768,1100]){
 const get=(selector,property)=>value(control,selector,property,width);
 assert.equal(get('.kpi-strip','grid-template-columns'),width<=760?'repeat(2,minmax(0,1fr))':'repeat(4,minmax(0,1fr))',`${width}px must keep KPI cards readable`);
 assert.equal(get('.kpi-card','min-width'),'0','KPI cards must be able to shrink');
 assert.equal(get('.stage-chip','white-space'),'nowrap','stage chips keep their semantic unit on one line');
 assert.equal(get('.kpi-card .kpi-amounts span','white-space'),'nowrap','amounts never break across lines');
 console.log(`PASS ${width}px: KPI strips, stage chips and semantic units`);
}
assert.equal(value(reports,'.reports-chart','overflow-x'),'auto','chart scrolls inside its own surface');
assert.equal(value(reports,'.reports-chart figcaption','white-space'),'nowrap','month captions stay whole');
console.log('PASS: reports chart owns its horizontal scrolling; no browser cascade or touch testing implied');
